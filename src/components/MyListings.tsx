"use client";
import { useEffect, useState } from "react";
import { C, SWATCHES, PKR } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { fetchMyListings, deleteListing, setListingStatus } from "@/lib/listings";

export default function MyListings({
  currentUserId,
  toast,
  onCount,
}: {
  currentUserId: string;
  toast: (m: string) => void;
  onCount?: (n: number) => void;
}) {
  const [items, setItems] = useState<Listing[] | null>(null);
  const [confirmId, setConfirmId] = useState<number | string | null>(null);
  const [busy, setBusy] = useState<number | string | null>(null);

  useEffect(() => {
    fetchMyListings(currentUserId).then((rows) => {
      setItems(rows);
      onCount?.(rows.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const update = (next: Listing[]) => { setItems(next); onCount?.(next.length); };

  const toggleSold = async (it: Listing) => {
    const next = it.status === "sold" ? "active" : "sold";
    setBusy(it.id);
    const { error } = await setListingStatus(it.id, next);
    setBusy(null);
    if (error) { toast("Couldn't update — " + error); return; }
    setItems((prev) => prev?.map((x) => (x.id === it.id ? { ...x, status: next } : x)) ?? null);
    toast(next === "sold" ? "Marked as sold ✦" : "Back on sale");
  };

  const remove = async (it: Listing) => {
    setBusy(it.id);
    const { error } = await deleteListing(it.id);
    setBusy(null);
    setConfirmId(null);
    if (error) { toast("Couldn't delete — " + error); return; }
    update((items ?? []).filter((x) => x.id !== it.id));
    toast("Listing deleted");
  };

  const btn: React.CSSProperties = { fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, cursor: "pointer" };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 10 }}>
        My listings
      </div>

      {items === null ? (
        <div style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, padding: "8px 0" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, padding: "8px 0", lineHeight: 1.5 }}>
          You haven&apos;t listed any suits yet. Tap <b style={{ color: C.wine }}>Sell</b> to add your first.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => {
            const sold = it.status === "sold";
            const img = it.images && it.images.length > 0 ? it.images[0] : null;
            return (
              <div key={it.id} style={{ display: "flex", gap: 12, padding: 10, borderRadius: 14, border: `1px solid ${C.line}`, background: "#fff" }}>
                <div style={{ width: 54, height: 54, borderRadius: 10, overflow: "hidden", background: SWATCHES[it.tone] || SWATCHES.placeholder, flexShrink: 0 }}>
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: sold ? 0.5 : 1 }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Cormorant Garamond", fontSize: 16, color: C.ink, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                  <div style={{ fontFamily: "Jost", fontSize: 12, color: C.wine, marginTop: 3 }}>
                    {PKR(it.price)}
                    <span style={{ marginLeft: 8, fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase", color: sold ? C.mute : C.green, border: `1px solid ${sold ? C.mute : C.green}`, padding: "1px 6px", borderRadius: 20 }}>
                      {sold ? "Sold" : "Active"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
                    <button onClick={() => toggleSold(it)} disabled={busy === it.id} style={{ ...btn, border: `1px solid ${C.wine}`, background: "#fff", color: C.wine }}>
                      {sold ? "Mark available" : "Mark sold"}
                    </button>
                    {confirmId === it.id ? (
                      <>
                        <button onClick={() => remove(it)} disabled={busy === it.id} style={{ ...btn, border: "none", background: "#C8102E", color: "#fff" }}>Delete</button>
                        <button onClick={() => setConfirmId(null)} style={{ ...btn, border: `1px solid ${C.line}`, background: "#fff", color: C.mute }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmId(it.id)} style={{ ...btn, border: `1px solid ${C.line}`, background: "#fff", color: C.mute }}>Delete</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
