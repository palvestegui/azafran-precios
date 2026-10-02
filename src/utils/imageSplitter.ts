const TARGET_W = 500;
const TARGET_H = 889; // Strict 9:16 (500 * 16 / 9)

export interface DualViewResult {
  front: string;
  back?: string;
  isDual: boolean;
}

/** Crops a centered 9:16 vertical frame from any image (ideal for 16:9 centered studio shots) */
export async function cropCenter916(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Archivo de imagen no válido'));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const targetAspect = 9 / 16;

        let srcW = h * targetAspect;
        let srcH = h;
        if (srcW > w) {
          srcW = w;
          srcH = w / targetAspect;
        }

        // Exact horizontal & vertical center crop
        const srcX = (w - srcW) / 2;
        const srcY = (h - srcH) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = TARGET_W;
        canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, TARGET_W, TARGET_H);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Slices a wide dual photo (like Itamae or Jardín) into Front (left) and Back (right) */
export async function splitDualDiptych(file: File): Promise<{ front: string; back: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Archivo de imagen no válido'));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const halfW = w / 2;
        const targetAspect = 9 / 16;

        // Render each half with center-cropped 9:16
        const renderHalf = (startX: number): string => {
          let srcW = h * targetAspect;
          let srcH = h;
          if (srcW > halfW) {
            srcW = halfW;
            srcH = halfW / targetAspect;
          }
          const srcX = startX + (halfW - srcW) / 2;
          const srcY = (h - srcH) / 2;

          const canvas = document.createElement('canvas');
          canvas.width = TARGET_W;
          canvas.height = TARGET_H;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas error');

          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, TARGET_W, TARGET_H);
          return canvas.toDataURL('image/jpeg', 0.85);
        };

        const front = renderHalf(0);
        const back = renderHalf(halfW);
        resolve({ front, back });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Compatibility aliases */
export const processSingleImage = cropCenter916;
export async function processGarmentImage(file: File): Promise<DualViewResult> {
  const result = await splitDualDiptych(file);
  return { front: result.front, back: result.back, isDual: true };
}
