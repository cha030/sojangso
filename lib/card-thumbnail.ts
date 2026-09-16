const CARD_THUMBNAIL_MAX_LONG_EDGE = 640;
const CARD_THUMBNAIL_QUALITY = 0.82;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

function loadImageElement(file: File): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지 크기를 확인할 수 없습니다."));
        return;
      }

      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => URL.revokeObjectURL(objectUrl),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };

    image.src = objectUrl;
  });
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });

      if (bitmap.width && bitmap.height) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          dispose: () => bitmap.close(),
        };
      }

      bitmap.close();
    } catch {
      // ImageBitmap으로 읽지 못한 이미지는 Image 요소로 다시 시도한다.
    }
  }

  return loadImageElement(file);
}

function encodeThumbnail(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/jpeg") {
          reject(new Error("썸네일을 JPEG로 변환할 수 없습니다."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      CARD_THUMBNAIL_QUALITY
    );
  });
}

export async function createCardThumbnail(file: File): Promise<File> {
  const decodedImage = await decodeImage(file);

  try {
    const scale = Math.min(
      1,
      CARD_THUMBNAIL_MAX_LONG_EDGE /
        Math.max(decodedImage.width, decodedImage.height)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decodedImage.width * scale));
    canvas.height = Math.max(1, Math.round(decodedImage.height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("썸네일 처리를 시작할 수 없습니다.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decodedImage.source, 0, 0, canvas.width, canvas.height);

    const blob = await encodeThumbnail(canvas);

    return new File([blob], "card-thumbnail.jpg", {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    decodedImage.dispose();
  }
}
