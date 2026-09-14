import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import {
  createIdentification,
  createUnverifiedResult,
  verifyIdentification,
} from "@/lib/item-verification";

const MAX_FILE_SIZE = Math.floor(3.5 * 1024 * 1024);
const RAG_VERIFICATION_ENABLED = false;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function isQuotaError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
  };

  return (
    candidate.status === 429 ||
    candidate.code === 429 ||
    (typeof candidate.message === "string" &&
      (candidate.message.includes("429") ||
        candidate.message.toLowerCase().includes("quota")))
  );
}

type RequestedField = {
  key: string;
  label: string;
};

type AnalysisField = RequestedField & {
  value: string;
  status: "certain" | "ambiguous" | "unknown";
  candidates: string[];
};

type AnalysisResult = {
  name: string;
  description: string;
  fields: AnalysisField[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isRequestedField(value: unknown): value is RequestedField {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.label === "string"
  );
}

function isAnalysisField(value: unknown): value is AnalysisField {
  if (!isRecord(value)) return false;

  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    (value.status === "certain" ||
      value.status === "ambiguous" ||
      value.status === "unknown") &&
    Array.isArray(value.candidates) &&
    value.candidates.every((candidate) => typeof candidate === "string")
  );
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.fields) &&
    value.fields.every(isAnalysisField)
  );
}

const responseSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        "사진 근거로 식별 가능한 가장 구체적인 대상과 제품 유형. 정확한 제품명이 불확실하면 근거 있는 일반적 이름을 사용하고, 대상도 식별하지 못하면 빈 문자열.",
    },
    description: {
      type: "string",
      description:
        "색상, 형태, 문자, 로고, 부품, 받침대, 패키지 등 사진에서 직접 보이는 특징만 요약한 짧은 설명.",
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
          },
          label: {
            type: "string",
          },
          value: {
            type: "string",
            description:
              "해당 필드의 사진 근거로 지지되는 가장 적절한 값. ambiguous면 가장 유력한 후보를 쓸 수 있고, unknown이면 빈 문자열.",
          },
          status: {
            type: "string",
            enum: ["certain", "ambiguous", "unknown"],
            description:
              "모델의 주관적 자신감이 아니라 해당 필드 값을 사진에서 검증할 수 있는지로 판정. 강한 직접 시각 근거가 있을 때만 certain.",
          },
          candidates: {
            type: "array",
            items: {
              type: "string",
            },
            description:
              "ambiguous일 때만 사진과 실질적으로 부합하는 후보를 중복 없이 최대 3개. 개수를 채우기 위한 후보는 금지.",
          },
        },
        required: [
          "key",
          "label",
          "value",
          "status",
          "candidates",
        ],
      },
    },
  },
  required: ["name", "description", "fields"],
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const image = formData.get("image");
    const category = formData.get("category");
    const fieldsRaw = formData.get("fields");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "이미지가 필요합니다." },
        { status: 400 }
      );
    }

    if (
      typeof category !== "string" ||
      typeof fieldsRaw !== "string"
    ) {
      return NextResponse.json(
        { error: "카테고리 또는 필드 정보가 없습니다." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        {
          error:
            "JPEG, PNG, WebP 이미지만 사용할 수 있습니다.",
        },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "AI 분석용 이미지의 크기가 너무 큽니다. 다시 시도해주세요.",
        },
        { status: 400 }
      );
    }

    let parsedFields: unknown;

    try {
      parsedFields = JSON.parse(fieldsRaw);
    } catch {
      return NextResponse.json(
        { error: "필드 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(parsedFields) ||
      !parsedFields.every(isRequestedField)
    ) {
      return NextResponse.json(
        { error: "필드 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const requestedFields = parsedFields;

    const imageBuffer = Buffer.from(
      await image.arrayBuffer()
    );

    const base64Image = imageBuffer.toString("base64");

    const fieldText = requestedFields
      .map(
        (field) =>
          `- ${field.label} (key: ${field.key})`
      )
      .join("\n");

    const prompt = `
너는 수집품 사진을 분석해서 사용자의 컬렉션 등록을 돕는 AI다.

카테고리:
${category}

아래 항목들을 사진을 기반으로 분석하라.

${fieldText}

판단 순서:
1. 먼저 색상, 형태, 로고·문자, 캐릭터의 고유 특징, 받침대, 패키지, 부품 결합 구조 등 직접 보이는 사실을 관찰한다.
2. 관찰 결과로 대상·캐릭터가 무엇인지 판단한다.
3. 피규어, 조립식 블록 모델, 카드, 신발, 게임 등 제품 유형을 판단한다.
4. 그 다음 브랜드·라인·시리즈 후보를 검토한다.
5. 마지막에 정확한 제품명·세트명·제품번호까지 유일하게 특정할 시각 근거가 있는지 판단한다.

핵심 certainty 원칙:
- status는 모델이 정답일 것 같다고 느끼는 확률이 아니라, 해당 필드의 값을 사진 자체로 검증할 수 있는 정도다. 배경지식, 유명도, 직관은 직접 근거가 아니다.
- certain은 그 필드의 값을 직접 지지하는 강한 시각 근거가 있을 때만 허용한다. 예: 해당 제품명·캐릭터명·브랜드명이 명확히 읽힘, 식별 가능한 로고가 명확히 보임, 모델번호·세트번호·제품번호가 명확히 읽힘, 패키지에 공식 명칭이 명확히 표시됨.
- 예외적으로 대상 자체의 독특한 특징이 충분히 보여 다른 대상으로 오인할 가능성이 극히 낮은 경우에는 대상·캐릭터 수준을 certain으로 할 수 있다. 그러나 이 certainty를 브랜드·제조사·라인·정확한 제품·버전으로 전파시키지 마라.
- 색상·형태·제품 유형같은 일반 속성이 certain이어도 정확한 캐릭터명·제조사·모델·버전이 certain이라는 뜻이 아니다. 각 필드를 독립적으로 판정하라.
- 근거가 지지하는 계층까지만 확정하라. 예를 들어 “초록색 공룡 형태의 조립식 블록 모델”은 직접 관찰할 수 있고, “이상해꽃”은 외형에서 식별한 추론일 수 있으며, “Mega Construx 공식 제품”은 로고·패키지·제품번호 없이 확정할 수 없다.
- 외형만으로 정확한 identity를 추론했고 직접적인 문자·로고·번호 근거가 없다면 certain을 기본값으로 삼지 마라. 특히 희귀 캐릭터, 중소 제조사 제품, 식완·과자 부록, 비공식 굿즈, 오래된 제품은 유사품이 많음을 감안하여 더 보수적으로 판단하라.
- 사진과 부합하는 신뢰할 만한 후보가 하나 이상 있지만 유일하게 검증할 근거가 부족하면 ambiguous다. 실질적으로 다른 후보가 여러 개면 반드시 ambiguous다.
- 신뢰할 만한 후보조차 만들기 어려우면 unknown이다. unknown은 올바른 분석 결과이며 실패가 아니다. 허위 정보로 빈칸을 채우지 마라.

출력 규칙:
- 직접 관찰한 사실과 그로부터의 식별·추론을 구분하라. description에는 직접 보이는 특징을 중심으로 쓰고, 확인되지 않은 브랜드나 공식 제품 여부를 사실처럼 쓰지 마라.
- 카테고리와 필드 이름은 정리용 맥락이지 사진 속 브랜드의 근거가 아니다.
- 블록 형태라는 이유만으로 LEGO로 확정하지 마라. 정확한 제품을 모른다는 이유만으로 MOC, Custom, 커스텀을 제품명·브랜드·라인으로 만들지 마라. 해당 문자, 로고, 패키지 등 직접적 근거가 필요하다.
- 브랜드가 불확실해도 사진 근거로 명확한 대상·캐릭터·제품 유형은 비우지 마라. 단, 확실한 일반 속성을 이유로 exact identity의 status를 certain으로 올리지 마라.
- 사진으로 확인한 공식 브랜드명, 공식 제품명, 모델명, 세트명, 제품번호는 대소문자·숫자·단어 순서를 포함해 공식 원문 표기를 그대로 유지하고 임의로 한국어로 번역하지 마라.
- description, 상태와 같은 일반 설명은 한국어로 쓰라. 캐릭터는 한국 공식명이 확실할 때 "이상해꽃 (Venusaur)"처럼 한국명과 공식 원문명을 병기할 수 있다.
- 일본어 등 다른 언어 표기는 공식 고유명사 자체가 그 언어이거나 사진에서 실제로 읽히는 경우에만 사용하라. 스타일이나 추정 출처를 이유로 외국어 별칭을 만들지 마라.
- 필드별로 사진 근거와 일치하는 실질적인 대안만 내부적으로 비교하라. 후보 개수를 맞추기 위해 가능성이 낮은 이름을 만들지 마라.
- ambiguous일 때 value에는 가장 유력한 후보를 넣을 수 있고, candidates에는 사진과 실질적으로 부합하는 후보만 중복 없이 최대 3개 넣어라. 후보가 하나뿐이어도 직접 검증할 근거가 부족하면 certain으로 올리지 마라.
- 동일한 시각 근거에는 항상 같은 표기 원칙과 판단 기준을 적용하라. 근거가 바뀌지 않았는데 단지 가능하다는 이유로 다른 캐릭터명·제조사·제품명을 고르지 마라.
- unknown이면 value는 빈 문자열, candidates는 빈 배열이다. 제품명, 모델명, 브랜드, 제조사, 시리즈, 제품번호, 출시연도, 출시가격을 근거 없이 만들지 마라.
- name은 정확한 공식 제품명을 알 수 없어도, 확인 가능한 대상과 제품 유형을 조합한 일반적 이름을 사용할 수 있다. 이를 공식 제품명으로 속이지 마라.
- requested field의 key와 label은 절대 변경하지 말고, 모든 requested field를 fields 배열에 포함하라.
`;

    const ai = new GoogleGenAI({
      apiKey,
    });

    const startedAt = performance.now();

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",
      generation_config: {
        thinking_level: "low",
        seed: 42,
      },
      input: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image",
          data: base64Image,
          mime_type: image.type,
        },
      ],
      response_format: [
        {
          type: "text",
          mime_type: "application/json",
          schema: responseSchema,
        },
      ],
    });

    console.info(
      `Gemini analysis completed in ${(
        (performance.now() - startedAt) /
        1000
      ).toFixed(1)}s`
    );

    if (!interaction.output_text) {
      throw new Error("Gemini 응답이 없습니다.");
    }

    const result: unknown = JSON.parse(interaction.output_text);

    if (
      !isAnalysisResult(result) ||
      requestedFields.some(
        (field) =>
          !result.fields.some(
            (resultField) => resultField.key === field.key
          )
      )
    ) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }

    const requestedKeys = new Set(
      requestedFields.map((field) => field.key)
    );

    const visionAnalysis: AnalysisResult = {
      ...result,
      fields: result.fields.filter((field) => requestedKeys.has(field.key)),
    };

    if (!RAG_VERIFICATION_ENABLED) {
      return NextResponse.json({
        ...visionAnalysis,
        verificationAttempted: false,
        ...createUnverifiedResult(
          createIdentification(visionAnalysis),
          "RAG 검증을 임시로 비활성화해 Vision 분석 결과만 유지했습니다."
        ),
      });
    }

    try {
      const { analysis, verification } = await verifyIdentification({
        ai,
        model: "gemini-3.5-flash-lite",
        category,
        analysis: visionAnalysis,
      });

      return NextResponse.json({
        ...analysis,
        verificationAttempted: true,
        ...verification,
      });
    } catch (verificationError) {
      console.error("Gemini item verification error:", verificationError);

      return NextResponse.json({
        ...visionAnalysis,
        verificationAttempted: true,
        ...createUnverifiedResult(
          createIdentification(visionAnalysis),
          isQuotaError(verificationError)
            ? "외부 검증 사용량 한도에 도달해 Vision 분석 결과를 유지했습니다."
            : "외부 검증에 실패해 Vision 분석 결과를 유지했습니다."
        ),
      });
    }
  } catch (error) {
    console.error("Gemini item analysis error:", error);

    if (isQuotaError(error)) {
      return NextResponse.json(
        {
          error:
            "AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error:
          "이미지 분석 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
