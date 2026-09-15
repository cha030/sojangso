import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AiRateLimitAction =
  | "analyze-item"
  | "analyze-collection"
  | "research-item";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export async function enforceAiRateLimit(
  supabase: SupabaseClient,
  action: AiRateLimitAction
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("consume_ai_rate_limit", {
    p_action: action,
  });

  if (error) {
    console.error("AI rate limit check failed:", error);
    return NextResponse.json(
      {
        error:
          "AI 요청 제한을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 503 }
    );
  }

  const result: unknown = Array.isArray(data) ? data[0] : null;

  if (
    !isRecord(result) ||
    typeof result.allowed !== "boolean" ||
    typeof result.retry_after_seconds !== "number" ||
    !Number.isFinite(result.retry_after_seconds)
  ) {
    console.error("AI rate limit response is invalid.");
    return NextResponse.json(
      {
        error:
          "AI 요청 제한을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 503 }
    );
  }

  if (result.allowed) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil(result.retry_after_seconds));

  return NextResponse.json(
    { error: "AI 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  );
}
