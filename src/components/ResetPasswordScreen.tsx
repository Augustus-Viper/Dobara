"use client";
import { useState } from "react";
import { C } from "@/lib/constants";
import { useAuth } from "./AuthProvider";
import Motif from "./Motif";
import Divider from "./Divider";

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const field: React.CSSProperties = { fontFamily: "Jost", fontSize: 14, color: C.ink, width: "100%", padding: "12px 13px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", boxSizing: "border-box", outline: "none" };
  const lab: React.CSSProperties = { fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 6, display: "block" };

  const submit = async () => {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("The two passwords don't match"); return; }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) setError(error);
    else setDone(true);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 65, display: "flex", flexDirection: "column", justifyContent: "center", padding: "30px 22px" }}>
      <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <Motif size={22} />
          <h2 style={{ fontFamily: "Cormorant Garamond", fontSize: 28, color: C.wine, margin: "8px 0 2px", letterSpacing: 1 }}>Set a new password</h2>
          <p style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, margin: 0 }}>Almost done — choose a new password for your account</p>
        </div>
        <div style={{ margin: "18px 0" }}><Divider /></div>

        {done ? (
          <p style={{ fontFamily: "Jost", fontSize: 14, color: C.green, textAlign: "center", lineHeight: 1.6 }}>
            ✓ Password updated! You&apos;re logged in. You can close this and start browsing.
          </p>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={lab}>New password</label>
              <input style={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={lab}>Confirm password</label>
              <input style={field} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" autoComplete="new-password" onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
            {error && <p style={{ fontFamily: "Jost", fontSize: 13, color: "#B23A48", margin: "10px 0 0" }}>{error}</p>}
            <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 18, padding: "15px 0", borderRadius: 12, border: "none", background: busy ? C.mute : C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 15, cursor: busy ? "default" : "pointer" }}>
              {busy ? "Saving…" : "Save new password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
