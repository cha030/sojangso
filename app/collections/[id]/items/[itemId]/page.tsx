import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import ItemEditForm from "./item-edit-form";
import DeleteConfirmation from "@/app/delete-confirmation";
import { categoryFields } from "@/lib/collection-fields";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string; itemId: string }>;
};

type Field = {
  key: string;
  label: string;
};

function isField(value: unknown): value is Field {
  if (!value || typeof value !== "object") {
    return false;
  }

  const field = value as Partial<Field>;

  return typeof field.key === "string" && typeof field.label === "string";
}

function getMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export default async function ItemDetailPage({ params }: Props) {
  const { id, itemId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("id, name, category, custom_fields")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!collection) {
    notFound();
  }

  const { data: item } = await supabase
    .from("items")
    .select("id, name, image_path, metadata")
    .eq("id", itemId)
    .eq("collection_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!item) {
    notFound();
  }

  let imageUrl: string | null = null;

  if (item.image_path) {
    try {
      const { data, error } = await supabase.storage
        .from("collection-images")
        .createSignedUrl(item.image_path, 60 * 60);

      if (!error) {
        imageUrl = data.signedUrl;
      }
    } catch {
      imageUrl = null;
    }
  }

  const defaultFields = categoryFields[collection.category] ?? [];
  const customFields = Array.isArray(collection.custom_fields)
    ? collection.custom_fields.filter(isField)
    : [];
  const fields = [
    ...defaultFields,
    ...customFields.filter(
      (customField) =>
        !defaultFields.some(
          (defaultField) => defaultField.key === customField.key
        )
    ),
  ];

  return (
    <main className="museum-page museum-item-page">
      <header className="museum-item-heading">
        <p className="museum-kicker">하나의 수집물을 자세히 보고 있어요</p>
        <h1 className="museum-display-title">수집물 상세</h1>
      </header>

      <div className="museum-item-layout">
        <section className="museum-item-stage">
          <p className="museum-kicker">수집물</p>
          <div className="museum-item-image">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={item.name}
                fill
                sizes="(max-width: 767px) 100vw, 52vw"
                className="object-contain"
                unoptimized
              />
            )}
          </div>
        </section>

        <div className="museum-item-record">
          <p className="museum-kicker">{collection.name}</p>
          <ItemEditForm
            collectionId={id}
            itemId={item.id}
            initialName={item.name}
            initialMetadata={getMetadata(item.metadata)}
            fields={fields}
          />

          <section className="museum-danger-zone">
            <div className="museum-danger-copy">
              <strong>수집물 삭제</strong>
              <span>이 수집물과 연결된 이미지를 삭제합니다.</span>
            </div>
            <DeleteConfirmation
              buttonLabel="수집물 삭제"
              title="이 수집물을 삭제할까요?"
              endpoint={`/api/collections/${id}/items/${item.id}`}
              redirectTo={`/collections/${id}`}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
