"use client";
import { useEffect, useRef, useState } from "react";

// Full-screen photo viewer with pinch + double-tap zoom, pan, and swipe.
// Works for a single image or a gallery (swipe between when length > 1).
type Gesture =
  | { mode: "pinch"; startDist: number; startScale: number }
  | { mode: "pan"; startX: number; startY: number; startTx: number; startTy: number }
  | { mode: "swipe"; startX: number; startY: number; startTx: number; startTy: number }
  | { mode: "doubletap" };

export default function PhotoLightbox({
  photos, index, setIndex, onClose, alt = "Photo",
}: {
  photos: string[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  alt?: string;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef(0);

  useEffect(() => { setScale(1); setTx(0); setTy(0); }, [index]);

  const dist = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      gesture.current = { mode: "pinch", startDist: dist(e.touches[0], e.touches[1]), startScale: scale };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      if (now - lastTap.current < 280) {
        gesture.current = { mode: "doubletap" };
      } else {
        gesture.current = scale > 1
          ? { mode: "pan", startX: t.clientX, startY: t.clientY, startTx: tx, startTy: ty }
          : { mode: "swipe", startX: t.clientX, startY: t.clientY, startTx: tx, startTy: ty };
      }
      lastTap.current = now;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch" && e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      const s = Math.min(4, Math.max(1, g.startScale * (d / g.startDist)));
      setScale(s);
      if (s === 1) { setTx(0); setTy(0); }
    } else if (g.mode === "pan" && e.touches.length === 1) {
      const t = e.touches[0];
      const maxX = ((scale - 1) * window.innerWidth) / 2;
      const maxY = ((scale - 1) * window.innerHeight) / 2;
      setTx(Math.max(-maxX, Math.min(maxX, g.startTx + (t.clientX - g.startX))));
      setTy(Math.max(-maxY, Math.min(maxY, g.startTy + (t.clientY - g.startY))));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "doubletap") {
      if (scale > 1) { setScale(1); setTx(0); setTy(0); } else setScale(2.4);
    } else if (g.mode === "swipe") {
      const t = e.changedTouches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;
      if (Math.abs(dy) > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
      else if (Math.abs(dx) > 50 && photos.length > 1) setIndex((index + (dx < 0 ? 1 : -1) + photos.length) % photos.length);
    } else if (g.mode === "pinch") {
      if (scale < 1.05) { setScale(1); setTx(0); setTy(0); }
    }
    gesture.current = null;
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ position: "fixed", inset: 0, background: "#000", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", touchAction: "none" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt={alt}
        draggable={false}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transition: gesture.current ? "none" : "transform .2s ease", userSelect: "none" }}
      />
      <button
        onClick={onClose}
        aria-label="Close"
        style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 999, border: "none", background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 22, cursor: "pointer", zIndex: 2 }}
      >
        ×
      </button>
      {photos.length > 1 && scale <= 1 && (
        <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
          {photos.map((_, i) => (
            <span key={i} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 999, background: i === index ? "#fff" : "rgba(255,255,255,.4)" }} />
          ))}
        </div>
      )}
    </div>
  );
}
