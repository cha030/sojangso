import type { SupabaseClient } from "@supabase/supabase-js";

const COLLECTION_IMAGES_BUCKET = "collection-images";
const SIGNED_URL_EXPIRES_IN = 60 * 60;

export function getCardThumbnailPath(imagePath: string) {
  return `${imagePath}.card-thumbnail.jpg`;
}

export async function createCardThumbnailSignedUrls(
  supabase: SupabaseClient,
  imagePaths: string[]
): Promise<Map<string, string>> {
  const imagePathByThumbnailPath = new Map(
    imagePaths.map((imagePath) => [getCardThumbnailPath(imagePath), imagePath])
  );
  const signedUrlByImagePath = new Map<string, string>();

  if (imagePathByThumbnailPath.size === 0) {
    return signedUrlByImagePath;
  }

  try {
    const { data, error } = await supabase.storage
      .from(COLLECTION_IMAGES_BUCKET)
      .createSignedUrls(
        [...imagePathByThumbnailPath.keys()],
        SIGNED_URL_EXPIRES_IN
      );

    if (error || !data) {
      return signedUrlByImagePath;
    }

    data.forEach((result) => {
      if (result.error || !result.path || !result.signedUrl) return;

      const imagePath = imagePathByThumbnailPath.get(result.path);

      if (imagePath) {
        signedUrlByImagePath.set(imagePath, result.signedUrl);
      }
    });
  } catch {
    return signedUrlByImagePath;
  }

  return signedUrlByImagePath;
}

export async function createCardImageSignedUrl(
  supabase: SupabaseClient,
  imagePath: string
): Promise<string | null> {
  const thumbnailPath = getCardThumbnailPath(imagePath);

  try {
    const { data, error } = await supabase.storage
      .from(COLLECTION_IMAGES_BUCKET)
      .createSignedUrls(
        [thumbnailPath, imagePath],
        SIGNED_URL_EXPIRES_IN
      );

    if (!error) {
      const thumbnailUrl = data.find(
        (result) => result.path === thumbnailPath
      )?.signedUrl;
      const originalUrl = data.find(
        (result) => result.path === imagePath
      )?.signedUrl;

      return thumbnailUrl ?? originalUrl ?? null;
    }
  } catch {
    // 일괄 서명에 실패하면 기존 원본 signed URL 생성 방식으로 다시 시도한다.
  }

  try {
    const { data, error } = await supabase.storage
      .from(COLLECTION_IMAGES_BUCKET)
      .createSignedUrl(imagePath, SIGNED_URL_EXPIRES_IN);

    return error ? null : data.signedUrl;
  } catch {
    return null;
  }
}
