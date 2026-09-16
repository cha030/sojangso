import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CollectionAnalysis from "./collection-analysis";
import DeleteConfirmation from "@/app/delete-confirmation";
import { createClient } from "@/lib/supabase/server";
import { createCardImageSignedUrl } from "@/lib/storage-images";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [collectionResult, itemsResult] = await Promise.all([
    supabase
      .from("collections")
      .select("name, description, goal_count")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("items")
      .select("id, name, image_path, created_at")
      .eq("collection_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  const { data: collection } = collectionResult;
  const { data: items, error: itemsError } = itemsResult;

  if (!collection) {
    notFound();
  }

  const itemsWithImageUrls = await Promise.all(
    (items ?? []).map(async (item) => {
      if (!item.image_path) {
        return { ...item, imageUrl: null };
      }

      try {
        const imageUrl = await createCardImageSignedUrl(
          supabase,
          item.image_path
        );

        return {
          ...item,
          imageUrl,
        };
      } catch {
        return { ...item, imageUrl: null };
      }
    })
  );

  const itemCount = itemsWithImageUrls.length;
  const hasGoalCount =
    typeof collection.goal_count === "number" && collection.goal_count > 0;
  const emptySlotCount =
    !itemsError &&
    hasGoalCount &&
    collection.goal_count > itemCount
      ? Math.floor(collection.goal_count) - itemCount
      : 0;

  const progress =
    collection.goal_count && collection.goal_count > 0
      ? Math.min(
          Math.round((itemCount / collection.goal_count) * 100),
          100
        )
      : null;

  return (
    <main className="museum-page">
      <section className="museum-collection-hero">
        <div>
          <p className="museum-kicker">나의 전시 공간</p>
          <h1 className="museum-display-title">{collection.name}</h1>
          <p className="museum-page-copy">
            {collection.description || `${itemCount}개의 수집물이 전시되어 있어요.`}
          </p>
        </div>

        <div className="museum-progress-seal" aria-label={`수집물 ${itemCount}개`}>
          <strong>{itemCount}</strong>
          <span>{collection.goal_count ? `/ ${collection.goal_count}` : "개"}</span>
          <small>{progress !== null ? `${progress}% 채움` : "현재 전시"}</small>
        </div>
      </section>

      {collection.goal_count && (
        <div className="museum-wide-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}

      <section className="museum-collection-wall" aria-label="전체 수집물">
        {itemsError && (
          <p className="museum-empty-state museum-inline-error">
            수집물을 불러오지 못했습니다. 다시 시도해주세요.
          </p>
        )}

        {!itemsError && itemCount === 0 && (
          <p className="museum-empty-state">
            아직 등록된 수집물이 없습니다.
          </p>
        )}

        {itemsWithImageUrls.map((item, index) => (
          <Link
            key={item.id}
            href={`/collections/${id}/items/${item.id}`}
            className="museum-artwork-card"
          >
            <div className="museum-artwork-image">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="(max-width: 448px) 33vw, 128px"
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
            <span className="museum-artwork-label">
              <small>수집물 {String(index + 1).padStart(3, "0")}</small>
              <strong>{item.name}</strong>
            </span>
          </Link>
        ))}

        {Array.from({ length: emptySlotCount }, (_, index) => (
          <Link
            key={`empty-slot-${index}`}
            href={`/collections/${id}/items/new`}
            aria-label={`${String(itemCount + index + 1).padStart(3, "0")} 빈 슬롯에 수집물 추가`}
            className="museum-empty-slot"
          >
            <strong>+</strong>
            <small>빈 전시 공간 {String(itemCount + index + 1).padStart(3, "0")}</small>
          </Link>
        ))}

        {(!hasGoalCount || emptySlotCount === 0) && (
          <Link
            href={`/collections/${id}/items/new`}
            aria-label="수집물 추가"
            className="museum-empty-slot"
          >
            <strong>+</strong>
            <small>수집물 추가</small>
          </Link>
        )}
      </section>

      <CollectionAnalysis
        collectionId={id}
        itemCount={itemCount}
        itemLoadingFailed={Boolean(itemsError)}
      />

      {collection.description && (
        <section className="museum-description-panel">
          <p className="museum-kicker">이 컬렉션에 대하여</p>
          <h2>컬렉션 설명</h2>
          <p>{collection.description}</p>
        </section>
      )}

      <section className="museum-danger-zone">
        <div className="museum-danger-copy">
          <strong>컬렉션 삭제</strong>
          <span>컬렉션과 이 안의 모든 수집물을 삭제합니다.</span>
        </div>
        <DeleteConfirmation
          buttonLabel="컬렉션 삭제"
          title="이 컬렉션을 삭제할까요?"
          description="컬렉션 내에 기록된 모든 수집물이 함께 삭제됩니다."
          endpoint={`/api/collections/${id}`}
          redirectTo="/"
        />
      </section>
    </main>
  );
}
