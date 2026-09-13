"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Field = {
  key: string;
  label: string;
};

type Props = {
  collectionId: string;
  itemId: string;
  initialName: string;
  initialMetadata: Record<string, unknown>;
  fields: Field[];
};

const supabase = createClient();

function getTextValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

export default function ItemEditForm({
  collectionId,
  itemId,
  initialName,
  initialMetadata,
  fields,
}: Props) {
  const router = useRouter();
  const initialDescription = getTextValue(initialMetadata.description);
  const [isEditing, setIsEditing] = useState(false);
  const [savedName, setSavedName] = useState(initialName);
  const [savedMetadata, setSavedMetadata] = useState(initialMetadata);
  const [savedDescription, setSavedDescription] = useState(
    initialDescription
  );
  const [name, setName] = useState(initialName);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [description, setDescription] = useState(initialDescription);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function getFieldValue(key: string) {
    return getTextValue(metadata[key]);
  }

  function updateField(key: string, value: string) {
    setMetadata((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startEditing() {
    setName(savedName);
    setMetadata(savedMetadata);
    setDescription(savedDescription);
    setMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setName(savedName);
    setMetadata(savedMetadata);
    setDescription(savedDescription);
    setMessage("");
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select("id")
        .eq("id", collectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (collectionError || !collection) {
        setMessage("컬렉션에 접근할 수 없습니다.");
        return;
      }

      const nextMetadata = {
        ...metadata,
        description,
      };

      const { data: updatedItem, error } = await supabase
        .from("items")
        .update({
          name,
          metadata: nextMetadata,
        })
        .eq("id", itemId)
        .eq("collection_id", collectionId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error || !updatedItem) {
        setMessage("수집물을 수정하지 못했습니다.");
        return;
      }

      setSavedName(name);
      setSavedMetadata(nextMetadata);
      setSavedDescription(description);
      setIsEditing(false);
      router.refresh();
    } catch {
      setMessage("수집물을 수정하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <section>
        <h2 className="museum-record-title">{savedName}</h2>

        <dl className="museum-detail-list">
          <div className="museum-detail-row">
            <dt>이름</dt>
            <dd>{savedName}</dd>
          </div>

        {fields.map((field) => {
          const value = getTextValue(savedMetadata[field.key]);

          return (
            <div key={field.key} className="museum-detail-row">
              <dt>{field.label}</dt>
              <dd>{value || "입력된 정보가 없습니다."}</dd>
            </div>
          );
        })}

          <div className="museum-detail-row">
            <dt>설명</dt>
            <dd className="whitespace-pre-wrap">
            {savedDescription || "입력된 설명이 없습니다."}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={startEditing}
          className="museum-primary-button museum-full-button"
        >
          수정하기
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="museum-edit-panel museum-edit-form">
      <span className="museum-edit-badge">현재 편집 중</span>
      <h2 className="museum-edit-title">수집물 정보 수정</h2>

      <label className="museum-form-field">
        <span className="museum-form-label">이름</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="직접 입력하세요"
          className="museum-input"
          required
        />
      </label>

      {fields.map((field) => (
        <label key={field.key} className="museum-form-field">
          <span className="museum-form-label">{field.label}</span>
          <input
            value={getFieldValue(field.key)}
            onChange={(event) =>
              updateField(field.key, event.target.value)
            }
            placeholder="직접 입력하세요"
            className="museum-input"
          />
        </label>
      ))}

      <label className="museum-form-field">
        <span className="museum-form-label">설명</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="직접 입력하세요"
          className="museum-textarea"
        />
      </label>

      {message && <p className="museum-inline-error" role="status">{message}</p>}

      <div className="museum-form-actions">
        <button
          type="button"
          onClick={cancelEditing}
          disabled={saving}
          className="museum-secondary-button"
        >
          취소
        </button>

        <button
          type="submit"
          disabled={saving}
          className="museum-primary-button"
        >
          {saving ? "저장 중..." : "수정 저장"}
        </button>
      </div>
    </form>
  );
}
