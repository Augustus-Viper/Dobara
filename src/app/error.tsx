"use client";
import { useEffect } from "react";
import { C } from "@/lib/constants";
import Motif from "@/components/Motif";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
        Something went wrong on our end. Nothing you did caused this.
      </p>
      <button
        onClick={() => unstable_retry()}
        style={{
          fontFamily: "Jost",
          fontSize: 14,
          fontWeight: 600,
          color: "#fff",
          background: C.wine,
          border: "none",
          borderRadius: 999,
          padding: "10px 24px",
          marginTop: 4,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
      <a href="/" style={{ fontFamily: "Jost", fontSize: 14, color: C.mute, marginTop: 4 }}>
        Or go back home
      </a>
    </div>
  );
}
