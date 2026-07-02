"use client";
import { useEffect, useState } from "react";
import { C } from "@/lib/constants";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function InstallButton({ variant = "block" }: { variant?: "block" | "header" }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    // Pick up a prompt captured before this component mounted (by the layout script)
    const early = (window as unknown as { __bipEvent?: BIPEvent }).__bipEvent;
    if (early) setDeferred(early);

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onReady = () => {
      const ev = (window as unknown as { __bipEvent?: BIPEvent }).__bipEvent;
      if (ev) setDeferred(ev);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("bipready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("bipready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already installed → don't show anything
  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      // Android / desktop Chrome — real one-tap install
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      (window as unknown as { __bipEvent?: BIPEvent | null }).__bipEvent = null;
    } else {
      // iPhone, or Android before the event fired → show guided steps
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === "header" ? (
        <button
          onClick={onClick}
          aria-label="Install Dobara"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "6px 11px", borderRadius: 999,
            border: `1px solid ${C.gold}`, background: "#fff",
            color: C.wine, fontFamily: "Jost", fontWeight: 600, fontSize: 11.5,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>⬇</span> Install
        </button>
      ) : (
        <button
          onClick={onClick}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600,
            fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⬇</span> Install Dobara app
        </button>
      )}

      {showGuide && (
        <InstallGuide isIOS={isIOS} onClose={() => setShowGuide(false)} />
      )}
    </>
  );
}

function InstallGuide({ isIOS, onClose }: { isIOS: boolean; onClose: () => void }) {
  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 999, background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 700, fontSize: 13, display: "grid", placeItems: "center" }}>{n}</div>
      <div style={{ fontFamily: "Jost", fontSize: 14, color: C.ink, lineHeight: 1.5, paddingTop: 2 }}>{children}</div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(43,15,25,.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 18, padding: "22px 20px", boxShadow: "0 20px 60px rgba(43,15,25,.4)" }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "Cormorant Garamond", fontSize: 23, fontWeight: 600, color: C.wine }}>Add Dobara to your phone</div>
          <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginTop: 2 }}>So it opens like an app, with one tap</div>
        </div>

        {isIOS ? (
          <>
            <Step n={1}>Tap the <b>Share</b> button <span style={{ display: "inline-block", border: `1px solid ${C.line}`, borderRadius: 5, padding: "0 5px", color: C.wine }}>↑</span> at the bottom of Safari</Step>
            <Step n={2}>Scroll down the list and tap <b>“Add to Home Screen”</b>.<br /><span style={{ fontSize: 12.5, color: C.mute }}>Don’t see it? Tap <b>“Edit Actions…”</b> or <b>“More”</b> at the very bottom, then find it.</span></Step>
            <Step n={3}>Tap <b>Add</b> — the gold Dobara icon appears on your home screen ✦</Step>
          </>
        ) : (
          <>
            <Step n={1}>Open your browser menu — the <b>⋮</b> (three dots), usually top-right</Step>
            <Step n={2}>Tap <b>“Install app”</b> or <b>“Add to Home screen”</b></Step>
            <Step n={3}>Tap <b>Install / Add</b> — the Dobara icon appears on your home screen ✦</Step>
          </>
        )}

        <button
          onClick={onClose}
          style={{ width: "100%", marginTop: 6, padding: "12px 0", borderRadius: 12, border: "none", background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
