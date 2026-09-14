import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCardThumbnailPath } from "@/lib/storage-images";

type Context = {
  params: Promise<{ id: string }>;
};

const STORAGE_DELETE_BATCH_SIZE = 100;

export async function DELETE(_request: Request, { params }: Context) {
  const { id: collectionId } = await params;
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
      { message: "컬렉션 소유권을 확인하지 못했습니다." },
      { status: 500 }
    );
  }

  if (!collection) {
    return Response.json(
      { message: "삭제할 컬렉션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("image_path")
    .eq("collection_id", collectionId)
    .eq("user_id", user.id);

  if (itemsError) {
    return Response.json(
      { message: "컬렉션의 수집물을 확인하지 못했습니다." },
      { status: 500 }
    );
  }

  const imagePaths = [
    ...new Set(
      (items ?? [])
        .map((item) => item.image_path)
        .filter((path): path is string => typeof path === "string")
    ),
  ];
  const thumbnailPaths = imagePaths.map(getCardThumbnailPath);

  for (let index = 0; index < imagePaths.length; index += STORAGE_DELETE_BATCH_SIZE) {
    const { error: storageError } = await supabase.storage
      .from("collection-images")
      .remove(imagePaths.slice(index, index + STORAGE_DELETE_BATCH_SIZE));

    if (storageError) {
      return Response.json(
        { message: "컬렉션의 수집물 이미지를 삭제하지 못했습니다." },
        { status: 500 }
      );
    }
  }

  for (
    let index = 0;
    index < thumbnailPaths.length;
    index += STORAGE_DELETE_BATCH_SIZE
  ) {
    const { error: thumbnailStorageError } = await supabase.storage
      .from("collection-images")
      .remove(thumbnailPaths.slice(index, index + STORAGE_DELETE_BATCH_SIZE));

    if (thumbnailStorageError) {
      console.error(
        "Collection card thumbnail deletion failed:",
        thumbnailStorageError
      );
    }
  }

  const { error: itemDeleteError } = await supabase
    .from("items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", user.id);

  if (itemDeleteError) {
    return Response.json(
      { message: "컬렉션의 수집물을 삭제하지 못했습니다." },
      { status: 500 }
    );
  }

  const { data: deletedCollection, error: collectionDeleteError } =
    await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

  if (collectionDeleteError || !deletedCollection) {
    return Response.json(
      { message: "컬렉션을 삭제하지 못했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }

  revalidatePath("/");

  return Response.json({ success: true });
}
