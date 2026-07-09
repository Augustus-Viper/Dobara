"use client";
import { useEffect, useRef, useState } from "react";
import { C, OCCASIONS, CITIES, CONDITIONS, FIT_TYPES, SIZES, MEASUREMENT_FIELDS, PKR } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { uploadListingPhoto } from "@/lib/storage";
import { fetchSoldPrices } from "@/lib/listings";
import { fetchMyMeasurements } from "@/lib/account";
import type { Measurements } from "@/types/listing";
import { useAuth } from "./AuthProvider";
import Divider from "./Divider";

const MAX_PHOTOS = 5;

export default function SellForm({
  onPublish,
  toast,
  initial,
  heading = "List your suit",
  submitLabel = "Publish listing",
}: {
  onPublish: (data: Omit<Listing, "id">) => void | Promise<void>;
  toast: (msg: string) => void;
  initial?: Listing;
  heading?: string;
  submitLabel?: string;
}) {
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const cityList = CITIES as readonly string[];
  const condList = CONDITIONS as readonly string[];
  const str = (n: number | undefined) => (n != null ? String(n) : "");

  const [f, setF] = useState(() =>
    initial
      ? {
          title: initial.title, colour: initial.colour, occasion: initial.occasion,
          city: cityList.includes(initial.city) ? initial.city : "Other",
          cityCustom: cityList.includes(initial.city) ? "" : initial.city,
          condition: condList.includes(initial.condition) ? initial.condition : "Custom",
          condCustom: condList.includes(initial.condition) ? "" : initial.condition,
          fit: initial.fit,
          measurements: {
            shoulder: str(initial.measurements?.shoulder), bust: str(initial.measurements?.bust),
            waist: str(initial.measurements?.waist), hips: str(initial.measurements?.hips),
            length: str(initial.measurements?.length), sleeve: str(initial.measurements?.sleeve),
          },
          can_alter: initial.can_alter, original_price: String(initial.original_price),
          price: String(initial.price), open_to_exchange: initial.open_to_exchange,
          whatsapp: initial.whatsapp ?? "", size: initial.size ?? "",
        }
      : {
          title: "", colour: "", occasion: "Mehndi" as Listing["occasion"],
          city: "Lahore", cityCustom: "",
          condition: "Worn once", condCustom: "",
          fit: "Stitched" as Listing["fit"],
          measurements: { shoulder: "", bust: "", waist: "", hips: "", length: "", sleeve: "" },
          can_alter: false, original_price: "", price: "", open_to_exchange: false,
          whatsapp: "", size: "",
        }
  );

  const [soldPrices, setSoldPrices] = useState<number[] | null>(null);
  useEffect(() => {
    if (initial) return; // only show the hint while creating a fresh listing
    let active = true;
    setSoldPrices(null);
    fetchSoldPrices(f.occasion).then((prices) => { if (active) setSoldPrices(prices); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.occasion, initial]);

  // Saved measurements from the user's account, for one-tap autofill
  const [savedMeas, setSavedMeas] = useState<Measurements | null>(null);
  useEffect(() => {
    if (initial || !user) return;
    fetchMyMeasurements(user.id).then(setSavedMeas);
  }, [initial, user]);

  const hasSavedMeas = savedMeas != null && Object.values(savedMeas).some((v) => v != null);
  const autofillMeasurements = () => {
    if (!savedMeas) return;
    setF((s) => ({
      ...s,
      measurements: {
        shoulder: str(savedMeas.shoulder), bust: str(savedMeas.bust), waist: str(savedMeas.waist),
        hips: str(savedMeas.hips), length: str(savedMeas.length), sleeve: str(savedMeas.sleeve),
      },
    }));
    toast("Filled in your saved measurements");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) { toast(`Up to ${MAX_PHOTOS} photos`); return; }

    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const { url, error } = await uploadListingPhoto(file, user.id);
      if (url) added.push(url);
      else toast(error || "Upload failed");
    }
    setImages((prev) => [...prev, ...added]);
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeImage = (url: string) =>
    setImages((prev) => prev.filter((u) => u !== url));

  const moveImage = (index: number, dir: -1 | 1) =>
    setImages((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const setM = (k: string, v: string) =>
    setF((s) => ({ ...s, measurements: { ...s.measurements, [k]: v } }));

  const submit = async (status: "active" | "draft" = "active") => {
    if (publishing || uploading) return; // guard against double-taps / duplicates
    if (!f.title.trim() || !f.colour.trim() || !f.price || !f.original_price) {
      toast("Add title, colour, original price and your price"); return;
    }
    if (f.city === "Other" && !f.cityCustom.trim()) { toast("Type your city"); return; }
    if (f.condition === "Custom" && !f.condCustom.trim()) { toast("Describe the condition"); return; }

    const measurements: Record<string, number> = {};
    if (f.fit === "Stitched") {
      MEASUREMENT_FIELDS.forEach(([k]) => {
        const v = (f.measurements as Record<string, string>)[k];
        if (v) measurements[k] = +v;
      });
    }

    setPublishing(true);
    try {
      await onPublish({
        title: f.title, colour: f.colour, occasion: f.occasion,
        city: f.city === "Other" ? f.cityCustom : f.city,
        condition: f.condition === "Custom" ? f.condCustom : f.condition,
        fit: f.fit, measurements, can_alter: f.can_alter,
        original_price: +f.original_price, price: +f.price,
        open_to_exchange: f.open_to_exchange,
        tone: "placeholder", fabric: "", images,
        size: f.size || null,
        whatsapp: f.whatsapp.trim() || null,
        seller_name: "You", seller_rating: 5.0, seller_verified: false,
        status,
      });
    } finally {
      setPublishing(false);
    }
  };

  const field: React.CSSProperties = { fontFamily:"Jost", fontSize:14, color:C.ink, width:"100%", padding:"11px 12px", borderRadius:10, border:`1px solid ${C.line}`, background:"#fff", boxSizing:"border-box", outline:"none" };
  const lab: React.CSSProperties = { fontFamily:"Jost", fontSize:11, letterSpacing:.6, textTransform:"uppercase", color:C.mute, marginBottom:6, display:"block" };
  const small: React.CSSProperties = { fontFamily:"Jost", fontSize:13, color:C.ink, width:"100%", padding:"9px 8px", borderRadius:9, border:`1px solid ${C.line}`, background:"#fff", boxSizing:"border-box", outline:"none", textAlign:"center" };

  return (
    <div style={{ padding: "8px 18px 30px" }}>
      <h2 style={{ fontFamily:"Cormorant Garamond", fontSize:26, color:C.ink, margin:"6px 0 2px" }}>{heading}</h2>
      <p style={{ fontFamily:"Jost", fontSize:13, color:C.mute, margin:"0 0 6px" }}>Worn once is worth more than worn never. Give it a second life.</p>
      <Divider />

      {/* Photo upload */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => onFiles(e.target.files)}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {images.map((url, i) => (
          <div key={url} style={{ position: "relative", width: 84, height: 84, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.line}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="suit photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {i === 0 && (
              <span style={{ position: "absolute", top: 3, left: 3, fontFamily: "Jost", fontSize: 8.5, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: "#fff", background: "rgba(78,22,34,.85)", padding: "2px 6px", borderRadius: 6 }}>
                Cover
              </span>
            )}
            <button
              onClick={() => removeImage(url)}
              aria-label="Remove photo"
              style={{ position: "absolute", top: 3, right: 3, width: 22, height: 22, borderRadius: 999, border: "none", background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 13, lineHeight: 1, cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              ×
            </button>
            <div style={{ position: "absolute", bottom: 3, left: 3, right: 3, display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => moveImage(i, -1)}
                disabled={i === 0}
                aria-label="Move photo earlier"
                style={{ width: 20, height: 20, borderRadius: 999, border: "none", background: i === 0 ? "rgba(0,0,0,.15)" : "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, lineHeight: 1, cursor: i === 0 ? "default" : "pointer", display: "grid", placeItems: "center" }}
              >
                ‹
              </button>
              <button
                onClick={() => moveImage(i, 1)}
                disabled={i === images.length - 1}
                aria-label="Move photo later"
                style={{ width: 20, height: 20, borderRadius: 999, border: "none", background: i === images.length - 1 ? "rgba(0,0,0,.15)" : "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, lineHeight: 1, cursor: i === images.length - 1 ? "default" : "pointer", display: "grid", placeItems: "center" }}
              >
                ›
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_PHOTOS && (
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            style={{ width: 84, height: 84, borderRadius: 12, border: `1.5px dashed ${C.goldSoft}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontSize: 11, cursor: uploading ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
          >
            {uploading ? "Uploading…" : <><span style={{ fontSize: 20 }}>＋</span><span>Add photo</span></>}
          </button>
        )}
      </div>
      {images.length === 0 && (
        <p style={{ fontFamily: "Jost", fontSize: 11.5, color: C.mute, margin: "-8px 0 16px" }}>
          Add up to {MAX_PHOTOS} clear photos — good light, full outfit. Listings with photos sell much faster.
        </p>
      )}

      <label style={lab}>Title</label>
      <input style={field} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Coral Pink Mehndi Lehenga" maxLength={80} />

      <div style={{ marginTop: 14 }}>
        <label style={lab}>Colour</label>
        <input style={field} value={f.colour} onChange={(e) => set("colour", e.target.value)} placeholder="e.g. firozi with gold work" maxLength={60} />
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={lab}>Occasion</label>
        <select style={field} value={f.occasion} onChange={(e) => set("occasion", e.target.value as Listing["occasion"])}>
          {OCCASIONS.slice(1).map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={lab}>City</label>
        <select style={field} value={f.city} onChange={(e) => set("city", e.target.value)}>
          {CITIES.map((c) => <option key={c} value={c}>{c === "Other" ? "Other (type your city)" : c}</option>)}
        </select>
        {f.city === "Other" && (
          <input style={{ ...field, marginTop: 8 }} value={f.cityCustom} onChange={(e) => set("cityCustom", e.target.value)} placeholder="Type your city" maxLength={40} />
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={lab}>Condition</label>
        <select style={field} value={f.condition} onChange={(e) => set("condition", e.target.value)}>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c === "Custom" ? "Custom (describe it)" : c}</option>)}
        </select>
        {f.condition === "Custom" && (
          <input style={{ ...field, marginTop: 8 }} value={f.condCustom} onChange={(e) => set("condCustom", e.target.value)} placeholder="e.g. small thread pull near hem, otherwise perfect" maxLength={120} />
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={lab}>Fit type</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {FIT_TYPES.map((ft) => (
            <button key={ft} onClick={() => set("fit", ft as Listing["fit"])} style={{ flex:"1 0 40%", padding:"10px 0", borderRadius:10, border:`1.5px solid ${f.fit === ft ? C.wine : C.line}`, background: f.fit === ft ? C.wine : "#fff", color: f.fit === ft ? "#fff" : C.ink, fontFamily:"Jost", fontSize:13, cursor:"pointer" }}>
              {ft}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={lab}>Size <span style={{ textTransform:"none", letterSpacing:0, color:C.mute }}>(optional)</span></label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {SIZES.map((sz) => {
            const on = f.size === sz;
            return (
              <button key={sz} onClick={() => set("size", on ? "" : sz)} style={{ minWidth:52, padding:"9px 0", borderRadius:10, border:`1.5px solid ${on ? C.wine : C.line}`, background: on ? C.wine : "#fff", color: on ? "#fff" : C.ink, fontFamily:"Jost", fontSize:13, cursor:"pointer" }}>
                {sz}
              </button>
            );
          })}
        </div>
      </div>

      {f.fit === "Stitched" && (
        <div style={{ marginTop:16, padding:14, border:`1px solid ${C.line}`, borderRadius:12, background:"rgba(176,138,62,.05)" }}>
          <div style={{ fontFamily:"Jost", fontSize:11, letterSpacing:.6, textTransform:"uppercase", color:C.mute, marginBottom:4 }}>Measurements (inches)</div>
          <div style={{ fontFamily:"Jost", fontSize:11.5, color:C.mute, marginBottom:10 }}>Optional, but stitched suits sell faster with them.</div>
          {hasSavedMeas && (
            <button onClick={autofillMeasurements} style={{ marginBottom:10, padding:"7px 12px", borderRadius:8, border:`1px solid ${C.wine}`, background:"#fff", color:C.wine, fontFamily:"Jost", fontSize:12, cursor:"pointer" }}>
              ✦ Use my saved measurements
            </button>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {MEASUREMENT_FIELDS.map(([k, label]) => (
              <div key={k}>
                <input style={small} type="number" value={(f.measurements as Record<string,string>)[k]} onChange={(e) => setM(k, e.target.value)} placeholder={label} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!initial && soldPrices !== null && soldPrices.length > 0 && (
        <div style={{ marginTop:16, padding:"10px 14px", border:`1px solid ${C.line}`, borderRadius:12, background:"rgba(176,138,62,.05)" }}>
          <div style={{ fontFamily:"Jost", fontSize:11, letterSpacing:.6, textTransform:"uppercase", color:C.mute, marginBottom:4 }}>
            Similar sold suits ({soldPrices.length})
          </div>
          <div style={{ fontFamily:"Cormorant Garamond", fontSize:16, color:C.ink }}>
            {PKR(Math.min(...soldPrices))} – {PKR(Math.max(...soldPrices))}
            <span style={{ fontFamily:"Jost", fontSize:12, color:C.mute, marginLeft:8 }}>
              avg {PKR(Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length))}
            </span>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:16 }}>
        <div>
          <label style={lab}>Original price (Rs)</label>
          <input style={field} type="number" value={f.original_price} onChange={(e) => set("original_price", e.target.value)} placeholder="45000" />
        </div>
        <div>
          <label style={lab}>Your price (Rs)</label>
          <input style={field} type="number" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="18000" />
        </div>
      </div>

      <label style={{ display:"flex", alignItems:"center", gap:10, marginTop:16, cursor:"pointer" }}>
        <input type="checkbox" checked={f.can_alter} onChange={(e) => set("can_alter", e.target.checked)} style={{ width:18, height:18, accentColor:C.wine }} />
        <span style={{ fontFamily:"Jost", fontSize:14, color:C.ink }}>This suit can be altered or let out</span>
      </label>

      <label style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, cursor:"pointer" }}>
        <input type="checkbox" checked={f.open_to_exchange} onChange={(e) => set("open_to_exchange", e.target.checked)} style={{ width:18, height:18, accentColor:C.wine }} />
        <span style={{ fontFamily:"Jost", fontSize:14, color:C.ink }}>I'm open to exchanging instead of selling</span>
      </label>

      <div style={{ marginTop: 16 }}>
        <label style={lab}>WhatsApp number (optional)</label>
        <input style={field} type="tel" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="e.g. 0300 1234567" />
        <p style={{ fontFamily: "Jost", fontSize: 11.5, color: C.mute, margin: "6px 0 0", lineHeight: 1.4 }}>
          If you add it, buyers get a “WhatsApp seller” button. Leave blank to keep your number private and use in-app chat only.
        </p>
      </div>

      <button
        onClick={() => submit("active")}
        disabled={publishing || uploading}
        style={{ width:"100%", marginTop:22, padding:"15px 0", borderRadius:12, border:"none", background: publishing || uploading ? C.mute : C.wine, color:"#fff", fontFamily:"Jost", fontWeight:600, fontSize:15, cursor: publishing || uploading ? "default" : "pointer" }}
      >
        {publishing ? "Publishing…" : submitLabel}
      </button>

      {!initial && (
        <button
          onClick={() => submit("draft")}
          disabled={publishing || uploading}
          style={{ width:"100%", marginTop:10, padding:"13px 0", borderRadius:12, border:`1.5px solid ${C.line}`, background:"#fff", color:C.mute, fontFamily:"Jost", fontWeight:600, fontSize:13.5, cursor: publishing || uploading ? "default" : "pointer" }}
        >
          Save as draft — finish later
        </button>
      )}
    </div>
  );
}
