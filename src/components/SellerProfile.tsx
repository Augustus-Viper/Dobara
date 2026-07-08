"use client";
import { useEffect, useState } from "react";
import { C, SWATCHES } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { fetchListingsBySeller } from "@/lib/listings";
import { fetchSellerRating, fetchReviewsForSeller, SellerRating, Review } from "@/lib/reviews";
import ListingCard from "./ListingCard";
import Divider from "./Divider";
import { ListingGridSkeleton } from "./Skeleton";

export default function SellerProfile({
  sellerId,
  saved,
  onSave,
  onOpen,
  onBack,
}: {
  sellerId: string;
  saved: Set<number | string>;
  onSave: (id: number | string) => void;
  onOpen: (l: Listing) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<Listing[] | null>(null);
  const [rating, setRating] = useState<SellerRating | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    fetchListingsBySeller(sellerId).then(setItems);
    fetchSellerRating(sellerId).then(setRating);
    fetchReviewsForSeller(sellerId).then(setReviews);
  }, [sellerId]);

  const head = items && items[0];
  const name = head?.seller_name ?? "Seller";
  const verified = head?.seller_verified ?? false;
  const city = head?.city ?? "";

  return (
    <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 56, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0, background: C.ivory }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
        <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine }}>Seller</div>
      </header>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "18px 18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 58, height: 58, borderRadius: 999, background: SWATCHES.wine, display: "grid", placeItems: "center", color: "#fff", fontFamily: "Cormorant Garamond", fontSize: 26 }}>
              {(name[0] || "?").toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
                {name}
                {verified && <span style={{ fontFamily: "Jost", fontSize: 10, color: C.green, border: `1px solid ${C.green}`, padding: "1px 6px", borderRadius: 20 }}>Verified</span>}
              </div>
              <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginTop: 2 }}>
                {rating && rating.review_count > 0 ? `★ ${rating.avg_rating.toFixed(1)} (${rating.review_count} review${rating.review_count === 1 ? "" : "s"})` : "New seller"}{city ? ` · ${city}` : ""}
              </div>
            </div>
          </div>
          <Divider />
          <div style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute }}>
            {items ? `${items.length} suit${items.length === 1 ? "" : "s"} for sale` : " "}
          </div>
        </div>

        {items === null ? (
          <ListingGridSkeleton count={2} />
        ) : items.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 14px 24px" }}>
            {items.map((it) => (
              <ListingCard key={it.id} item={it} saved={saved.has(it.id)} onSave={onSave} onOpen={() => onOpen(it)} />
            ))}
          </div>
        ) : (
          <div style={{ padding: "40px 30px", textAlign: "center", fontFamily: "Jost", fontSize: 14, color: C.mute }}>No suits on sale right now.</div>
        )}

        {reviews && reviews.length > 0 && (
          <div style={{ padding: "0 18px 24px" }}>
            <Divider />
            <div style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 10 }}>Reviews</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reviews.slice(0, 15).map((r) => (
                <div key={r.id} style={{ padding: 12, border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: C.gold, fontSize: 14 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span style={{ fontFamily: "Jost", fontSize: 10.5, color: C.mute }}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 1.4 }}>{r.comment}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
