const MAX_ANALYSIS_IMAGE_SIZE = Math.floor(3.5 * 1024 * 1024);
const PRIMARY_LONG_EDGE_STEPS = [2048, 1792, 1536, 1280];
const PRIMARY_QUALITY_STEPS = [0.92, 0.88, 0.84, 0.8, 0.74];
const FALLBACK_LONG_EDGE_STEPS = [1024, 896, 768, 640, 512, 384, 256];
const FALLBACK_QUALITY_STEPS = [0.7, 0.62, 0.54, 0.46, 0.4];

const COMPRESSION_STAGES = [
  {
    longEdges: PRIMARY_LONG_EDGE_STEPS,
    qualities: PRIMARY_QUALITY_STEPS,
  },
  {
    longEdges: FALLBACK_LONG_EDGE_STEPS,
    qualities: FALLBACK_QUALITY_STEPS,
  },
] as const;

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
      const bitmap = await createImageBitmap(file);

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
      // ImageBitmap을 지원하지 않는 이미지는 Image 요소로 다시 시도한다.
    }
  }

  return loadImageElement(file);
}

function encodeJpeg(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/jpeg") {
          reject(new Error("이미지를 JPEG로 변환할 수 없습니다."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

function getAnalysisFileName(name: string) {
  const baseName = name.replace(/\.[^/.]+$/, "") || "image";
  return `${baseName}-analysis.jpg`;
}

function getTargetDimensions(
  width: number,
  height: number,
  maxLongEdge: number
) {
  const scale = Math.min(1, maxLongEdge / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function prepareImageForAnalysis(file: File): Promise<File> {
  if (file.size <= MAX_ANALYSIS_IMAGE_SIZE) {
    return file;
  }

  let decodedImage: DecodedImage | null = null;

  try {
    decodedImage = await decodeImage(file);

    let previousDimensions = "";

    for (const stage of COMPRESSION_STAGES) {
      for (const maxLongEdge of stage.longEdges) {
        const dimensions = getTargetDimensions(
          decodedImage.width,
          decodedImage.height,
          maxLongEdge
        );
        const dimensionsKey = `${dimensions.width}x${dimensions.height}`;

        if (dimensionsKey === previousDimensions) {
          continue;
        }

        previousDimensions = dimensionsKey;

        const canvas = document.createElement("canvas");
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("이미지 처리를 시작할 수 없습니다.");
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(decodedImage.source, 0, 0, canvas.width, canvas.height);

        for (const quality of stage.qualities) {
          const blob = await encodeJpeg(canvas, quality);

          if (blob.size <= MAX_ANALYSIS_IMAGE_SIZE) {
            return new File([blob], getAnalysisFileName(file.name), {
              type: blob.type,
              lastModified: file.lastModified,
            });
          }
        }
      }
    }
  } catch {
    throw new Error(
      "사진을 AI 분석용으로 처리하지 못했습니다. 원본 사진은 그대로 두었으니 정보를 직접 입력해 등록할 수 있어요."
    );
  } finally {
    decodedImage?.dispose();
  }

  throw new Error(
    "사진을 AI 분석용 크기로 줄이지 못했습니다. 원본 사진은 그대로 두었으니 정보를 직접 입력해 등록할 수 있어요."
  );
}
