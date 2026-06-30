"use client";
import { useState } from "react";
import { C } from "@/lib/constants";

const REASONS = ["Fake / scam", "Inappropriate content", "Counterfeit item", "Already sold", "Harassment", "Other"];

export default function ReportDialog({
  label,
  onSubmit,
  onClose,
}: {
  label: string;
  onSubmit: (reason: string, details: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    await onSubmit(reason, details.trim());
    setBusy(false);
    setDone(true);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,15,25,.55)", zIndex: 58, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 18, padding: "20px 18px" }}>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.wine, marginBottom: 6 }}>Report sent</div>
            <p style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, lineHeight: 1.5 }}>Thank you. Our team will review it. You can also block this person if you feel unsafe.</p>
            <button onClick={onClose} style={{ width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 12, border: "none", background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.wine, marginBottom: 2 }}>Report</div>
            <p style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, margin: "0 0 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${reason === r ? C.wine : C.line}`, background: reason === r ? "rgba(78,22,34,.05)" : "#fff", color: C.ink, fontFamily: "Jost", fontSize: 13.5, cursor: "pointer" }}>{r}</button>
              ))}
            </div>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add details (optional)" style={{ width: "100%", marginTop: 12, minHeight: 60, resize: "vertical", fontFamily: "Jost", fontSize: 13.5, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, boxSizing: "border-box", outline: "none", color: C.ink }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.line}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={submit} disabled={!reason || busy} style={{ flex: 1.3, padding: "12px 0", borderRadius: 12, border: "none", background: !reason || busy ? C.mute : "#C8102E", color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: !reason || busy ? "default" : "pointer" }}>{busy ? "Sending…" : "Submit report"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
