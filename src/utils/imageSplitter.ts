export interface DualViewResult {
  front: string; // Base64 data URL (9:16)
  back?: string; // Base64 data URL (9:16)
  isDual: boolean;
}

/**
 * Pure client-side utility using HTML5 Canvas to split a wide dual-view image
 * (like Filipina Itamae or Mandil Jardín) into two 9:16 vertical images,
 * and compress single images to 500px wide 9:16.
 */
export async function processGarmentImage(file: File): Promise<DualViewResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error reading image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const aspectRatio = w / h;

        // If aspect ratio > 1.1, treat as wide Dual-View diptych (Left = Front, Right = Back)
        const isDual = aspectRatio > 1.1;

        const targetW = 500;
        const targetH = Math.round(500 * (16 / 9)); // 889px for strict 9:16

        if (isDual) {
          const halfW = w / 2;

          // 1. Process Front (Left Half)
          const canvasFront = document.createElement('canvas');
          canvasFront.width = targetW;
          canvasFront.height = targetH;
          const ctxF = canvasFront.getContext('2d');
          if (!ctxF) return reject(new Error('Canvas context unavailable'));
          ctxF.drawImage(img, 0, 0, halfW, h, 0, 0, targetW, targetH);
          const front = canvasFront.toDataURL('image/jpeg', 0.85);

          // 2. Process Back (Right Half)
          const canvasBack = document.createElement('canvas');
          canvasBack.width = targetW;
          canvasBack.height = targetH;
          const ctxB = canvasBack.getContext('2d');
          if (!ctxB) return reject(new Error('Canvas context unavailable'));
          ctxB.drawImage(img, halfW, 0, halfW, h, 0, 0, targetW, targetH);
          const back = canvasBack.toDataURL('image/jpeg', 0.85);

          resolve({ front, back, isDual: true });
        } else {
          // Single Image -> Center crop to 9:16
          const canvasSingle = document.createElement('canvas');
          canvasSingle.width = targetW;
          canvasSingle.height = targetH;
          const ctxS = canvasSingle.getContext('2d');
          if (!ctxS) return reject(new Error('Canvas context unavailable'));

          ctxS.drawImage(img, 0, 0, w, h, 0, 0, targetW, targetH);
          const front = canvasSingle.toDataURL('image/jpeg', 0.85);
          resolve({ front, isDual: false });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Processes a single uploaded file into a 9:16 vertical card.
 */
export async function processSingleImage(file: File): Promise<string> {
  const result = await processGarmentImage(file);
  return result.front;
}
