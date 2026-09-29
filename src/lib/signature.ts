/**
 * Utility to process custom uploaded handwritten signatures.
 * Automatically samples the paper lightness, removes the paper background (transparent alpha),
 * sharpens strokes into pure crisp black ink (#000000), and auto-crops excess margins.
 */
export async function removeSignatureBackground(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Sample boundary pixels (edges & corners) to detect average background brightness
        let bgLumSum = 0;
        let bgCount = 0;
        const step = Math.max(1, Math.floor(width / 25));
        for (let x = 0; x < width; x += step) {
          const iTop = x * 4;
          bgLumSum += 0.299 * data[iTop] + 0.587 * data[iTop + 1] + 0.114 * data[iTop + 2];
          const iBot = ((height - 1) * width + x) * 4;
          bgLumSum += 0.299 * data[iBot] + 0.587 * data[iBot + 1] + 0.114 * data[iBot + 2];
          bgCount += 2;
        }
        for (let y = 0; y < height; y += step) {
          const iLeft = (y * width) * 4;
          bgLumSum += 0.299 * data[iLeft] + 0.587 * data[iLeft + 1] + 0.114 * data[iLeft + 2];
          const iRight = (y * width + (width - 1)) * 4;
          bgLumSum += 0.299 * data[iRight] + 0.587 * data[iRight + 1] + 0.114 * data[iRight + 2];
          bgCount += 2;
        }
        const avgBgLum = bgCount > 0 ? bgLumSum / bgCount : 240;

        // Dynamic thresholds relative to detected background brightness
        const highThresh = Math.max(170, Math.min(250, avgBgLum - 15));
        const lowThresh = Math.max(50, Math.min(150, highThresh - 65));

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a === 0) continue;

          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          if (lum >= highThresh) {
            // Paper background -> transparent
            data[i + 3] = 0;
          } else if (lum <= lowThresh) {
            // Dark ink -> solid black
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
          } else {
            // Anti-aliased stroke edge
            const t = (highThresh - lum) / (highThresh - lowThresh);
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = Math.round(t * 255);
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Auto-crop to content bounding box with comfortable padding
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let hasInk = false;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 20) {
              hasInk = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (hasInk && maxX > minX && maxY > minY) {
          const pad = 20;
          const cropX = Math.max(0, minX - pad);
          const cropY = Math.max(0, minY - pad);
          const cropW = Math.min(width - cropX, maxX - minX + pad * 2);
          const cropH = Math.min(height - cropY, maxY - minY + pad * 2);

          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext("2d");
          if (cropCtx) {
            cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            resolve(cropCanvas.toDataURL("image/png"));
            return;
          }
        }

        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}
