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

const CHAT_BUCKET = "chat-media";
const rand = () => Math.random().toString(36).slice(2, 8);

// Upload a photo shared in chat (compressed)
export async function uploadChatImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  if (!file.type.startsWith("image/")) return { url: null, error: "That file isn't an image" };
  if (file.size > 25 * 1024 * 1024) return { url: null, error: "Photo is too large (max 25MB)" };
  const blob = await compressImage(file);
  const path = `${userId}/${Date.now()}-${rand()}.jpg`;
  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, blob, { cacheControl: "3600", contentType: "image/jpeg" });
  if (error) return { url: null, error: error.message };
  return { url: supabase.storage.from(CHAT_BUCKET).getPublicUrl(path).data.publicUrl, error: null };
}

// Upload a recorded voice message
export async function uploadChatVoice(
  blob: Blob,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  if (blob.size > 15 * 1024 * 1024) return { url: null, error: "Voice note is too long" };
  const ext = blob.type.includes("mp4") || blob.type.includes("mpeg") ? "m4a" : "webm";
  const path = `${userId}/${Date.now()}-${rand()}.${ext}`;
  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, blob, { cacheControl: "3600", contentType: blob.type || "audio/webm" });
  if (error) return { url: null, error: error.message };
  return { url: supabase.storage.from(CHAT_BUCKET).getPublicUrl(path).data.publicUrl, error: null };
}
