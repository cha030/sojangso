import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    throw new Error(error.message);
  }

  const { data: items } = await supabase
    .from("items")
    .select("collection_id");

  const itemCounts = new Map<string, number>();

  items?.forEach((item) => {
    const current = itemCounts.get(item.collection_id) ?? 0;
    itemCounts.set(item.collection_id, current + 1);
  });

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <h1 className="text-3xl font-bold">소장소</h1>
      <p className="mt-2 text-sm text-gray-500">
        좋아하는 것을 모으는 즐거움
      </p>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">내 컬렉션</h2>

        {collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
            아직 컬렉션이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => {
              const count = itemCounts.get(collection.id) ?? 0;

              const progress =
                collection.goal_count && collection.goal_count > 0
                  ? Math.min(
                      Math.round((count / collection.goal_count) * 100),
                      100
                    )
                  : null;

              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="flex items-center gap-4 rounded-2xl border p-4"
                >
                  <div className="h-20 w-20 shrink-0 rounded-xl bg-gray-100" />

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">
                      {collection.name}
                    </h3>

                    {collection.goal_count ? (
                      <>
                        <p className="mt-2 text-sm text-gray-500">
                          {count} / {collection.goal_count}
                        </p>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-black"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        {count}개 보유
                      </p>
                    )}
                  </div>

                  {progress !== null && (
                    <span className="text-sm font-medium">{progress}%</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Link
        href="/collections/new"
        className="fixed bottom-6 left-1/2 w-[calc(100%-40px)] max-w-md -translate-x-1/2 rounded-xl bg-black px-5 py-4 text-center font-semibold text-white"
      >
        + 새 컬렉션 만들기
      </Link>
    </main>
  );
}