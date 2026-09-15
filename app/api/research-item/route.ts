import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { RAG_VERIFICATION_ENABLED } from "@/lib/ai-config";
import { enforceAiRateLimit } from "@/lib/ai-rate-limit";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_RESEARCH_KEYS = new Set([
  "original_price",
  "release_year",
  "product_number",
  "manufacturer",
]);

const responseSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          value: { type: "string" },
          status: {
            type: "string",
            enum: ["found", "ambiguous", "not_found"],
          },
          note: { type: "string" },
        },
        required: ["key", "label", "value", "status", "note"],
      },
    },
  },
  required: ["results"],
};

type ResearchField = {
  key: string;
  label: string;
};

type ResearchRequest = {
  category: string;
  name: string;
  metadata: Record<string, string>;
  researchFields: ResearchField[];
};

type ResearchResult = {
  key: string;
  label: string;
  value: string;
  status: "found" | "ambiguous" | "not_found";
  note: string;
};

type Source = {
  title: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isResearchResult(value: unknown): value is ResearchResult {
  if (!isRecord(value)) return false;

  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    (value.status === "found" ||
      value.status === "ambiguous" ||
      value.status === "not_found") &&
    typeof value.note === "string"
  );
}

function isResearchResultArray(value: unknown): value is ResearchResult[] {
  return Array.isArray(value) && value.every(isResearchResult);
}

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

function extractSources(interaction: unknown): Source[] {
  if (!interaction || typeof interaction !== "object") return [];

  const steps = (interaction as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return [];

  const sources: Source[] = [];

  for (const step of steps) {
    if (!step || typeof step !== "object") continue;

    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== "object") continue;

      const annotations = (block as { annotations?: unknown }).annotations;
      if (!Array.isArray(annotations)) continue;

      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== "object") continue;

        const citation = annotation as {
          type?: unknown;
          title?: unknown;
          url?: unknown;
        };

        if (
          citation.type === "url_citation" &&
          typeof citation.url === "string"
        ) {
          const source = {
            title:
              typeof citation.title === "string"
                ? citation.title
                : citation.url,
            url: citation.url,
          };

          if (!sources.some((item) => item.url === source.url)) {
            sources.push(source);
          }
        }
      }
    }
  }

  return sources;
}

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

    if (!RAG_VERIFICATION_ENABLED) {
      return NextResponse.json(
        { error: "제품 정보 조회 기능은 현재 비활성화되어 있습니다." },
        { status: 503 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as Partial<ResearchRequest>;

    if (
      typeof body.category !== "string" ||
      typeof body.name !== "string" ||
      !body.metadata ||
      typeof body.metadata !== "object" ||
      Array.isArray(body.metadata) ||
      !Array.isArray(body.researchFields)
    ) {
      return NextResponse.json(
        { error: "제품 정보 또는 조사 항목이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const researchFields = body.researchFields.filter(
      (field): field is ResearchField =>
        Boolean(field) &&
        typeof field.key === "string" &&
        typeof field.label === "string" &&
        ALLOWED_RESEARCH_KEYS.has(field.key)
    );

    if (researchFields.length === 0) {
      return NextResponse.json({ results: [], sources: [] });
    }

    const fieldText = researchFields
      .map((field) => `- ${field.label} (key: ${field.key})`)
      .join("\n");

    const metadataText = Object.entries(body.metadata)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    const prompt = `
너는 수집품의 외부 정보를 조사하는 AI다.

사용자가 사진 분석 결과를 확인하고 수정한 현재 정보만 기준으로 검색하라.
비슷한 다른 제품의 정보를 섞지 말고, 현재 제품을 정확히 특정한 뒤 아래 조사 항목을 한 번에 조사하라.

카테고리:
${body.category}

확정된 제품명:
${body.name}

확정된 메타데이터:
${metadataText || "없음"}

조사할 항목:
${fieldText}

규칙:
- 최초 출시가격은 현재 중고가나 현재 판매가와 구분한다.
- 최초 출시가격이 국가/지역별로 다르면 note에 지역과 차이를 명시한다.
- 출시연도와 재출시연도를 구분한다.
- 모델번호/제품번호는 검색으로 확인할 수 있을 때만 반환한다.
- 출처마다 정보가 다르면 status를 ambiguous로 하고 note에 차이를 설명한다.
- 신뢰할 만한 자료를 찾지 못하면 값을 만들지 말고 status를 not_found로 반환한다.
- not_found이면 value는 빈 문자열로 반환한다.
- ambiguous이면 가장 근거 있는 값을 value에 넣을 수 있지만 note에 확정하기 어려운 이유를 짧게 설명한다.
- 모든 조사 항목을 results에 포함하고 key와 label은 입력 그대로 유지한다.
`;

    const rateLimitResponse = await enforceAiRateLimit(
      supabase,
      "research-item"
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",
      input: prompt,
      tools: [{ type: "google_search" }],
      response_format: [
        {
          type: "text",
          mime_type: "application/json",
          schema: responseSchema,
        },
      ],
    });

    if (!interaction.output_text) {
      throw new Error("Gemini 응답이 없습니다.");
    }

    const result: unknown = JSON.parse(interaction.output_text);

    if (!isRecord(result) || !isResearchResultArray(result.results)) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }

    const results = result.results;

    if (
      researchFields.some(
        (field) =>
          !results.some((resultField) => resultField.key === field.key)
      )
    ) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }

    const researchKeys = new Set(
      researchFields.map((field) => field.key)
    );

    return NextResponse.json({
      results: results.filter((field) => researchKeys.has(field.key)),
      sources: extractSources(interaction),
    });
  } catch (error) {
    console.error("Gemini research error:", error);

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
      { error: "제품 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
