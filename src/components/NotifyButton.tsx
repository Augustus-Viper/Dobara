"use client";
import { useEffect, useState } from "react";
import { C } from "@/lib/constants";
import { ensureNotifyPermission, notifySupported } from "@/lib/notify";

export default function NotifyButton({ toast }: { toast: (m: string) => void }) {
  const [state, setState] = useState<"hidden" | "show">("hidden");

  useEffect(() => {
    if (notifySupported() && Notification.permission === "default") setState("show");
    else setState("hidden");
  }, []);

  if (state === "hidden") return null;

  const enable = async () => {
    const ok = await ensureNotifyPermission();
    setState("hidden");
    toast(ok ? "Alerts enabled ✦" : "Alerts are blocked — turn them on in your browser settings");
  };

  return (
    <button
      onClick={enable}
      style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.wine}`, background: "#fff", color: C.wine, fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
    >
      <span style={{ fontSize: 15 }}>🔔</span> Enable alerts
    </button>
  );
}
