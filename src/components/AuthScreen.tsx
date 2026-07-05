"use client";
import { useState } from "react";
import { C } from "@/lib/constants";
import { useAuth } from "./AuthProvider";
import Motif from "./Motif";
import Divider from "./Divider";

export default function AuthScreen({ onShowLegal }: { onShowLegal?: () => void }) {
  const { signIn, signUp, sendPasswordReset, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const field: React.CSSProperties = {
    fontFamily: "Jost", fontSize: 14, color: C.ink, width: "100%",
    padding: "12px 13px", borderRadius: 10, border: `1px solid ${C.line}`,
    background: "#fff", boxSizing: "border-box", outline: "none",
  };
  const lab: React.CSSProperties = {
    fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase",
    color: C.mute, marginBottom: 6, display: "block",
  };

  const submit = async () => {
    setError(""); setInfo("");
    if (!email.trim() || !password) { setError("Enter your email and password"); return; }
    if (mode === "signup" && !name.trim()) { setError("Tell us your name"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setBusy(true);
    if (mode === "login") {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(friendly(error));
    } else {
      const { error, needsConfirm } = await signUp(email.trim(), password, name.trim());
      if (error) setError(friendly(error));
      else if (needsConfirm) setInfo("Almost there! Check your email and tap the confirmation link, then come back and log in.");
    }
    setBusy(false);
  };

  const forgot = async () => {
    setError(""); setInfo("");
    if (!email.trim()) { setError("Type your email above first, then tap “Forgot password”"); return; }
    setBusy(true);
    const { error } = await sendPasswordReset(email.trim());
    setBusy(false);
    if (error) setError(friendly(error));
    else setInfo("If that email has an account, a reset link is on its way. Open it and set a new password.");
  };

  return (
    <div style={{ padding: "30px 22px 40px" }}>
      <div style={{ textAlign: "center" }}>
        <Motif size={22} />
        <h2 style={{ fontFamily: "Cormorant Garamond", fontSize: 28, color: C.wine, margin: "8px 0 2px", letterSpacing: 1 }}>
          {mode === "login" ? "Welcome back" : "Join Dobara"}
        </h2>
        <p style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, margin: 0 }}>
          {mode === "login" ? "Log in to sell, save and message" : "Create an account to start selling"}
        </p>
      </div>

      <div style={{ margin: "18px 0" }}><Divider /></div>

      {mode === "signup" && (
        <div style={{ marginBottom: 14 }}>
          <label style={lab}>Your name</label>
          <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Areeba" />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={lab}>Email</label>
        <input style={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={lab}>Password</label>
        <input style={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>

      {mode === "login" && (
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <button onClick={forgot} disabled={busy} style={{ background: "none", border: "none", color: C.mute, fontFamily: "Jost", fontSize: 12.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
            Forgot password?
          </button>
        </div>
      )}

      {error && <p style={{ fontFamily: "Jost", fontSize: 13, color: "#B23A48", margin: "10px 0 0" }}>{error}</p>}
      {info && <p style={{ fontFamily: "Jost", fontSize: 13, color: C.green, margin: "10px 0 0", lineHeight: 1.5 }}>{info}</p>}

      <button
        onClick={submit}
        disabled={busy}
        style={{
          width: "100%", marginTop: 18, padding: "15px 0", borderRadius: 12, border: "none",
          background: busy ? C.mute : C.wine, color: "#fff", fontFamily: "Jost",
          fontWeight: 600, fontSize: 15, cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 12px" }}>
        <div style={{ flex: 1, height: 1, background: C.line }} />
        <span style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 1 }}>or</span>
        <div style={{ flex: 1, height: 1, background: C.line }} />
      </div>

      <button
        onClick={async () => { setError(""); const { error } = await signInWithGoogle(); if (error) setError(error); }}
        style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 15 }}><span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#EA4335" }}>o</span><span style={{ color: "#FBBC05" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#34A853" }}>l</span><span style={{ color: "#EA4335" }}>e</span></span>
        Continue with Google
      </button>
      <p style={{ textAlign: "center", fontFamily: "Jost", fontSize: 11, color: C.mute, marginTop: 8, lineHeight: 1.4 }}>
        Google may email you to confirm you joined Dobara — that&apos;s normal, not a hack.
      </p>

      <p style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 18 }}>
        {mode === "login" ? "New to Dobara? " : "Already have an account? "}
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
          style={{ background: "none", border: "none", color: C.wine, fontFamily: "Jost", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>

      {mode === "signup" && (
        <p style={{ textAlign: "center", fontFamily: "Jost", fontSize: 11.5, color: C.mute, marginTop: 14, lineHeight: 1.5 }}>
          By joining you agree to our{" "}
          {onShowLegal ? (
            <button onClick={onShowLegal} style={{ background: "none", border: "none", color: C.wine, fontFamily: "Jost", fontSize: 11.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>Terms &amp; Privacy</button>
          ) : (
            <b>Terms &amp; Privacy</b>
          )}
        </p>
      )}
    </div>
  );
}

// Turn Supabase's technical errors into plain language
function friendly(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (!m || m === "{}" || m === "[object object]") return "Something went wrong — please try again in a moment.";
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account — try logging in.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox.";
  if (m.includes("confirmation email") || m.includes("sending") || m.includes("smtp")) return "We couldn't send your confirmation email right now. Please try again shortly.";
  if (m.includes("password")) return "Password must be at least 6 characters.";
  return msg;
}
