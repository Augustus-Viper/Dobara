"use client";
import { useRef, useState } from "react";
import { C, CONDITIONS } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { uploadListingPhoto } from "@/lib/storage";
import Divider from "./Divider";

export interface OfferData {
  title: string;
  size: string;
  condition: string;
  value: number | null;
  note: string;
  images: string[];
}

export default function ExchangeOfferForm({
  target,
  currentUserId,
  onSubmit,
  onCancel,
}: {
  target: Listing;
  currentUserId: string;
  onSubmit: (offer: OfferData) => Promise<void>;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [size, setSize] = useState<string>(target.fit || "");
  const [condition, setCondition] = useState("Worn once");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const field: React.CSSProperties = { fontFamily: "Jost", fontSize: 14, color: C.ink, width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", boxSizing: "border-box", outline: "none" };
  const lab: React.CSSProperties = { fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 6, display: "block" };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = 4 - images.length;
    if (room <= 0) return;
    setUploading(true);
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      const { url } = await uploadListingPhoto(f, currentUserId);
      if (url) added.push(url);
    }
    setImages((p) => [...p, ...added]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    setError("");
    if (!title.trim()) { setError("Describe your suit (title)"); return; }
    if (images.length === 0) { setError("Add at least one photo of your suit"); return; }
    setBusy(true);
    await onSubmit({
      title: title.trim(),
      size: size.trim(),
      condition,
      value: value ? +value : null,
      note: note.trim(),
      images,
    });
    setBusy(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 55, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <button onClick={onCancel} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
        <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine }}>Propose an exchange</div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 30px" }}>
        <p style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, margin: "0 0 8px", lineHeight: 1.5 }}>
          You&apos;re offering your suit in exchange for <b style={{ color: C.ink }}>{target.title}</b>. Give clear details so they can decide.
        </p>
        <Divider />

        {/* photos */}
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
        <label style={lab}>Photos of your suit</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {images.map((u) => (
            <div key={u} style={{ position: "relative", width: 76, height: 76, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.line}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => setImages((p) => p.filter((x) => x !== u))} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: 999, border: "none", background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 12, cursor: "pointer" }}>×</button>
            </div>
          ))}
          {images.length < 4 && (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: 76, height: 76, borderRadius: 10, border: `1.5px dashed ${C.goldSoft}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontSize: 11, cursor: "pointer" }}>
              {uploading ? "…" : "＋ Add"}
            </button>
          )}
        </div>

        <label style={lab}>Your suit</label>
        <input style={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Teal Banarsi Mehndi Lehenga" />

        <div style={{ marginTop: 14 }}>
          <label style={lab}>Size / fit (match the listed suit if you can)</label>
          <input style={field} value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. Stitched, medium" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div>
            <label style={lab}>Condition</label>
            <select style={field} value={condition} onChange={(e) => setCondition(e.target.value)}>
              {CONDITIONS.filter((c) => c !== "Custom").map((c) => <option key={c}>{c}</option>)}
              <option>Like new</option>
            </select>
          </div>
          <div>
            <label style={lab}>Est. value (Rs)</label>
            <input style={field} type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="20000" />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={lab}>Note (optional)</label>
          <textarea style={{ ...field, minHeight: 70, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Can also add Rs 2,000 on top. Worn once at my sister's mehndi." />
        </div>

        {error && <p style={{ fontFamily: "Jost", fontSize: 13, color: "#B23A48", margin: "12px 0 0" }}>{error}</p>}

        <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 20, padding: "15px 0", borderRadius: 12, border: "none", background: busy ? C.mute : C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 15, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Sending…" : "Send exchange offer"}
        </button>
      </div>
    </div>
  );
}
