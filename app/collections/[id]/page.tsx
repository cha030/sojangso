import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();

  if (!collection) {
    notFound();
  }

  const { data: items } = await supabase
    .from("items")
    .select("id, name, image_path, created_at")
    .eq("collection_id", id)
    .order("created_at", { ascending: false });

  const itemCount = items?.length ?? 0;

  const progress =
    collection.goal_count && collection.goal_count > 0
      ? Math.min(
          Math.round((itemCount / collection.goal_count) * 100),
          100
        )
      : null;

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <Link href="/" className="text-sm">
        ← 뒤로
      </Link>

      <section className="mt-6">
        <h1 className="text-2xl font-bold">{collection.name}</h1>

        {collection.goal_count ? (
          <>
            <div className="mt-3 flex justify-between text-sm">
              <span>
                {itemCount} / {collection.goal_count}
              </span>
              <span>{progress}%</span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-black"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            {itemCount}개 보유
          </p>
        )}
      </section>

      <section className="mt-8 grid grid-cols-3 gap-3">
        {items?.map((item) => (
          <div key={item.id}>
            <div className="aspect-square rounded-xl bg-gray-100" />
            <p className="mt-2 truncate text-sm">{item.name}</p>
          </div>
        ))}

        <Link
          href={`/collections/${id}/items/new`}
          className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed text-3xl text-gray-400"
        >
          +
        </Link>
      </section>

      {itemCount >= 3 && (
        <button className="mt-10 w-full rounded-xl border p-4 font-semibold">
          AI 분석
        </button>
      )}

      {collection.description && (
        <section className="mt-8 border-t pt-6">
          <h2 className="font-semibold">설명</h2>
          <p className="mt-2 text-sm text-gray-600">
            {collection.description}
          </p>
        </section>
      )}
    </main>
  );
}