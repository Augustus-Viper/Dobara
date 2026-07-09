"use client";
import { useEffect, useState } from "react";
import { C, SWATCHES, PKR } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { fetchMyListings, deleteListing, setListingStatus, fetchMyListingStats, ListingStat } from "@/lib/listings";
import { fetchConversationsForListing, sendMessage } from "@/lib/chat";
import { RowSkeleton } from "./Skeleton";

async function notifyBuyers(listingId: number | string, sellerId: string, text: string) {
  const convos = await fetchConversationsForListing(listingId);
  await Promise.all(convos.map((c) => sendMessage(c.id, sellerId, text)));
}

export default function MyListings({
  currentUserId,
  toast,
  onCount,
  onEdit,
}: {
  currentUserId: string;
  toast: (m: string) => void;
  onCount?: (n: number) => void;
  onEdit: (l: Listing) => void;
}) {
  const [items, setItems] = useState<Listing[] | null>(null);
  const [stats, setStats] = useState<Map<number | string, ListingStat>>(new Map());
  const [confirmId, setConfirmId] = useState<number | string | null>(null);
  const [busy, setBusy] = useState<number | string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ item: Listing; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    return () => { if (pendingDelete) clearTimeout(pendingDelete.timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMyListings(currentUserId).then((rows) => {
      setItems(rows);
      onCount?.(rows.length);
    });
    fetchMyListingStats().then(setStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const update = (next: Listing[]) => { setItems(next); onCount?.(next.length); };

  const publishDraft = async (it: Listing) => {
    setBusy(it.id);
    const { error } = await setListingStatus(it.id, "active");
    setBusy(null);
    if (error) { toast("Couldn't publish — " + error); return; }
    setItems((prev) => prev?.map((x) => (x.id === it.id ? { ...x, status: "active" } : x)) ?? null);
    toast("Your suit is live ✦");
  };

  const toggleSold = async (it: Listing) => {
    const next = it.status === "sold" ? "active" : "sold";
    setBusy(it.id);
    const { error } = await setListingStatus(it.id, next);
    setBusy(null);
    if (error) { toast("Couldn't update — " + error); return; }
    setItems((prev) => prev?.map((x) => (x.id === it.id ? { ...x, status: next } : x)) ?? null);
    toast(next === "sold" ? "Marked as sold ✦" : "Back on sale");
    if (next === "sold") {
      notifyBuyers(it.id, currentUserId, `🔒 "${it.title}" was just marked as sold by the seller.`);
    }
  };

  const finalizeDelete = async (it: Listing) => {
    setPendingDelete(null);
    const convos = await fetchConversationsForListing(it.id);
    const { error } = await deleteListing(it.id);
    if (error) {
      toast("Couldn't delete — " + error);
      update([it, ...(items ?? [])]); // restore it — the delete never actually happened
      return;
    }
    await Promise.all(convos.map((c) => sendMessage(c.id, currentUserId, `🗑️ "${it.title}" was removed by the seller.`)));
  };

  const remove = (it: Listing) => {
    setConfirmId(null);
    update((items ?? []).filter((x) => x.id !== it.id));
    const timer = setTimeout(() => finalizeDelete(it), 5000);
    setPendingDelete({ item: it, timer });
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    update([pendingDelete.item, ...(items ?? [])]);
    setPendingDelete(null);
  };

  const btn: React.CSSProperties = { fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, cursor: "pointer" };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 10 }}>
        My listings
      </div>

      {items !== null && items.some((it) => it.status === "sold") && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: "rgba(176,138,62,.05)" }}>
            <div style={{ fontFamily: "Jost", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute }}>Suits sold</div>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.ink, marginTop: 2 }}>
              {items.filter((it) => it.status === "sold").length}
            </div>
          </div>
          <div style={{ flex: 1.3, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: "rgba(176,138,62,.05)" }}>
            <div style={{ fontFamily: "Jost", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute }}>Total earned</div>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.wine, marginTop: 2 }}>
              {PKR(items.filter((it) => it.status === "sold").reduce((sum, it) => sum + it.price, 0))}
            </div>
          </div>
        </div>
      )}

      {items === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <RowSkeleton height={78} />
          <RowSkeleton height={78} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, padding: "8px 0", lineHeight: 1.5 }}>
          You haven&apos;t listed any suits yet. Tap <b style={{ color: C.wine }}>Sell</b> to add your first.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => {
            const sold = it.status === "sold";
            const draft = it.status === "draft";
            const img = it.images && it.images.length > 0 ? it.images[0] : null;
            const daysUp = it.created_at ? Math.floor((Date.now() - new Date(it.created_at).getTime()) / 86400000) : 0;
            const stale = !sold && !draft && daysUp >= 21;
            return (
              <div key={it.id} style={{ display: "flex", gap: 12, padding: 10, borderRadius: 14, border: `1px solid ${C.line}`, background: "#fff" }}>
                <div style={{ width: 54, height: 54, borderRadius: 10, overflow: "hidden", background: SWATCHES[it.tone] || SWATCHES.placeholder, flexShrink: 0 }}>
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={it.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: sold ? 0.5 : 1 }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Cormorant Garamond", fontSize: 16, color: C.ink, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                  <div style={{ fontFamily: "Jost", fontSize: 12, color: C.wine, marginTop: 3 }}>
                    {PKR(it.price)}
                    <span style={{ marginLeft: 8, fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase", color: draft ? C.gold : sold ? C.mute : C.green, border: `1px solid ${draft ? C.gold : sold ? C.mute : C.green}`, padding: "1px 6px", borderRadius: 20 }}>
                      {draft ? "Draft" : sold ? "Sold" : "Active"}
                    </span>
                  </div>
                  {(() => {
                    const s = stats.get(it.id);
                    if (!s || (s.views === 0 && s.saves === 0)) return null;
                    return (
                      <div style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, marginTop: 4 }}>
                        👁 {s.views} {s.views === 1 ? "view" : "views"} · ♥ {s.saves} saved
                      </div>
                    );
                  })()}
                  {stale && (
                    <div style={{ fontFamily: "Jost", fontSize: 11, color: C.gold, marginTop: 4 }}>
                      ⏳ Listed {daysUp} days ago — try a price drop or fresh photos
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
                    <button onClick={() => onEdit(it)} style={{ ...btn, border: `1px solid ${C.line}`, background: "#fff", color: C.ink }}>Edit</button>
                    {draft ? (
                      <button onClick={() => publishDraft(it)} disabled={busy === it.id} style={{ ...btn, border: "none", background: C.wine, color: "#fff" }}>
                        Publish
                      </button>
                    ) : (
                      <button onClick={() => toggleSold(it)} disabled={busy === it.id} style={{ ...btn, border: `1px solid ${C.wine}`, background: "#fff", color: C.wine }}>
                        {sold ? "Mark available" : "Mark sold"}
                      </button>
                    )}
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

      {pendingDelete && (
        <div style={{ position: "fixed", left: 18, right: 18, bottom: 84, maxWidth: 394, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", borderRadius: 12, background: C.ink, color: "#fff", zIndex: 40, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
          <span style={{ fontFamily: "Jost", fontSize: 13 }}>&ldquo;{pendingDelete.item.title}&rdquo; deleted</span>
          <button onClick={undoDelete} style={{ fontFamily: "Jost", fontSize: 13, fontWeight: 700, color: C.goldSoft, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
            UNDO
          </button>
        </div>
      )}
    </div>
  );
}
