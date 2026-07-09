"use client";
import { C, SWATCHES, PKR } from "@/lib/constants";
import { Listing } from "@/types/listing";

export default function ListingCard({
  item,
  saved,
  onSave,
  onOpen,
}: {
  item: Listing;
  saved: boolean;
  onSave: (id: number | string) => void;
  onOpen: (id: number | string) => void;
}) {
  const drop = item.original_price > 0 ? Math.round((1 - item.price / item.original_price) * 100) : 0;
  const sold = item.status === "sold";

  return (
    <button
      className="db-card"
      onClick={() => onOpen(item.id)}
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        overflow: "hidden",
        textAlign: "left",
        padding: 0,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      {/* Image / colour swatch area */}
      <div
        style={{
          position: "relative",
          aspectRatio: "3/4",
          background: SWATCHES[item.tone] || SWATCHES.placeholder,
        }}
      >
        {item.images && item.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.images[0]}
            alt={item.title}
            loading="lazy"
            decoding="async"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: sold ? 0.55 : 1 }}
          />
        ) : (
          <div className="db-emb" />
        )}

        {sold && (
          <span
            style={{
              position: "absolute", inset: 0, display: "grid", placeItems: "center",
              fontFamily: "Jost", fontWeight: 600, fontSize: 12, letterSpacing: 1.5,
              textTransform: "uppercase", color: "#fff",
            }}
          >
            <span style={{ background: "rgba(43,15,25,.72)", padding: "5px 14px", borderRadius: 20 }}>Sold</span>
          </span>
        )}

        {/* Occasion badge */}
        <span
          style={{
            position: "absolute", top: 8, left: 8,
            fontFamily: "Jost", fontSize: 10, letterSpacing: 1,
            textTransform: "uppercase", color: "#fff",
            background: "rgba(0,0,0,.32)", padding: "3px 8px",
            borderRadius: 20, backdropFilter: "blur(2px)",
          }}
        >
          {item.occasion}
        </span>

        {/* Save heart */}
        <span
          onClick={(e) => { e.stopPropagation(); onSave(item.id); }}
          role="button"
          aria-label="Save"
          style={{
            position: "absolute", top: 6, right: 6,
            width: 30, height: 30, display: "grid", placeItems: "center",
            borderRadius: 999, background: "rgba(255,255,255,.92)", cursor: "pointer",
          }}
        >
          <span style={{ color: saved ? C.wine : C.mute, fontSize: 15, lineHeight: 1 }}>
            {saved ? "♥" : "♡"}
          </span>
        </span>

        {/* Discount badge */}
        {drop > 0 && !sold && (
          <span
            style={{
              position: "absolute", bottom: 8, left: 8,
              fontFamily: "Jost", fontWeight: 600, fontSize: 11,
              color: C.wineDeep, background: C.goldSoft,
              padding: "3px 8px", borderRadius: 6,
            }}
          >
            {drop}% off
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "10px 10px 12px" }}>
        <div
          style={{
            fontFamily: "Cormorant Garamond", fontSize: 17,
            fontWeight: 600, color: C.ink, lineHeight: 1.15,
          }}
        >
          {item.title}
        </div>
        <div style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, marginTop: 3 }}>
          {[item.fit, item.size && `Size ${item.size}`, item.city, item.condition].filter(Boolean).join(" · ")}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 7 }}>
          <span style={{ fontFamily: "Jost", fontWeight: 600, fontSize: 15, color: C.wine }}>
            {PKR(item.price)}
          </span>
          <span style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, textDecoration: "line-through" }}>
            {PKR(item.original_price)}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          {item.colour && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontFamily: "Jost", fontSize: 10.5, color: C.ink,
                border: `1px solid ${C.line}`, background: "#fff",
                padding: "2px 8px", borderRadius: 20,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 99, background: C.goldSoft }} />
              {item.colour}
            </span>
          )}
          {item.open_to_exchange && (
            <span
              style={{
                fontFamily: "Jost", fontSize: 10, letterSpacing: 0.4,
                color: C.green, border: `1px solid ${C.green}`,
                padding: "2px 7px", borderRadius: 20,
              }}
            >
              Exchange
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
