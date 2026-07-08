"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { C } from "@/lib/constants";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
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
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: 2, color: C.wine }}>DOBARA</div>
          <p style={{ fontSize: 15, color: C.ink, maxWidth: 320 }}>
            Something went wrong on our end. Nothing you did caused this.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
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
        </div>
      </body>
    </html>
  );
}
