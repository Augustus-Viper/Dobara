import { supabase } from "./supabase";
import type { Listing } from "@/types/listing";

// Fetch listings for the public Browse page — only ACTIVE ones (hide sold)
export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchListings error:", error.message);
    return [];
  }
  return (data ?? []) as Listing[];
}

// How many suits sold in the last 7 days — social-proof stat on Browse
export async function fetchSoldThisWeek(): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count, error } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "sold")
    .gte("sold_at", weekAgo);
  if (error) { console.error("fetchSoldThisWeek:", error.message); return 0; }
  return count ?? 0;
}

// Prices of recently sold suits for the same occasion — used as a pricing hint while listing
export async function fetchSoldPrices(occasion: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("price")
    .eq("status", "sold")
    .eq("occasion", occasion)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) { console.error("fetchSoldPrices:", error.message); return []; }
  return (data ?? []).map((r) => r.price as number).filter((p) => typeof p === "number");
}

// Bump a listing's view counter (fire-and-forget; ignores failures)
export async function incrementViews(id: number | string): Promise<void> {
  const { error } = await supabase.rpc("increment_listing_views", { lid: id });
  if (error) console.error("incrementViews:", error.message);
}

// View + save counts for the logged-in seller's OWN listings
export interface ListingStat { listing_id: number; views: number; saves: number; }
export async function fetchMyListingStats(): Promise<Map<number | string, ListingStat>> {
  const { data, error } = await supabase.rpc("get_my_listing_stats");
  if (error) { console.error("fetchMyListingStats:", error.message); return new Map(); }
  const map = new Map<number | string, ListingStat>();
  (data ?? []).forEach((r: ListingStat) => map.set(r.listing_id, r));
  return map;
}

// Fetch one listing by id (any status) — used for shared links
export async function fetchListingById(id: number | string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) { console.error("fetchListingById:", error.message); return null; }
  return (data as Listing) ?? null;
}

// Fetch the logged-in user's OWN listings (active + sold), newest first
export async function fetchMyListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchMyListings error:", error.message);
    return [];
  }
  return (data ?? []) as Listing[];
}

// A seller's public (active) listings
export async function fetchListingsBySeller(sellerId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchListingsBySeller:", error.message); return []; }
  return (data ?? []) as Listing[];
}

// Update an existing listing (only the editable fields)
export async function updateListing(
  id: number | string,
  data: Omit<Listing, "id">
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("listings")
    .update({
      title: data.title,
      occasion: data.occasion,
      colour: data.colour,
      fit: data.fit,
      measurements: data.measurements,
      can_alter: data.can_alter,
      city: data.city,
      original_price: data.original_price,
      price: data.price,
      condition: data.condition,
      open_to_exchange: data.open_to_exchange,
      images: data.images ?? [],
      size: data.size ?? null,
      whatsapp: data.whatsapp || null,
    })
    .eq("id", id);
  return { error: error ? error.message : null };
}

// Mark a listing sold / active
export async function setListingStatus(
  id: number | string,
  status: "active" | "sold"
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("listings").update({ status }).eq("id", id);
  return { error: error ? error.message : null };
}

// Permanently delete a listing
export async function deleteListing(id: number | string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  return { error: error ? error.message : null };
}

// Insert a new listing for the logged-in seller
export async function createListing(
  data: Omit<Listing, "id">,
  sellerId: string,
  sellerName: string
): Promise<{ listing: Listing | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from("listings")
    .insert({
      title: data.title,
      occasion: data.occasion,
      tone: data.tone,
      colour: data.colour,
      fit: data.fit,
      measurements: data.measurements,
      can_alter: data.can_alter,
      city: data.city,
      original_price: data.original_price,
      price: data.price,
      condition: data.condition,
      open_to_exchange: data.open_to_exchange,
      fabric: data.fabric,
      images: data.images ?? [],
      size: data.size ?? null,
      whatsapp: data.whatsapp || null,
      seller_name: sellerName,
      seller_rating: 5.0,
      seller_verified: false,
      seller_id: sellerId,
      status: data.status || "active",
    })
    .select()
    .single();

  if (error) return { listing: null, error: error.message };
  return { listing: row as Listing, error: null };
}
