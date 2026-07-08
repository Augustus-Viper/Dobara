"use client";
import { useEffect, useState } from "react";
import { C, PKR } from "@/lib/constants";
import { Listing } from "@/types/listing";
import {
  AdminStats, Report,
  fetchAdminStats, fetchAllListingsForAdmin, adminDeleteListing,
  fetchAllReports, resolveReport, banUser,
} from "@/lib/admin";

type AdminTab = "stats" | "listings" | "reports";

export default function AdminPanel({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const [tab, setTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null);

  useEffect(() => {
    if (tab === "stats" && !stats) fetchAdminStats().then(setStats);
    if (tab === "listings" && !listings) fetchAllListingsForAdmin().then(setListings);
    if (tab === "reports" && !reports) fetchAllReports().then(setReports);
  }, [tab, stats, listings, reports]);

  const deleteListing = async (id: number | string) => {
    const { error } = await adminDeleteListing(id);
    setConfirmDeleteId(null);
    if (error) { toast("Couldn't delete — " + error); return; }
    setListings((prev) => prev?.filter((l) => l.id !== id) ?? null);
    toast("Listing deleted");
  };

  const banFromListing = async (l: Listing) => {
    if (!l.seller_id) return;
    const reason = prompt(`Ban ${l.seller_name}? Optional reason:`);
    if (reason === null) return;
    const { error } = await banUser(l.seller_id, reason || "Banned by admin");
    if (error) { toast("Couldn't ban — " + error); return; }
    toast(`${l.seller_name} banned`);
  };

  const handleResolve = async (id: number) => {
    setReports((prev) => prev?.map((r) => (r.id === id ? { ...r, resolved: true } : r)) ?? null);
    await resolveReport(id);
  };

  const handleReportDeleteListing = async (targetId: string) => {
    const { error } = await adminDeleteListing(targetId);
    if (error) { toast("Couldn't delete — " + error); return; }
    toast("Listing deleted");
    setListings(null); // force refetch next time listings tab opens
  };

  const handleReportBanUser = async (targetId: string) => {
    const reason = prompt("Reason for ban (optional):");
    if (reason === null) return;
    const { error } = await banUser(targetId, reason || "Banned by admin");
    if (error) { toast("Couldn't ban — " + error); return; }
    toast("User banned");
  };

  const tabBtn = (t: AdminTab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        flex: 1, padding: "10px 0", fontFamily: "Jost", fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: "none", borderBottom: `2px solid ${tab === t ? C.wine : "transparent"}`,
        background: "none", color: tab === t ? C.wine : C.mute,
      }}
    >
      {label}
    </button>
  );

  const statBox = (label: string, value: number | string) => (
    <div style={{ padding: "14px 8px", border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff", textAlign: "center" }}>
      <div style={{ fontFamily: "Cormorant Garamond", fontSize: 24, color: C.wine }}>{value}</div>
      <div style={{ fontFamily: "Jost", fontSize: 10.5, color: C.mute, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 60, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
        <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine }}>Admin</div>
      </header>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, background: "#fff", flexShrink: 0 }}>
        {tabBtn("stats", "Overview")}
        {tabBtn("listings", "Listings")}
        {tabBtn("reports", "Reports")}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "stats" && (
          !stats ? (
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {statBox("Total users", stats.totalUsers)}
              {statBox("New this week", stats.newUsersThisWeek)}
              {statBox("Active listings", stats.activeListings)}
              {statBox("Sold listings", stats.soldListings)}
              {statBox("Total listings", stats.totalListings)}
              {statBox("Conversations", stats.totalConversations)}
              {statBox("Messages sent", stats.totalMessages)}
              {statBox("Open reports", stats.openReports)}
            </div>
          )
        )}

        {tab === "listings" && (
          !listings ? (
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>No listings.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {listings.map((l) => (
                <div key={l.id} style={{ padding: 12, border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontFamily: "Cormorant Garamond", fontSize: 17, color: C.ink }}>{l.title}</div>
                    <span style={{ fontFamily: "Jost", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.5, color: l.status === "sold" ? C.mute : C.green, border: `1px solid ${l.status === "sold" ? C.mute : C.green}`, padding: "1px 6px", borderRadius: 20, height: "fit-content" }}>
                      {l.status ?? "active"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute, marginTop: 4 }}>
                    {l.seller_name} · {l.city} · {PKR(l.price)}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {confirmDeleteId === l.id ? (
                      <>
                        <button onClick={() => deleteListing(l.id)} style={{ fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, border: "none", background: "#C8102E", color: "#fff", cursor: "pointer" }}>Confirm delete</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#fff", color: C.mute, cursor: "pointer" }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setConfirmDeleteId(l.id)} style={{ fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, cursor: "pointer" }}>Delete</button>
                        <button onClick={() => banFromListing(l)} style={{ fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, border: "1px solid #C8102E", background: "#fff", color: "#C8102E", cursor: "pointer" }}>Ban seller</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "reports" && (
          !reports ? (
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>No reports.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reports.map((r) => (
                <div key={r.id} style={{ padding: 12, border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff", opacity: r.resolved ? 0.55 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontFamily: "Jost", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: C.wine, fontWeight: 600 }}>
                      {r.target_type === "listing" ? "⚐ Listing" : "⚐ User"} report
                    </span>
                    {r.resolved && <span style={{ fontFamily: "Jost", fontSize: 10, color: C.mute }}>Resolved</span>}
                  </div>
                  <div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink, marginTop: 6 }}>{r.reason}</div>
                  {r.details && <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute, marginTop: 4 }}>{r.details}</div>}
                  <div style={{ fontFamily: "Jost", fontSize: 10.5, color: C.mute, marginTop: 6 }}>
                    Target ID: {r.target_id} · {new Date(r.created_at).toLocaleString()}
                  </div>
                  {!r.resolved && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {r.target_type === "listing" ? (
                        <button onClick={() => handleReportDeleteListing(r.target_id)} style={{ fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, border: "none", background: "#C8102E", color: "#fff", cursor: "pointer" }}>Delete listing</button>
                      ) : (
                        <button onClick={() => handleReportBanUser(r.target_id)} style={{ fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, border: "none", background: "#C8102E", color: "#fff", cursor: "pointer" }}>Ban user</button>
                      )}
                      <button onClick={() => handleResolve(r.id)} style={{ fontFamily: "Jost", fontSize: 12, padding: "6px 11px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, cursor: "pointer" }}>Mark resolved</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
