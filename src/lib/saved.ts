import { supabase } from "./supabase";

// Listing ids this user has saved
export async function fetchSavedIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) { console.error("fetchSavedIds:", error.message); return []; }
  return (data ?? []).map((r) => r.listing_id as number);
}

export async function addSaved(userId: string, listingId: number): Promise<void> {
  const { error } = await supabase
    .from("saved_listings")
    .insert({ user_id: userId, listing_id: listingId });
  if (error && !error.message.includes("duplicate")) console.error("addSaved:", error.message);
}

export async function removeSaved(userId: string, listingId: number): Promise<void> {
  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) console.error("removeSaved:", error.message);
}
