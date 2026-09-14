import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCardThumbnailPath } from "@/lib/storage-images";

type Context = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function DELETE(_request: Request, { params }: Context) {
  const { id: collectionId, itemId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (collectionError) {
    return Response.json(
      { message: "수집물 소유권을 확인하지 못했습니다." },
      { status: 500 }
    );
  }

  if (!collection) {
    return Response.json(
      { message: "삭제할 수집물을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, image_path")
    .eq("id", itemId)
    .eq("collection_id", collectionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemError) {
    return Response.json(
      { message: "수집물 소유권을 확인하지 못했습니다." },
      { status: 500 }
    );
  }

  if (!item) {
    return Response.json(
      { message: "삭제할 수집물을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (item.image_path) {
    const [originalResult, thumbnailResult] = await Promise.all([
      supabase.storage
        .from("collection-images")
        .remove([item.image_path]),
      supabase.storage
        .from("collection-images")
        .remove([getCardThumbnailPath(item.image_path)]),
    ]);

    if (originalResult.error) {
      return Response.json(
        { message: "수집물 이미지를 삭제하지 못했습니다." },
        { status: 500 }
      );
    }

    if (thumbnailResult.error) {
      console.error(
        "Card thumbnail deletion failed:",
        thumbnailResult.error
      );
    }
  }

  const { data: deletedItem, error: deleteError } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("collection_id", collectionId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError || !deletedItem) {
    return Response.json(
      { message: "수집물을 삭제하지 못했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/");

  return Response.json({ success: true });
}
