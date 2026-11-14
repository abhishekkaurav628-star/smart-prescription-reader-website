"use client";

/**
 * Browser-side image clean-up before OCR (OpenCV-inspired pipeline):
 * resize → grayscale → contrast normalization & illumination flattening.
 * Preserves smooth anti-aliased edges so LSTM OCR (Tesseract 5) reads accurately.
 */
export interface PreparedImage {
  /** Resized colour image — preserves original strokes and colours */
  color: HTMLCanvasElement;
  /** Illumination-flattened, contrast-boosted grayscale image for shadowed photos */
  enhanced: HTMLCanvasElement;
}

async function loadSource(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, cleanup: () => bmp.close() };
    } catch {
      /* fall back to <img> below */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not open this image. Try a JPG or PNG file."));
    img.src = url;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, cleanup: () => URL.revokeObjectURL(url) };
}

export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const { source, width, height, cleanup } = await loadSource(file);
  try {
    const longest = Math.max(width, height);
    let scale = 1;
    if (longest > 1800) scale = 1800 / longest;
    else if (longest < 1200) scale = Math.min(2.2, 1200 / longest);

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const color = document.createElement("canvas");
    color.width = w;
    color.height = h;
    const ctx = color.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is not supported in this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    return { color, enhanced: enhance(color) };
  } finally {
    cleanup();
  }
}

function enhance(src: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = src;
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const gray = new Uint8ClampedArray(w * h);
  const hist = new Uint32Array(256);

  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const g = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) | 0;
    gray[p] = g;
    hist[g]++;
  }

  // Contrast stretch between 2nd and 98th percentile
  const total = w * h;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      hi = v;
      break;
    }
  }
  const range = Math.max(1, hi - lo);
  for (let p = 0; p < gray.length; p++) {
    gray[p] = Math.min(255, Math.max(0, ((gray[p] - lo) * 255) / range));
  }

  // Integral image for local background illumination estimation
  const iw = w + 1;
  const integral = new Float64Array(iw * (h + 1));
  for (let y = 1; y <= h; y++) {
    let rowSum = 0;
    for (let x = 1; x <= w; x++) {
      rowSum += gray[(y - 1) * w + (x - 1)];
      integral[y * iw + x] = integral[(y - 1) * iw + x] + rowSum;
    }
  }

  const half = Math.max(12, Math.round(Math.min(w, h) / 18));
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(w - 1, x + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * iw + (x2 + 1)] -
        integral[y1 * iw + (x2 + 1)] -
        integral[(y2 + 1) * iw + x1] +
        integral[y1 * iw + x1];
      const localMean = Math.max(1, sum / count);
      const g = gray[y * w + x];
      // Soft adaptive normalization: whiten paper background while keeping anti-aliased ink gradients
      const normVal = Math.min(255, Math.max(0, Math.round((g / localMean) * 245)));
      const v = normVal > 218 ? 255 : Math.max(0, Math.round(((normVal - 40) * 255) / 178));
      const i = (y * w + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
  }

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.putImageData(data, 0, 0);
  return out;
}
