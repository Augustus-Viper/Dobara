"use client";
import { useEffect, useState } from "react";
import { C, SWATCHES } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { fetchListingsBySeller } from "@/lib/listings";
import ListingCard from "./ListingCard";
import Divider from "./Divider";

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

  useEffect(() => {
    fetchListingsBySeller(sellerId).then(setItems);
  }, [sellerId]);

  const head = items && items[0];
  const name = head?.seller_name ?? "Seller";
  const rating = head?.seller_rating ?? 5.0;
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
              <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginTop: 2 }}>★ {rating.toFixed(1)}{city ? ` · ${city}` : ""}</div>
            </div>
          </div>
          <Divider />
          <div style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute }}>
            {items ? `${items.length} suit${items.length === 1 ? "" : "s"} for sale` : "Loading…"}
          </div>
        </div>

        {items && items.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 14px 24px" }}>
            {items.map((it) => (
              <ListingCard key={it.id} item={it} saved={saved.has(it.id)} onSave={onSave} onOpen={() => onOpen(it)} />
            ))}
          </div>
        ) : items ? (
          <div style={{ padding: "40px 30px", textAlign: "center", fontFamily: "Jost", fontSize: 14, color: C.mute }}>No suits on sale right now.</div>
        ) : null}
      </div>
    </div>
  );
}
