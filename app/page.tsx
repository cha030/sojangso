import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function LoadError() {
  return (
    <main className="museum-page">
      <p className="museum-kicker">SOJANGSO</p>
      <h1 className="museum-display-title">내 컬렉션</h1>
      <p className="museum-inline-error">
        컬렉션을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    </main>
  );
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, goal_count, description, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <LoadError />;
  }

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("collection_id, image_path, created_at")
    .order("created_at", { ascending: false });

  if (itemsError) {
    return <LoadError />;
  }

  const itemCounts = new Map<string, number>();
  const representativeImages = new Map<string, string>();

  items?.forEach((item) => {
    const current = itemCounts.get(item.collection_id) ?? 0;
    itemCounts.set(item.collection_id, current + 1);

    if (
      item.image_path &&
      !representativeImages.has(item.collection_id)
    ) {
      representativeImages.set(
        item.collection_id,
        item.image_path
      );
    }
  });

  const collectionsWithImages = await Promise.all(
    collections.map(async (collection) => {
      const imagePath = representativeImages.get(collection.id);

      if (!imagePath) {
        return {
          ...collection,
          imageUrl: null,
        };
      }

      try {
        const { data, error } = await supabase.storage
          .from("collection-images")
          .createSignedUrl(imagePath, 60 * 60);

        return {
          ...collection,
          imageUrl: error ? null : data.signedUrl,
        };
      } catch {
        return {
          ...collection,
          imageUrl: null,
        };
      }
    })
  );

  return (
    <main className="museum-page">
      <div className="museum-page-heading-row">
        <div>
          <p className="museum-kicker">
            {collectionsWithImages.length}개의 컬렉션
          </p>
          <h1 className="museum-display-title">내 컬렉션</h1>
          <p className="museum-page-copy">좋아하는 것을 모으는 즐거움</p>
        </div>

        <Link
          href="/collections/new"
          className="museum-primary-button museum-full-button"
        >
          + 새 컬렉션 만들기
        </Link>
      </div>

      <section className="museum-collection-grid" aria-label="내 컬렉션 목록">
        {collectionsWithImages.length === 0 ? (
          <div className="museum-empty-state">아직 컬렉션이 없습니다.</div>
        ) : (
          <>
            {collectionsWithImages.map((collection, index) => {
              const count =
                itemCounts.get(collection.id) ?? 0;

              const progress =
                collection.goal_count &&
                collection.goal_count > 0
                  ? Math.min(
                      Math.round(
                        (count / collection.goal_count) * 100
                      ),
                      100
                    )
                  : null;

              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="museum-exhibition-card"
                >
                  <div className="museum-exhibition-image">
                    {collection.imageUrl ? (
                      <img src={collection.imageUrl} alt={collection.name} />
                    ) : (
                      <span className="museum-empty-image">아직 수집물 없음</span>
                    )}
                    <span className="museum-exhibition-number" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="museum-exhibition-info">
                    <p className="museum-kicker">컬렉션</p>
                    <h2>{collection.name}</h2>

                    {collection.goal_count ? (
                      <>
                        <div className="museum-card-meta">
                          <span>{count} / {collection.goal_count}</span>
                          <strong>{progress}%</strong>
                        </div>
                        <div className="museum-progress">
                          <span style={{ width: `${progress}%` }} />
                        </div>
                      </>
                    ) : (
                      <div className="museum-card-meta"><span>{count}개 보유</span></div>
                    )}
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </section>
    </main>
  );
}
