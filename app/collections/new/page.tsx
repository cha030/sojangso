"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isResearchFieldDuplicate,
  researchFields,
} from "@/lib/collection-fields";

const categories = [
  { value: "figure", label: "피규어" },
  { value: "card", label: "카드" },
  { value: "shoes", label: "신발" },
  { value: "lego", label: "레고" },
  { value: "other", label: "기타" },
];

const supabase = createClient();

export default function NewCollectionPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("figure");
  const [customCategory, setCustomCategory] = useState("");
  const [goalCount, setGoalCount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedResearchKeys, setSelectedResearchKeys] = useState<
    string[]
  >([]);
  const [manualFields, setManualFields] = useState<string[]>([]);
  const [newField, setNewField] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  function addCustomField() {
    const value = newField.trim();

    if (!value) return;

    setManualFields([...manualFields, value]);
    setNewField("");
  }

  function removeCustomField(index: number) {
    setManualFields(manualFields.filter((_, i) => i !== index));
  }

  function toggleResearchField(key: string) {
    setSelectedResearchKeys((current) =>
      current.includes(key)
        ? current.filter((currentKey) => currentKey !== key)
        : [...current, key]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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

      const { error } = await supabase.from("collections").insert({
        user_id: user.id,
        name,
        category,
        custom_category_name:
          category === "other" ? customCategory : null,
        goal_count: goalCount ? Number(goalCount) : null,
        description: description || null,
        custom_fields: [
          ...researchFields
            .filter(
              (field) =>
                selectedResearchKeys.includes(field.key) &&
                !isResearchFieldDuplicate(category, field)
            )
            .map(({ key, label, mode }) => ({ key, label, mode })),
          ...manualFields.map((label) => ({
            key: crypto.randomUUID(),
            label,
            mode: "manual",
          })),
        ],
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("컬렉션을 만들지 못했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="museum-page">
        <p className="museum-page-copy">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="museum-page museum-form-page">
      <header className="museum-form-intro">
        <p className="museum-kicker">새로운 전시 구역</p>
        <h1 className="museum-display-title">새 컬렉션</h1>
        <p className="museum-page-copy">모으고 싶은 것들을 위한 하나의 전시 공간을 구성해보세요.</p>
      </header>

      <form onSubmit={handleSubmit} className="museum-form-shell">
        <section className="museum-form-section">
          <div className="museum-form-section-heading">
            <span>01</span>
            <div><h2>기본 정보</h2><p>컬렉션의 이름과 분류를 정해주세요.</p></div>
          </div>

          <label className="museum-form-field">
            <span className="museum-form-label">컬렉션 이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="museum-input"
              placeholder="예: 포켓몬 피규어"
              required
            />
          </label>

          <label className="museum-form-field">
            <span className="museum-form-label">카테고리</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="museum-select"
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          {category === "other" && (
            <label className="museum-form-field">
              <span className="museum-form-label">카테고리명</span>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="museum-input"
                placeholder="카테고리명을 입력하세요"
                required
              />
            </label>
          )}
        </section>

        <section className="museum-form-section">
          <div className="museum-form-section-heading">
            <span>02</span>
            <div><h2>전시 계획</h2><p>목표와 컬렉션 설명을 기록할 수 있어요.</p></div>
          </div>

          <label className="museum-form-field">
            <span className="museum-form-label">목표 개수</span>
            <input
              type="number"
              min="1"
              value={goalCount}
              onChange={(e) => setGoalCount(e.target.value)}
              className="museum-input"
              placeholder="예: 30"
            />
          </label>

          <label className="museum-form-field">
            <span className="museum-form-label">설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="museum-textarea"
              placeholder="어떤 컬렉션인지 적어주세요"
            />
          </label>
        </section>

        <section className="museum-form-section">
          <div className="museum-form-section-heading">
            <span>03</span>
            <div><h2>추가로 확인할 정보</h2><p>사진 분석 시 AI가 함께 확인할 항목을 선택하세요.</p></div>
          </div>

          <div className="museum-checkbox-grid museum-research-options">
            {researchFields.map((field) => {
              const disabled = isResearchFieldDuplicate(category, field);

              return (
                <label
                  key={field.key}
                  className="museum-checkbox-row"
                >
                  <input
                    type="checkbox"
                    checked={selectedResearchKeys.includes(field.key)}
                    disabled={disabled}
                    onChange={() => toggleResearchField(field.key)}
                  />
                  <span>{field.label}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="museum-form-section">
          <div className="museum-form-section-heading">
            <span>04</span>
            <div><h2>직접 기록할 항목</h2><p>AI가 알 수 없는 개인 정보를 직접 기록할 수 있어요.</p></div>
          </div>

          <div className="museum-inline-field">
            <input
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              className="museum-input"
              placeholder="예: 구매 가격"
            />

            <button
              type="button"
              onClick={addCustomField}
              className="museum-icon-button"
              aria-label="직접 기록할 항목 추가"
            >
              +
            </button>
          </div>

          <div className="museum-added-fields">
            {manualFields.map((field, index) => (
              <div
                key={`${field}-${index}`}
                className="museum-added-field"
              >
                <span>{field}</span>

                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  aria-label={`${field} 항목 삭제`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {message && <p className="museum-inline-error museum-form-message" role="status">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="museum-primary-button museum-full-button museum-form-submit"
        >
          {saving ? "저장 중..." : "컬렉션 만들기"}
        </button>
      </form>
    </main>
  );
}
