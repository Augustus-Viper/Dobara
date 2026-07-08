import { C } from "@/lib/constants";
import Motif from "@/components/Motif";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.ivory,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}
    >
      <Motif size={26} />
      <div style={{ fontFamily: "Cormorant Garamond", fontSize: 26, letterSpacing: 2, color: C.wine }}>
        DOBARA
      </div>
      <p style={{ fontFamily: "Jost", fontSize: 15, color: C.ink, maxWidth: 320 }}>
        This page doesn&apos;t exist — it may have been moved or removed.
      </p>
      <a
        href="/"
        style={{
          fontFamily: "Jost",
          fontSize: 14,
          fontWeight: 600,
          color: "#fff",
          background: C.wine,
          borderRadius: 999,
          padding: "10px 24px",
          marginTop: 4,
          textDecoration: "none",
        }}
      >
        Back to Dobara
      </a>
    </div>
  );
}
