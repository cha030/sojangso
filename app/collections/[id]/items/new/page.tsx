"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { categoryFields } from "@/lib/collection-fields";

const supabase = createClient();

type Field = {
  key: string;
  label: string;
};

type Collection = {
  id: string;
  name: string;
  category: string;
  custom_fields: Field[] | null;
};

type AIFieldResult = {
  key: string;
  label: string;
  value: string;
  status: "certain" | "ambiguous" | "unknown";
  candidates: string[];
};

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
        .single();

      if (error || !data) {
        setMessage("컬렉션을 불러오지 못했습니다.");
        return;
      }

      setCollection(data);

      if (Array.isArray(data.custom_fields)) {
        setExtraFields(data.custom_fields);
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
    };

    setExtraFields((prev) => [...prev, field]);
    setNewFieldName("");
  }

  async function handleImage(file?: File) {
    if (!file || !collection) return;

    setImageFile(file);
    setMessage("");
    setAiAnalyzed(false);
    setAiResults({});

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));

    const defaultFields =
      categoryFields[collection.category] ?? [];

    const fields = [
      ...defaultFields,
      ...extraFields.filter(
        (extra) =>
          !defaultFields.some(
            (field) => field.key === extra.key
          )
      ),
    ];

    const formData = new FormData();

    formData.append("image", file);
    formData.append("category", collection.category);
    formData.append("fields", JSON.stringify(fields));

    try {
      setAnalyzing(true);

      const response = await fetch("/api/analyze-item", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "AI 분석에 실패했습니다."
        );
      }

      setName(result.name || "");
      setDescription(result.description || "");

      const nextMetadata: Record<string, string> = {};
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

    if (!collection) return;

    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
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

      const { error: uploadError } =
        await supabase.storage
          .from("collection-images")
          .upload(imagePath, imageFile);

      if (uploadError) {
        setMessage(uploadError.message);
        setSaving(false);
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
      setSaving(false);
      return;
    }

    router.push(`/collections/${collectionId}`);
    router.refresh();
  }

  if (!collection) {
    return (
      <main className="mx-auto max-w-md p-6">
        {message || "불러오는 중..."}
      </main>
    );
  }

  const defaultFields =
    categoryFields[collection.category] ?? [];

  const fields = [
    ...defaultFields,
    ...extraFields.filter(
      (extra) =>
        !defaultFields.some(
          (field) => field.key === extra.key
        )
    ),
  ];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm"
      >
        ← 뒤로
      </button>

      <h1 className="mt-6 text-2xl font-bold">
        아이템 추가
      </h1>

      <p className="mt-1 text-sm text-gray-500">
        {collection.name}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
      >
        <section>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="수집품 미리보기"
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              사진을 추가해주세요
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                cameraInputRef.current?.click()
              }
              className="rounded-xl border p-3"
            >
              사진 찍기
            </button>

            <button
              type="button"
              onClick={() =>
                galleryInputRef.current?.click()
              }
              className="rounded-xl border p-3"
            >
              사진 업로드
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) =>
              handleImage(e.target.files?.[0])
            }
          />

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) =>
              handleImage(e.target.files?.[0])
            }
          />

          {analyzing && (
            <p className="mt-3 text-center text-sm text-gray-500">
              AI가 수집품을 분석하고 있습니다...
            </p>
          )}
        </section>

        <div>
          <label className="mb-2 block font-medium">
            이름
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="직접 입력하세요"
            className="w-full rounded-xl border p-3"
            required
          />
        </div>

        {fields.map((field) => {
          const aiResult = aiResults[field.key];

          return (
            <div key={field.key}>
              <div className="mb-2 flex items-center gap-2">
                <label className="font-medium">
                  {field.label}
                </label>

                {aiResult?.status === "ambiguous" && (
                  <span className="text-xs text-orange-500">
                    추정
                  </span>
                )}

                {aiResult?.status === "unknown" && (
                  <span className="text-xs text-gray-400">
                    확인 불가
                  </span>
                )}
              </div>

              <input
                value={metadata[field.key] ?? ""}
                onChange={(e) =>
                  updateField(
                    field.key,
                    e.target.value
                  )
                }
                placeholder="직접 입력하세요"
                className="w-full rounded-xl border p-3"
              />

              {aiResult?.status === "ambiguous" &&
                aiResult.candidates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiResult.candidates.map(
                      (candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() =>
                            updateField(
                              field.key,
                              candidate
                            )
                          }
                          className="rounded-full border px-3 py-1.5 text-sm"
                        >
                          {candidate}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        updateField(field.key, "")
                      }
                      className="rounded-full border px-3 py-1.5 text-sm"
                    >
                      직접 입력
                    </button>
                  </div>
                )}
            </div>
          );
        })}

        <div>
          <label className="mb-2 block font-medium">
            설명
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="직접 입력하세요"
            className="min-h-24 w-full rounded-xl border p-3"
          />
        </div>

        <section>
          <p className="mb-2 font-medium">
            기타 항목
          </p>

          <div className="flex gap-2">
            <input
              value={newFieldName}
              onChange={(e) =>
                setNewFieldName(e.target.value)
              }
              placeholder="예: 구매 가격"
              className="min-w-0 flex-1 rounded-xl border p-3"
            />

            <button
              type="button"
              onClick={addExtraField}
              className="rounded-xl border px-4"
            >
              +
            </button>
          </div>
        </section>

        {message && (
          <p className="text-sm text-red-500">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || analyzing}
          className="w-full rounded-xl bg-black p-4 font-semibold text-white disabled:opacity-50"
        >
          {saving
            ? "저장 중..."
            : "컬렉션에 저장"}
        </button>
      </form>
    </main>
  );
}