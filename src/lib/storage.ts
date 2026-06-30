import { supabase } from "./supabase";

const BUCKET = "listing-photos";
const MAX_DIM = 1400;       // longest side, in pixels
const JPEG_QUALITY = 0.82;

// Shrink + compress a photo in the browser before upload, so it loads fast.
// Falls back to the original file if anything goes wrong.
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_DIM || height > MAX_DIM) {
      const scale = MAX_DIM / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", JPEG_QUALITY)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

// Upload one image file and return its public URL
export async function uploadListingPhoto(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "That file isn't an image" };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { url: null, error: "Photo is too large (max 25MB)" };
  }

  const blob = await compressImage(file);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
