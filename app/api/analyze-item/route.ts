import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

const responseSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        "가장 적절한 아이템 이름. 식별하지 못하면 빈 문자열.",
    },
    description: {
      type: "string",
      description:
        "사진에서 확인되는 내용을 바탕으로 한 짧은 설명.",
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
              "가장 적절한 값. 알 수 없으면 빈 문자열.",
          },
          status: {
            type: "string",
            enum: ["certain", "ambiguous", "unknown"],
          },
          candidates: {
            type: "array",
            items: {
              type: "string",
            },
            description:
              "ambiguous일 때만 최대 3개 후보.",
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
        { error: "이미지는 10MB 이하만 가능합니다." },
        { status: 400 }
      );
    }

    let requestedFields: RequestedField[];

    try {
      requestedFields = JSON.parse(fieldsRaw);
    } catch {
      return NextResponse.json(
        { error: "필드 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

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

중요 규칙:

1. 사진에서 비교적 명확하게 식별할 수 있으면 status를 "certain"으로 한다.

2. 두 개 이상의 가능성이 있어 하나로 확정하기 어렵다면
status를 "ambiguous"로 하고,
candidates에 가장 가능성이 높은 후보를 최대 3개 넣는다.

예:
Air Speed Turf와 Air Griffey Max 1이 모두 가능하다면
둘 다 candidates에 넣는다.

3. 확인할 수 없으면 status를 "unknown"으로 하고
value는 빈 문자열,
candidates는 빈 배열로 반환한다.

4. 제품명, 모델명, 제조사, 출시연도 등을
사진만으로 확정할 수 없다면 그럴듯하게 만들어내지 마라.

5. 컬러웨이처럼
"Dark Navy 또는 Black"처럼 애매한 경우에도
하나를 임의로 확정하지 말고 ambiguous로 처리한다.

6. requested field의 key와 label은 절대 변경하지 마라.

7. description은 사진에서 확인할 수 있는 특징을 중심으로
짧고 자연스러운 한국어로 작성한다.

8. candidates는 중복 없이 최대 3개만 반환한다.

9. 모든 requested field를 반드시 fields 배열에 포함한다.
`;

    const ai = new GoogleGenAI({
      apiKey,
    });

    const startedAt = performance.now();

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      generation_config: {
        thinking_level: "low",
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

    const result = JSON.parse(
      interaction.output_text
    );

    return NextResponse.json(result);
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