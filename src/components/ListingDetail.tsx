"use client";
import { useState, useRef, useEffect } from "react";
import { C, SWATCHES, PKR, MEASUREMENT_FIELDS } from "@/lib/constants";
import { Listing } from "@/types/listing";
import Divider from "./Divider";
import PhotoLightbox from "./PhotoLightbox";

export default function ListingDetail({
  item,
  saved,
  onSave,
  onBack,
  onMessageSeller,
  onProposeExchange,
  onReport,
  onShare,
  onOpenSeller,
}: {
  item: Listing;
  saved: boolean;
  onSave: (id: number | string) => void;
  onBack: () => void;
  onMessageSeller: () => void;
  onProposeExchange: () => void;
  onReport: () => void;
  onShare: () => void;
  onOpenSeller: () => void;
}) {
  const drop = Math.round((1 - item.price / item.original_price) * 100);
  const meas = MEASUREMENT_FIELDS.filter(([k]) => item.measurements && (item.measurements as Record<string,number>)[k]);
  const photos = item.images ?? [];
  const [activePhoto, setActivePhoto] = useState(0);
  const multi = photos.length > 1;

  const go = (dir: number) => {
    if (!multi) return;
    setActivePhoto((p) => (p + dir + photos.length) % photos.length);
  };

  // Swipe vs tap detection on the hero
  const [lightbox, setLightbox] = useState(false);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    const dt = Date.now() - touch.current.t;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300 && photos.length > 0) setLightbox(true);
    touch.current = null;
  };

  // Preload neighbouring images so swipes feel instant
  useEffect(() => {
    if (!multi) return;
    [(activePhoto + 1) % photos.length, (activePhoto - 1 + photos.length) % photos.length].forEach((i) => {
      const im = new window.Image();
      im.src = photos[i];
    });
  }, [activePhoto, photos, multi]);

  const stop = {
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchEnd: (e: React.TouchEvent) => e.stopPropagation(),
  };
  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    [side]: 10, width: 34, height: 34, borderRadius: 999, border: "none",
    background: "rgba(255,255,255,.85)", color: C.wine, fontSize: 18,
    cursor: "pointer", display: "grid", placeItems: "center", zIndex: 2,
  });

  return (
    <div style={{ paddingBottom: 28 }}>
      {/* Hero image gallery */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          aspectRatio: "4/5",
          background: SWATCHES[item.tone] || SWATCHES.placeholder,
          overflow: "hidden",
          touchAction: "pan-y",
        }}
      >
        {photos.length > 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", width: `${photos.length * 100}%`, transform: `translateX(-${activePhoto * (100 / photos.length)}%)`, transition: "transform .32s cubic-bezier(.22,.61,.36,1)" }}>
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={item.title} decoding="async" draggable={false} style={{ width: `${100 / photos.length}%`, height: "100%", objectFit: "cover", flexShrink: 0 }} />
            ))}
          </div>
        ) : (
          <div className="db-emb" />
        )}

        {/* Arrows */}
        {multi && (
          <>
            <button aria-label="Previous photo" {...stop} onClick={() => go(-1)} style={arrowStyle("left")}>‹</button>
            <button aria-label="Next photo" {...stop} onClick={() => go(1)} style={arrowStyle("right")}>›</button>
          </>
        )}

        {/* Dot indicators */}
        {multi && (
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 2 }}>
            {photos.map((_, i) => (
              <span key={i} style={{ width: i === activePhoto ? 18 : 6, height: 6, borderRadius: 999, background: i === activePhoto ? "#fff" : "rgba(255,255,255,.55)", transition: "width .2s ease" }} />
            ))}
          </div>
        )}

        {/* Tap-to-zoom hint */}
        {photos.length > 0 && (
          <span {...stop} onClick={() => setLightbox(true)} style={{ position: "absolute", bottom: 12, right: 12, width: 30, height: 30, borderRadius: 999, background: "rgba(0,0,0,.4)", color: "#fff", display: "grid", placeItems: "center", fontSize: 14, cursor: "pointer", zIndex: 2 }}>⤢</span>
        )}

        <button {...stop}
          onClick={onBack}
          style={{
            position: "absolute", top: 14, left: 14,
            width: 38, height: 38, borderRadius: 999,
            border: "none", background: "rgba(255,255,255,.92)",
            fontSize: 18, cursor: "pointer", color: C.ink, zIndex: 2,
          }}
        >
          ←
        </button>
        <button {...stop}
          onClick={() => onSave(item.id)}
          style={{
            position: "absolute", top: 14, right: 14,
            width: 38, height: 38, borderRadius: 999,
            border: "none", background: "rgba(255,255,255,.92)",
            fontSize: 17, cursor: "pointer", color: saved ? C.wine : C.mute, zIndex: 2,
          }}
        >
          {saved ? "♥" : "♡"}
        </button>
        <button {...stop}
          onClick={onShare}
          aria-label="Share"
          style={{
            position: "absolute", top: 14, right: 60,
            width: 38, height: 38, borderRadius: 999,
            border: "none", background: "rgba(255,255,255,.92)",
            fontSize: 16, cursor: "pointer", color: C.ink, zIndex: 2,
          }}
        >
          ↗
        </button>
        <span
          style={{
            position: "absolute", bottom: 14, left: 14,
            fontFamily: "Jost", fontSize: 11, letterSpacing: 1,
            textTransform: "uppercase", color: "#fff",
            background: "rgba(0,0,0,.35)", padding: "4px 11px", borderRadius: 20,
          }}
        >
          {item.occasion}
        </span>
      </div>

      {lightbox && photos.length > 0 && (
        <PhotoLightbox photos={photos} index={activePhoto} setIndex={setActivePhoto} onClose={() => setLightbox(false)} alt={item.title} />
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 18px 0" }}>
          {photos.map((url, i) => (
            <button
              key={url}
              onClick={() => setActivePhoto(i)}
              style={{ flex: "0 0 auto", width: 56, height: 56, borderRadius: 10, overflow: "hidden", border: `2px solid ${i === activePhoto ? C.wine : C.line}`, padding: 0, cursor: "pointer", background: "#fff" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${item.title} — photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "18px 18px 0" }}>
        <h2
          style={{
            fontFamily: "Cormorant Garamond", fontSize: 28,
            fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.1,
          }}
        >
          {item.title}
        </h2>

        {/* Tags row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
          {item.colour && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:"Jost", fontSize:12, color:C.ink, border:`1px solid ${C.line}`, background:"#fff", padding:"4px 10px", borderRadius:20 }}>
              <span style={{ width:7, height:7, borderRadius:99, background:C.goldSoft }} />{item.colour}
            </span>
          )}
          <span style={{ fontFamily:"Jost", fontSize:12, color:C.ink, border:`1px solid ${C.line}`, background:"#fff", padding:"4px 10px", borderRadius:20 }}>{item.fit}</span>
          {item.open_to_exchange && (
            <span style={{ fontFamily:"Jost", fontSize:12, color:C.green, border:`1px solid ${C.green}`, padding:"4px 10px", borderRadius:20 }}>Open to exchange</span>
          )}
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
          <span style={{ fontFamily:"Jost", fontWeight:600, fontSize:23, color:C.wine }}>{PKR(item.price)}</span>
          <span style={{ fontFamily:"Jost", fontSize:14, color:C.mute, textDecoration:"line-through" }}>{PKR(item.original_price)}</span>
          <span style={{ fontFamily:"Jost", fontWeight:600, fontSize:12, color:C.wineDeep, background:C.goldSoft, padding:"3px 9px", borderRadius:6 }}>save {drop}%</span>
        </div>

        <div style={{ marginTop: 18, marginBottom: 18 }}><Divider /></div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 12px" }}>
          {([["Condition", item.condition], ["City", item.city], ["Fit type", item.fit], ["Fabric", item.fabric]] as [string,string][])
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <div style={{ fontFamily:"Jost", fontSize:10, letterSpacing:1, textTransform:"uppercase", color:C.mute }}>{k}</div>
                <div style={{ fontFamily:"Jost", fontSize:14, color:C.ink, marginTop:2 }}>{v}</div>
              </div>
            ))}
        </div>

        {/* Measurements */}
        {meas.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontFamily:"Jost", fontSize:10, letterSpacing:1, textTransform:"uppercase", color:C.mute, marginBottom:8 }}>Measurements (inches)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {meas.map(([k, label]) => (
                <div key={k} style={{ border:`1px solid ${C.line}`, borderRadius:10, padding:"8px 6px", textAlign:"center", background:"#fff" }}>
                  <div style={{ fontFamily:"Cormorant Garamond", fontSize:19, color:C.wine }}>{(item.measurements as Record<string,number>)[k]}"</div>
                  <div style={{ fontFamily:"Jost", fontSize:10.5, color:C.mute }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.can_alter && (
          <div style={{ marginTop: 14, fontFamily:"Jost", fontSize:13, color:C.green }}>✓ Can be altered or let out</div>
        )}

        {/* Seller card — tap to see their other suits */}
        <button
          onClick={item.seller_id ? onOpenSeller : undefined}
          style={{ width:"100%", textAlign:"left", marginTop:20, padding:14, border:`1px solid ${C.line}`, borderRadius:14, display:"flex", alignItems:"center", gap:12, background:"#fff", cursor: item.seller_id ? "pointer" : "default" }}
        >
          <div style={{ width:42, height:42, borderRadius:999, background:SWATCHES.wine, display:"grid", placeItems:"center", color:"#fff", fontFamily:"Cormorant Garamond", fontSize:20 }}>
            {item.seller_name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily:"Jost", fontSize:14, color:C.ink, display:"flex", alignItems:"center", gap:6 }}>
              {item.seller_name}
              {item.seller_verified && (
                <span style={{ fontSize:10, color:C.green, border:`1px solid ${C.green}`, padding:"1px 6px", borderRadius:20 }}>Verified</span>
              )}
            </div>
            <div style={{ fontFamily:"Jost", fontSize:12, color:C.mute, marginTop:2 }}>★ {item.seller_rating.toFixed(1)} · {item.city}</div>
          </div>
          {item.seller_id && <span style={{ color:C.mute, fontSize:18 }}>›</span>}
        </button>

        {/* CTA buttons */}
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          {item.open_to_exchange && (
            <button
              onClick={onProposeExchange}
              style={{ flex:1, padding:"14px 0", borderRadius:12, border:`1.5px solid ${C.wine}`, background:"transparent", color:C.wine, fontFamily:"Jost", fontWeight:600, fontSize:14, cursor:"pointer" }}
            >
              Propose exchange
            </button>
          )}
          <button
            onClick={onMessageSeller}
            style={{ flex:1.4, padding:"14px 0", borderRadius:12, border:"none", background:C.wine, color:"#fff", fontFamily:"Jost", fontWeight:600, fontSize:14, cursor:"pointer" }}
          >
            Message seller
          </button>
        </div>

        {item.whatsapp && (
          <button
            onClick={() => {
              const num = normalizePkPhone(item.whatsapp!);
              const text = encodeURIComponent(`Assalam o alaikum! Is your "${item.title}" (${PKR(item.price)}) still available on Dobara?`);
              window.open(`https://wa.me/${num}?text=${text}`, "_blank");
            }}
            style={{ width:"100%", marginTop:10, padding:"13px 0", borderRadius:12, border:"none", background:"#25D366", color:"#fff", fontFamily:"Jost", fontWeight:600, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
          >
            <span style={{ fontSize:16 }}>📱</span> WhatsApp seller
          </button>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={onReport} style={{ background: "none", border: "none", color: C.mute, fontFamily: "Jost", fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>
            ⚐ Report this listing
          </button>
        </div>
      </div>
    </div>
  );
}

// Turn a locally-typed Pakistani number into wa.me international format
function normalizePkPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = "92" + d.slice(1);
  else if (d.length === 10 && d.startsWith("3")) d = "92" + d;
  return d;
}
