"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  categoryFields,
  CollectionField,
  isResearchFieldDuplicate,
} from "@/lib/collection-fields";

const supabase = createClient();

type Field = {
  key: string;
  label: string;
  mode: CollectionField["mode"] | "analysis";
};

type Collection = {
  id: string;
  name: string;
  category: string;
  custom_fields: CollectionField[] | null;
};

type AIFieldResult = {
  key: string;
  label: string;
  value: string;
  status: "certain" | "ambiguous" | "unknown";
  candidates: string[];
};

type AIResponse = {
  name: string;
  description: string;
  fields: AIFieldResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    isRecord(value) &&
    typeof value.error === "string" &&
    value.error
  ) {
    return value.error;
  }

  return fallback;
}

function isCollectionField(value: unknown): value is CollectionField {
  if (!isRecord(value)) return false;

  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    (value.mode === "research" ||
      value.mode === "manual" ||
      value.mode === undefined)
  );
}

function isAIFieldResult(value: unknown): value is AIFieldResult {
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

function isAIResponse(value: unknown): value is AIResponse {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.fields) &&
    value.fields.every(isAIFieldResult)
  );
}

function getAIFields(category: string, extraFields: Field[]) {
  const defaultFields: Field[] = (categoryFields[category] ?? []).map(
    (field) => ({ ...field, mode: "analysis" })
  );
  const seenKeys = new Set(defaultFields.map((field) => field.key));
  const selectedFields: Field[] = [];

  extraFields.forEach((field) => {
    if (
      field.mode !== "research" ||
      seenKeys.has(field.key) ||
      isResearchFieldDuplicate(category, {
        key: field.key,
        label: field.label,
        mode: "research",
      })
    ) {
      return;
    }

    seenKeys.add(field.key);
    selectedFields.push(field);
  });

  return [...defaultFields, ...selectedFields];
}

