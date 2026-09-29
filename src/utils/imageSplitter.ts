export interface DualViewResult {
  front: string;
  back?: string;
  isDual: boolean;
}

export async function processGarmentImage(file: File): Promise<DualViewResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error reading image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const isDual = (w / h) > 1.1;

        const targetW = 500;
        const targetH = Math.round(500 * (16 / 9)); // 889px (strict 9:16)
        const targetAspect = 9 / 16;

        if (isDual) {
          const halfW = w / 2;
          
          // Calculate proportional 9:16 crop window for each half
          let cropW = h * targetAspect;
          let cropH = h;
          if (cropW > halfW) {
            cropW = halfW;
            cropH = cropW / targetAspect;
          }

          // 1. Front View (Left Half center)
          const centerFrontX = halfW / 2;
          const centerFrontY = h / 2;
          const srcFrontX = Math.max(0, centerFrontX - (cropW / 2));
          const srcFrontY = Math.max(0, centerFrontY - (cropH / 2));

          const canvasFront = document.createElement('canvas');
          canvasFront.width = targetW;
          canvasFront.height = targetH;
          const ctxF = canvasFront.getContext('2d');
          if (!ctxF) return reject(new Error('Canvas error'));
          ctxF.drawImage(img, srcFrontX, srcFrontY, cropW, cropH, 0, 0, targetW, targetH);
          const front = canvasFront.toDataURL('image/jpeg', 0.85);

          // 2. Back View (Right Half center)
          const centerBackX = halfW + (halfW / 2);
          const centerBackY = h / 2;
          const srcBackX = Math.min(w - cropW, Math.max(halfW, centerBackX - (cropW / 2)));
          const srcBackY = Math.max(0, centerBackY - (cropH / 2));

          const canvasBack = document.createElement('canvas');
          canvasBack.width = targetW;
          canvasBack.height = targetH;
          const ctxB = canvasBack.getContext('2d');
          if (!ctxB) return reject(new Error('Canvas error'));
          ctxB.drawImage(img, srcBackX, srcBackY, cropW, cropH, 0, 0, targetW, targetH);
          const back = canvasBack.toDataURL('image/jpeg', 0.85);

          resolve({ front, back, isDual: true });
        } else {
          // Single Image: Proportional center crop
          let cropW = h * targetAspect;
          let cropH = h;
          if (cropW > w) {
            cropW = w;
            cropH = cropW / targetAspect;
          }
          const srcX = (w - cropW) / 2;
          const srcY = (h - cropH) / 2;

          const canvasSingle = document.createElement('canvas');
          canvasSingle.width = targetW;
          canvasSingle.height = targetH;
          const ctxS = canvasSingle.getContext('2d');
          if (!ctxS) return reject(new Error('Canvas error'));
          ctxS.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, targetW, targetH);
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
 * Processes a single uploaded file into a proportional 9:16 vertical card.
 */
export async function processSingleImage(file: File): Promise<string> {
  const result = await processGarmentImage(file);
  return result.front;
}
