"use client";
import { useState } from "react";
import { C } from "@/lib/constants";
import { useAuth } from "./AuthProvider";
import { updateDisplayName, deactivateOwnAccount } from "@/lib/account";
import Divider from "./Divider";

export default function AccountSettings({
  onClose,
  toast,
  currentName,
}: {
  onClose: () => void;
  toast: (m: string) => void;
  currentName: string;
}) {
  const { user, updatePassword } = useAuth();
  const [name, setName] = useState(currentName);
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const field: React.CSSProperties = { fontFamily: "Jost", fontSize: 14, color: C.ink, width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", boxSizing: "border-box", outline: "none" };
  const lab: React.CSSProperties = { fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 6, display: "block" };
  const sectionHeading: React.CSSProperties = { fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 10 };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    setSavingName(true);
    const { error } = await updateDisplayName(user.id, trimmed);
    setSavingName(false);
    if (error) { toast("Couldn't save — " + error); return; }
    toast("Name updated");
  };

  const savePassword = async () => {
    setPasswordError("");
    if (password.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setPasswordError("The two passwords don't match"); return; }
    setSavingPassword(true);
    const { error } = await updatePassword(password);
    setSavingPassword(false);
    if (error) { setPasswordError(error); return; }
    setPassword("");
    setConfirmPassword("");
    toast("Password changed");
  };

  const handleDelete = async () => {
    if (!user) return;
    const ok = confirm("Delete your Dobara account? This removes your listings and permanently blocks you from logging back in. This can't be undone.");
    if (!ok) return;
    setDeleting(true);
    const { error } = await deactivateOwnAccount(user.id);
    setDeleting(false);
    if (error) { toast("Couldn't delete account — " + error); return; }
    // signOut inside deactivateOwnAccount will kick the app back to the auth screen
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 62, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
        <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine }}>Account settings</div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <div style={sectionHeading}>Display name</div>
        <input style={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Your name" />
        <button
          onClick={saveName}
          disabled={savingName || !name.trim() || name.trim() === currentName}
          style={{ marginTop: 10, padding: "10px 18px", borderRadius: 10, border: "none", background: savingName || !name.trim() ? C.mute : C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: savingName ? "default" : "pointer" }}
        >
          {savingName ? "Saving…" : "Save name"}
        </button>

        <div style={{ margin: "22px 0" }}><Divider /></div>

        <div style={sectionHeading}>Change password</div>
        <div style={{ marginBottom: 10 }}>
          <label style={lab}>New password</label>
          <input style={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
        </div>
        <div>
          <label style={lab}>Confirm password</label>
          <input style={field} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Type it again" autoComplete="new-password" onKeyDown={(e) => e.key === "Enter" && savePassword()} />
        </div>
        {passwordError && <p style={{ fontFamily: "Jost", fontSize: 13, color: "#B23A48", margin: "10px 0 0" }}>{passwordError}</p>}
        <button
          onClick={savePassword}
          disabled={savingPassword || !password || !confirmPassword}
          style={{ marginTop: 10, padding: "10px 18px", borderRadius: 10, border: "none", background: savingPassword || !password ? C.mute : C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: savingPassword ? "default" : "pointer" }}
        >
          {savingPassword ? "Saving…" : "Change password"}
        </button>

        <div style={{ margin: "22px 0" }}><Divider /></div>

        <div style={{ ...sectionHeading, color: "#C8102E" }}>Danger zone</div>
        <p style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, lineHeight: 1.5, marginBottom: 10 }}>
          Deleting your account removes your listings and permanently blocks you from logging back in with this email.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ padding: "10px 18px", borderRadius: 10, border: "1.5px solid #C8102E", background: "#fff", color: "#C8102E", fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: deleting ? "default" : "pointer" }}
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </div>
  );
}
