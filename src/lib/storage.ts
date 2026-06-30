import { supabase } from "./supabase";

const BUCKET = "listing-photos";

// Upload one image file and return its public URL
export async function uploadListingPhoto(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  // Basic guards
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "That file isn't an image" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: "Photo is too large (max 5MB)" };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
