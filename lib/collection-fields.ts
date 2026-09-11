export type CollectionFieldMode = "research" | "manual";

export type CollectionField = {
  key: string;
  label: string;
  mode: CollectionFieldMode;
};

export const categoryFields: Record<
  string,
  { key: string; label: string }[]
> = {
  figure: [
    { key: "character", label: "캐릭터" },
    { key: "series", label: "작품 / 시리즈" },
    { key: "manufacturer", label: "제조사" },
    { key: "edition", label: "버전 / 에디션" },
  ],

  game: [
    { key: "platform", label: "플랫폼" },
    { key: "publisher", label: "제작사 / 퍼블리셔" },
    { key: "release_year", label: "출시연도" },
    { key: "region", label: "지역판" },
  ],

  shoes: [
    { key: "brand", label: "브랜드" },
    { key: "model", label: "모델" },
    { key: "colorway", label: "컬러웨이" },
    { key: "release_year", label: "출시연도" },
  ],

  lego: [
    { key: "set_name", label: "세트명" },
    { key: "set_number", label: "세트번호" },
    { key: "theme", label: "테마" },
    { key: "release_year", label: "출시연도" },
  ],

  other: [],
};

export const researchFields: CollectionField[] = [
  {
    key: "original_price",
    label: "최초 출시가격",
    mode: "research",
  },
  {
    key: "release_year",
    label: "출시연도",
    mode: "research",
  },
  {
    key: "product_number",
    label: "모델 / 제품번호",
    mode: "research",
  },
  {
    key: "manufacturer",
    label: "제조사",
    mode: "research",
  },
];

export function isResearchFieldDuplicate(
  category: string,
  field: CollectionField
) {
  const defaultFields = categoryFields[category] ?? [];

  return defaultFields.some((defaultField) => {
    if (defaultField.key === field.key) return true;

    return (
      field.key === "product_number" &&
      ((category === "lego" && defaultField.key === "set_number") ||
        (category === "shoes" && defaultField.key === "model"))
    );
  });
}