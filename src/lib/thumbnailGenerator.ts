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