export default function NewItemPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const collectionId = params.id;

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [collection, setCollection] = useState<Collection | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [aiResults, setAiResults] = useState<
    Record<string, AIFieldResult>
  >({});

  const [extraFields, setExtraFields] = useState<Field[]>([]);
  const [newFieldName, setNewFieldName] = useState("");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);

  useEffect(() => {
    async function loadCollection() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("collections")
        .select("id, name, category, custom_fields")
        .eq("id", collectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setMessage("컬렉션을 불러오지 못했습니다.");
        return;
      }

      setCollection(data);

      if (Array.isArray(data.custom_fields)) {
        setExtraFields(
          data.custom_fields
            .filter(isCollectionField)
            .map((field) => ({
              ...field,
              mode: field.mode ?? "manual",
            }))
        );
      }
    }

    loadCollection();
  }, [collectionId, router]);

  function updateField(key: string, value: string) {
    setMetadata((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function addExtraField() {
    const label = newFieldName.trim();

    if (!label) return;

    const field: Field = {
      key: crypto.randomUUID(),
      label,
      mode: "manual",
    };

    setExtraFields((prev) => [...prev, field]);
    setNewFieldName("");
  }

  async function handleImage(file?: File) {
    if (
      !file ||
      !collection ||
      analyzing ||
      saving
    ) {
      return;
    }

    setAnalyzing(true);
    setImageFile(file);
    setMessage("");
    setAiAnalyzed(false);
    setAiResults({});
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));

    const analysisFields = getAIFields(
      collection.category,
      extraFields
    ).map(({ key, label }) => ({ key, label }));

    const formData = new FormData();

    formData.append("image", file);
    formData.append("category", collection.category);
    formData.append("fields", JSON.stringify(analysisFields));

    try {
      const response = await fetch("/api/analyze-item", {
        method: "POST",
        body: formData,
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "AI 분석에 실패했습니다.")
        );
      }

      if (
        !isAIResponse(result) ||
        analysisFields.some(
          (field) =>
            !result.fields.some((resultField) => resultField.key === field.key)
        )
      ) {
        throw new Error(
          "AI 분석 결과를 확인할 수 없습니다. 직접 입력해주세요."
        );
      }

      setName(result.name);
      setDescription(result.description);

      const nextMetadata: Record<string, string> = Object.fromEntries(
        extraFields
          .filter((field) => field.mode === "manual")
          .map((field) => [field.key, metadata[field.key] ?? ""])
      );
      const nextResults: Record<string, AIFieldResult> = {};

      result.fields.forEach((field: AIFieldResult) => {
        nextResults[field.key] = field;

        if (
          (field.status === "certain" ||
            field.status === "ambiguous") &&
          field.value
        ) {
          nextMetadata[field.key] = field.value;
        } else {
          nextMetadata[field.key] = "";
        }
      });

      setMetadata(nextMetadata);
      setAiResults(nextResults);
      setAiAnalyzed(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "AI 분석 중 오류가 발생했습니다."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!collection || saving || analyzing) return;

    flushSync(() => {
      setSaving(true);
      setMessage("");
    });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const itemId = crypto.randomUUID();
      let imagePath: string | null = null;

      if (imageFile) {
        const extension =
          imageFile.type === "image/png"
            ? "png"
            : imageFile.type === "image/webp"
              ? "webp"
              : "jpg";

        imagePath = `${user.id}/${collectionId}/${itemId}/image.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("collection-images")
          .upload(imagePath, imageFile);

        if (uploadError) {
          setMessage(`이미지 업로드에 실패했습니다: ${uploadError.message}`);
          return;
        }
      }

      const { error } = await supabase.from("items").insert({
        id: itemId,
        collection_id: collectionId,
        user_id: user.id,
        name,
        image_path: imagePath,
        metadata: {
          ...metadata,
          description,
        },
        input_method: aiAnalyzed ? "ai" : "manual",
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push(`/collections/${collectionId}`);
      router.refresh();
    } catch {
      setMessage("아이템을 저장하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (!collection) {
    return (
      <main className="museum-page">
        <p className={message ? "museum-inline-error" : "museum-page-copy"}>
          {message || "불러오는 중..."}
        </p>
      </main>
    );
  }

  const aiFields = getAIFields(collection.category, extraFields);
  const aiFieldKeys = new Set(aiFields.map((field) => field.key));

  const fields = [
    ...aiFields,
    ...extraFields.filter(
      (extra) =>
        extra.mode === "manual" && !aiFieldKeys.has(extra.key)
    ),
  ];

  return (
    <main className="museum-page museum-intake-page">
      <header className="museum-intake-header">
        <p className="museum-kicker">{collection.name}</p>
        <h1 className="museum-display-title">새 수집물 추가</h1>
        <p className="museum-page-copy">사진으로 수집물을 식별하고 정보를 확인한 뒤 컬렉션에 전시하세요.</p>
      </header>

      <form
        onSubmit={handleSubmit}
      >
        <div className="museum-intake-layout">
          <section className="museum-upload-column">
            <div className="museum-upload-artwork">
              {previewUrl ? (
                <img src={previewUrl} alt="수집물 미리보기" />
              ) : (
                <span>사진을 추가해주세요</span>
              )}
            </div>

            <div className="museum-upload-actions">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={analyzing || saving}
                className="museum-secondary-button"
              >
                {analyzing ? "분석 중..." : "사진 찍기"}
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={analyzing || saving}
                className="museum-secondary-button"
              >
                {analyzing ? "분석 중..." : "사진 업로드"}
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={analyzing || saving}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                handleImage(file);
              }}
            />

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={analyzing || saving}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                handleImage(file);
              }}
            />

            {analyzing && (
              <p className="museum-ai-status">AI가 수집물을 분석하고 있습니다...</p>
            )}
          </section>

          <section className="museum-intake-form">
            <div className="museum-intake-section-heading">
              <strong>수집물 정보</strong>
              <span>{aiAnalyzed ? "분석 결과 확인" : "직접 입력 가능"}</span>
            </div>

            <p className="museum-ai-status">
              {aiAnalyzed
                ? "확인하지 못한 정보는 직접 입력해주세요. AI가 입력한 정보도 자유롭게 수정할 수 있어요."
                : "사진을 등록하면 AI가 수집물 정보를 찾아 입력해드려요. 결과가 정확하지 않다면 사진을 다시 등록하거나 직접 수정할 수 있어요."}
            </p>

            <label className="museum-form-field">
              <span className="museum-form-label">이름</span>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={aiAnalyzed && !name ? "직접 입력해주세요" : aiAnalyzed ? "" : "AI 분석 후 자동 입력"}
                className="museum-input"
                required
              />
            </label>

            {fields.map((field) => {
              const aiResult = aiResults[field.key];
              const value = metadata[field.key] ?? "";
              const placeholder = field.mode === "manual"
                ? "직접 기록해주세요"
                : !aiAnalyzed ? "AI 분석 후 자동 입력" : value ? "" : "직접 입력해주세요";

              return (
                <div key={field.key} className="museum-form-field">
                  <span className="museum-field-heading">
                    <label className="museum-form-label" htmlFor={`item-field-${field.key}`}>{field.label}</label>

                    {aiResult?.status === "ambiguous" && (
                      <span className="museum-field-state museum-field-state-warning">확인 필요</span>
                    )}

                    {aiResult?.status === "unknown" && (
                      <span className="museum-field-state museum-field-state-muted">확인 불가</span>
                    )}
                  </span>

                  <input
                    id={`item-field-${field.key}`}
                    value={value}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={placeholder}
                    className="museum-input"
                  />

                  {aiResult?.status === "ambiguous" && aiResult.candidates.length > 0 && (
                    <span className="museum-candidate-list">
                      {aiResult.candidates.map((candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => updateField(field.key, candidate)}
                          className="museum-chip-button"
                        >
                          {candidate}
                        </button>
                      ))}

                      <button type="button" onClick={() => updateField(field.key, "")} className="museum-chip-button">
                        직접 입력
                      </button>
                    </span>
                  )}
                </div>
              );
            })}

            <label className="museum-form-field">
              <span className="museum-form-label">설명</span>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={aiAnalyzed && !description ? "직접 입력해주세요" : aiAnalyzed ? "" : "AI 분석 후 자동 입력"}
                className="museum-textarea"
              />
            </label>

            <section className="museum-form-field">
              <span className="museum-form-label">기타 항목</span>

              <div className="museum-inline-field">
                <input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="예: 구매 가격"
                  className="museum-input"
                />

                <button type="button" onClick={addExtraField} className="museum-icon-button" aria-label="기타 항목 추가">+</button>
              </div>
            </section>

            {message && <p className="museum-inline-error" role="status">{message}</p>}

            <button
              type="submit"
              disabled={saving || analyzing}
              className="museum-primary-button museum-full-button"
            >
              {saving ? "저장 중..." : "컬렉션에 저장"}
            </button>
          </section>
        </div>
      </form>
    </main>
  );
}
