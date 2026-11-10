// Resize a photo in the browser before upload: longest side 1400 px, WebP (JPEG where the
// browser can't encode WebP, e.g. older Safari). Matches scripts/upload-photos.mjs.
const MAX_SIDE = 1400;

export type ResizedPhoto = { blob: Blob; width: number; height: number; url: string };

export async function resizePhoto(file: File): Promise<ResizedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) throw new Error("unreadable");
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("unreadable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string, quality: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
  let blob = await encode("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.85);
  if (!blob) throw new Error("unreadable");
  return { blob, width, height, url: URL.createObjectURL(blob) };
}
