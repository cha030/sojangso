"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";

type AnalysisResult = {
  collection_summary: string;
  collection_pattern: string;
  recommendation_type: "item" | "direction";
  recommendation: string;
  recommendation_reason: string;
};

type Props = {
  collectionId: string;
  itemCount: number;
  itemLoadingFailed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  return (
    isRecord(value) &&
    typeof value.collection_summary === "string" &&
    Boolean(value.collection_summary.trim()) &&
    typeof value.collection_pattern === "string" &&
    Boolean(value.collection_pattern.trim()) &&
    (value.recommendation_type === "item" ||
      value.recommendation_type === "direction") &&
    typeof value.recommendation === "string" &&
    Boolean(value.recommendation.trim()) &&
    typeof value.recommendation_reason === "string" &&
    Boolean(value.recommendation_reason.trim())
  );
}

function getErrorMessage(value: unknown) {
  if (
    isRecord(value) &&
    typeof value.error === "string" &&
    value.error
  ) {
    return value.error;
  }

  return "내 수집 분석 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export default function CollectionAnalysis({
  collectionId,
  itemCount,
  itemLoadingFailed,
}: Props) {
  const analyzingRef = useRef(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [message, setMessage] = useState("");
  const hasEnoughItems = itemCount >= 3;

  async function handleAnalyze() {
    if (
      analyzingRef.current ||
      !hasEnoughItems ||
      itemLoadingFailed
    ) {
      return;
    }

    analyzingRef.current = true;
    flushSync(() => {
      setAnalyzing(true);
      setMessage("");
    });

    try {
      const response = await fetch("/api/analyze-collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collectionId }),
      });
      const responseBody: unknown = await response.json();

      if (!response.ok) {
        setMessage(getErrorMessage(responseBody));
        return;
      }

      if (!isAnalysisResult(responseBody)) {
        setMessage(
          "내 수집 분석 결과를 확인할 수 없습니다. 다시 시도해주세요."
        );
        return;
      }

      setResult(responseBody);
    } catch {
      setMessage(
        "내 수집 분석 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  }

  return (
    <section className="museum-analysis-panel">
      <div>
        <p className="museum-kicker">수집을 바라보는 새로운 시선</p>
        <h2>내 수집 분석</h2>
      </div>

      <div className="museum-analysis-action">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || !hasEnoughItems || itemLoadingFailed}
          className="museum-secondary-button"
        >
          {analyzing ? "내 수집 분석 중..." : "내 수집 분석"}
        </button>

        {!itemLoadingFailed && !hasEnoughItems && (
          <p>수집물을 3개 이상 등록하면 내 수집을 분석해드려요.</p>
        )}
      </div>

      {message && (
        <p className="museum-inline-error" role="status">
          {message}
        </p>
      )}

      {result && (
        <div className="museum-analysis-results">
          <div>
            <h3>컬렉션 특징</h3>
            <p>{result.collection_summary}</p>
          </div>

          <div>
            <h3>수집 패턴</h3>
            <p>{result.collection_pattern}</p>
          </div>

          <div>
            <h3>
              {result.recommendation_type === "item"
                ? "다음 수집물 추천"
                : "다음 수집 방향"}
            </h3>
            <p>{result.recommendation}</p>
          </div>

          <div>
            <h3>추천 이유</h3>
            <p>{result.recommendation_reason}</p>
          </div>
        </div>
      )}
    </section>
  );
}
