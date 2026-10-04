/**
 * Proportional image scaling and diptych splitter.
 * Preserves 100% natural proportions (square, 4:5, 9:16, landscape)
 * using bounding-box scaling without forced cropping or stretching.
 * Strict TypeScript: zero 'any', zero '@ts-ignore'.
 */

const MAX_BOUND_W = 640;
const MAX_BOUND_H = 960;
const JPEG_QUALITY = 0.82;

export interface DualViewResult {
  front: string;
  back?: string;
  isDual: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Computes target dimensions fitting within the bounding box while preserving aspect ratio */
export function calculateFitDimensions(
  width: number,
  height: number,
  maxW: number = MAX_BOUND_W,
  maxH: number = MAX_BOUND_H
): ImageDimensions {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  const scale = Math.min(1, maxW / width, maxH / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Processes any image maintaining exact natural proportions */
export async function processProportionalImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error al leer archivo de imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Archivo de imagen no válido"));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const target = calculateFitDimensions(w, h);

        const canvas = document.createElement("canvas");
        canvas.width = target.width;
        canvas.height = target.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Error al inicializar canvas 2D"));

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, target.width, target.height);

        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Slices a wide dual photo into Front (left) and Back (right), preserving natural aspect ratio */
export async function splitDualDiptych(file: File): Promise<{ front: string; back: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error al leer archivo de imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Archivo de imagen no válido"));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const halfW = Math.floor(w / 2);

        const renderHalf = (startX: number, sliceW: number): string => {
          const target = calculateFitDimensions(sliceW, h);

          const canvas = document.createElement("canvas");
          canvas.width = target.width;
          canvas.height = target.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Error al inicializar canvas 2D");

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, startX, 0, sliceW, h, 0, 0, target.width, target.height);

          return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        };

        const front = renderHalf(0, halfW);
        const back = renderHalf(halfW, w - halfW);
        resolve({ front, back });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Compatibility aliases maintaining exact existing imports */
export const cropCenter916 = processProportionalImage;
export const processSingleImage = processProportionalImage;

export async function processGarmentImage(file: File): Promise<DualViewResult> {
  const result = await splitDualDiptych(file);
  return { front: result.front, back: result.back, isDual: true };
}
