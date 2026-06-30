"use client";
import { useEffect, useState } from "react";
import { C } from "@/lib/constants";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Running as an installed app already — no need to show anything
  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      // iOS (and any browser without the native prompt) → show manual steps
      setShowHelp((s) => !s);
    }
  };

  return (
    <div>
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

      {showHelp && (
        <div style={{ marginTop: 10, padding: 14, borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", fontFamily: "Jost", fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
          {isIOS ? (
            <>
              <b>On iPhone:</b>
              <br />1. Tap the <b>Share</b> button (the square with an ↑) at the bottom of Safari
              <br />2. Scroll down and tap <b>“Add to Home Screen”</b>
              <br />3. Tap <b>Add</b> — the Dobara icon appears on your home screen
            </>
          ) : (
            <>
              <b>To install:</b>
              <br />Open your browser menu (<b>⋮</b>) and tap <b>“Install app”</b> or <b>“Add to Home screen.”</b>
              <br /><span style={{ color: C.mute }}>If you don’t see it yet, give the page a few seconds and try again.</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
