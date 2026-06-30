import { supabase } from "./supabase";
import type { Listing } from "@/types/listing";

// Fetch all listings, newest first
export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchListings error:", error.message);
    return [];
  }
  return (data ?? []) as Listing[];
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
