"use client";
import { useEffect } from "react";
import { C } from "@/lib/constants";
import Motif from "./Motif";

// Link-preview crawlers (WhatsApp etc.) read the page's meta tags and stop.
// Real visitors run this and get sent into the app, opened to the suit.
export default function ListingRedirect({ id }: { id: string }) {
  useEffect(() => {
    window.location.replace(`/?suit=${encodeURIComponent(id)}`);
  }, [id]);

  return (
    <div style={{ minHeight: "100vh", background: C.ivory, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
      <Motif size={26} />
      <div style={{ fontFamily: "Cormorant Garamond", fontSize: 26, letterSpacing: 2, color: C.wine }}>DOBARA</div>
      <p style={{ fontFamily: "Jost", fontSize: 14, color: C.mute }}>Opening this suit…</p>
      <a href={`/?suit=${encodeURIComponent(id)}`} style={{ fontFamily: "Jost", fontSize: 14, color: C.wine, fontWeight: 600 }}>
        Tap here if it doesn&apos;t open
      </a>
    </div>
  );
}
