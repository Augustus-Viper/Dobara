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
      whatsapp: data.whatsapp || null,
      seller_name: sellerName,
      seller_rating: 5.0,
      seller_verified: false,
      seller_id: sellerId,
    })
    .select()
    .single();

  if (error) return { listing: null, error: error.message };
  return { listing: row as Listing, error: null };
}
