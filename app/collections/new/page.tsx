"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isResearchFieldDuplicate,
  researchFields,
} from "@/lib/collection-fields";

const categories = [
  { value: "figure", label: "피규어" },
  { value: "game", label: "게임" },
  { value: "shoes", label: "신발" },
  { value: "lego", label: "레고" },
  { value: "other", label: "기타" },
];

export default function NewCollectionPage() {
  const router = useRouter();
  const supabase = createClient();

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
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("collections").insert({
      user_id: user.id,
      name,
      category,
      custom_category_name: category === "other" ? customCategory : null,
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
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <button onClick={() => router.back()} className="mb-6 text-sm">
        ← 뒤로
      </button>

      <h1 className="text-2xl font-bold">새 컬렉션</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold">필수</h2>

        <div>
          <label className="mb-2 block font-medium">컬렉션 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border p-3"
            placeholder="예: 포켓몬 피규어"
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">카테고리</label>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border p-3"
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          {category === "other" && (
            <input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="mt-3 w-full rounded-xl border p-3"
              placeholder="카테고리명을 입력하세요"
              required
            />
          )}
        </div>

        <h2 className="pt-2 text-lg font-semibold">선택</h2>

        <div>
          <label className="mb-2 block font-medium">목표 개수</label>
          <input
            type="number"
            min="1"
            value={goalCount}
            onChange={(e) => setGoalCount(e.target.value)}
            className="w-full rounded-xl border p-3"
            placeholder="예: 30"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-28 w-full rounded-xl border p-3"
            placeholder="어떤 컬렉션인지 적어주세요"
          />
        </div>

        <div>
          <label className="block font-medium">추가로 확인할 정보</label>

          <p className="mt-1 text-sm text-gray-500">
            수집품이 식별된 후 추가로 확인하고 싶은 정보를 선택하세요.
          </p>

          <div className="mt-3 space-y-2">
            {researchFields.map((field) => {
              const disabled = isResearchFieldDuplicate(category, field);

              return (
                <label
                  key={field.key}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    disabled ? "bg-gray-100 text-gray-400" : ""
                  }`}
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
        </div>

        <div>
          <label className="block font-medium">직접 기록할 항목</label>

          <p className="mt-1 text-sm text-gray-500">
            AI가 알 수 없는 개인 정보를 직접 기록할 수 있습니다.
          </p>

          <div className="mt-3 flex gap-2">
            <input
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              className="flex-1 rounded-xl border p-3"
              placeholder="예: 구매 장소"
            />

            <button
              type="button"
              onClick={addCustomField}
              className="rounded-xl border px-4"
            >
              +
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {manualFields.map((field, index) => (
              <div
                key={`${field}-${index}`}
                className="flex items-center justify-between rounded-lg bg-gray-100 p-3"
              >
                <span>{field}</span>

                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {message && <p className="text-sm text-red-500">{message}</p>}

        <button
          type="submit"
          className="w-full rounded-xl bg-black p-4 font-semibold text-white"
        >
          컬렉션 만들기
        </button>
      </form>
    </main>
  );
}