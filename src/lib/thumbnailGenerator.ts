import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

/**
 * Generates a compressed thumbnail Blob from an image File using Canvas API.
 * Target size: 400 x 520 px maximum, JPEG quality 0.82.
 */
export async function generateImageThumbnail(
  file: File,
  maxWidth = 400,
  maxHeight = 520
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}

/** Returns true if the file is a raster image that can be thumbnailed in-browser. */
export function isThumbableImage(file: File): boolean {
  return /^image\/(jpeg|png|webp|gif)$/i.test(file.type);
}

/** Returns true if the file is a PDF. */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Generates a thumbnail from the first page of a PDF file.
 * Uses pdf.js to render page 1 to canvas, then converts to JPEG blob.
 */
export async function generatePdfThumbnail(
  file: File,
  maxWidth = 400,
  maxHeight = 520
): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    // Calculate scale to fit within max dimensions
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height, 2);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(scaledViewport.width);
    canvas.height = Math.round(scaledViewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
    }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
    });
  } catch (e) {
    console.warn('PDF thumbnail generation failed:', e);
    return null;
  }
}

/**
 * Generate a thumbnail for either an image or PDF file.
 */
export async function generateThumbnail(
  file: File,
  maxWidth = 400,
  maxHeight = 520
): Promise<Blob | null> {
  if (isThumbableImage(file)) {
    return generateImageThumbnail(file, maxWidth, maxHeight);
  }
  if (isPdfFile(file)) {
    return generatePdfThumbnail(file, maxWidth, maxHeight);
  }
  return null;
}
