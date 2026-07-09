"use client";
import { useState } from "react";
import { C, CITIES, FIT_TYPES, SIZES } from "@/lib/constants";

export interface Filters {
  city: string;
  fit: string;
  size: string;
  minPrice: number | null;
  maxPrice: number | null;
  exchangeOnly: boolean;
  sort: "new" | "price_asc" | "price_desc";
}

export const EMPTY_FILTERS: Filters = {
  city: "", fit: "", size: "", minPrice: null, maxPrice: null, exchangeOnly: false, sort: "new",
};

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.city) n++;
  if (f.fit) n++;
  if (f.size) n++;
  if (f.minPrice != null) n++;
  if (f.maxPrice != null) n++;
  if (f.exchangeOnly) n++;
  if (f.sort !== "new") n++;
  return n;
}

export default function FilterSheet({
  initial,
  onApply,
  onClose,
}: {
  initial: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<Filters>(initial);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));

  const lab: React.CSSProperties = { fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, margin: "16px 0 8px" };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: "7px 13px", borderRadius: 20, border: `1px solid ${active ? C.wine : C.line}`,
    background: active ? C.wine : "#fff", color: active ? "#fff" : C.ink,
    fontFamily: "Jost", fontSize: 13, cursor: "pointer",
  });
  const numField: React.CSSProperties = { fontFamily: "Jost", fontSize: 14, color: C.ink, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", boxSizing: "border-box", outline: "none" };

  const sorts: [Filters["sort"], string][] = [["new", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,15,25,.5)", zIndex: 45, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: "18px 20px 24px", maxHeight: "82vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.wine }}>Filters</div>
          <button onClick={() => setF(EMPTY_FILTERS)} style={{ background: "none", border: "none", color: C.mute, fontFamily: "Jost", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Clear all</button>
        </div>

        <div style={lab}>Sort by</div>
        <div style={{ display: "flex", gap: 8 }}>
          {sorts.map(([v, label]) => (
            <button key={v} onClick={() => set("sort", v)} style={chip(f.sort === v)}>{label}</button>
          ))}
        </div>

        <div style={lab}>City</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => set("city", "")} style={chip(f.city === "")}>All</button>
          {CITIES.filter((c) => c !== "Other").map((c) => (
            <button key={c} onClick={() => set("city", c)} style={chip(f.city === c)}>{c}</button>
          ))}
        </div>

        <div style={lab}>Price range (Rs)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input style={numField} type="number" placeholder="Min" value={f.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value ? +e.target.value : null)} />
          <span style={{ color: C.mute }}>—</span>
          <input style={numField} type="number" placeholder="Max" value={f.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value ? +e.target.value : null)} />
        </div>

        <div style={lab}>Size</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => set("size", "")} style={chip(f.size === "")}>All</button>
          {SIZES.map((sz) => (
            <button key={sz} onClick={() => set("size", sz)} style={chip(f.size === sz)}>{sz}</button>
          ))}
        </div>

        <div style={lab}>Fit</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => set("fit", "")} style={chip(f.fit === "")}>All</button>
          {FIT_TYPES.map((ft) => (
            <button key={ft} onClick={() => set("fit", ft)} style={chip(f.fit === ft)}>{ft}</button>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={f.exchangeOnly} onChange={(e) => set("exchangeOnly", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.wine }} />
          <span style={{ fontFamily: "Jost", fontSize: 14, color: C.ink }}>Only suits open to exchange</span>
        </label>

        <button onClick={() => { onApply(f); onClose(); }} style={{ width: "100%", marginTop: 22, padding: "15px 0", borderRadius: 12, border: "none", background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
          Show results
        </button>
      </div>
    </div>
  );
}
