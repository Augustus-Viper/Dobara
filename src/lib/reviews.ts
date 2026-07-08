import { supabase } from "./supabase";

export interface SellerRating {
  avg_rating: number;
  review_count: number;
}

const EMPTY_RATING: SellerRating = { avg_rating: 0, review_count: 0 };

export async function fetchSellerRating(userId: string): Promise<SellerRating> {
  const { data, error } = await supabase.from("seller_ratings").select("avg_rating,review_count").eq("user_id", userId).maybeSingle();
  if (error || !data) return EMPTY_RATING;
  return data as SellerRating;
}

export interface Review {
  id: number;
  listing_id: number | null;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export async function fetchReviewsForSeller(userId: string): Promise<Review[]> {
  const { data, error } = await supabase.from("reviews").select("*").eq("reviewee_id", userId).order("created_at", { ascending: false });
  if (error) { console.error("fetchReviewsForSeller:", error.message); return []; }
  return (data ?? []) as Review[];
}

export async function submitReview(
  reviewerId: string,
  revieweeId: string,
  listingId: number | string | null,
  rating: number,
  comment: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("reviews")
    .upsert(
      { reviewer_id: reviewerId, reviewee_id: revieweeId, listing_id: listingId, rating, comment: comment || null },
      { onConflict: "reviewer_id,reviewee_id,listing_id" }
    );
  return { error: error ? error.message : null };
}
