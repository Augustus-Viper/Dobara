"use client";
import { useEffect, useState } from "react";
import { C, PKR } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { Conversation, Message, fetchMessages } from "@/lib/chat";
import { useAuth } from "./AuthProvider";
import {
  AdminStats, Report, AdminProfile, AdminAction,
  fetchAdminStats, fetchAllListingsForAdmin, adminDeleteListing,
  fetchAllReports, resolveReport, banUser, unbanUser, fetchBannedIds,
  fetchAllProfiles, fetchConversationsForUser, fetchAuditLog,
} from "@/lib/admin";

type AdminTab = "stats" | "listings" | "reports" | "accounts" | "log";

export default function AdminPanel({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const { user } = useAuth();
  const adminId = user!.id;

  const [tab, setTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null);

  // Accounts browser
  const [profiles, setProfiles] = useState<AdminProfile[] | null>(null);
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set());
  const [accountSearch, setAccountSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AdminProfile | null>(null);
  const [accountConvos, setAccountConvos] = useState<Conversation[] | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [convoMessages, setConvoMessages] = useState<Message[] | null>(null);

  // Audit log
  const [log, setLog] = useState<AdminAction[] | null>(null);

  useEffect(() => {
    if (tab === "stats" && !stats) fetchAdminStats().then(setStats);
    if (tab === "listings" && !listings) fetchAllListingsForAdmin().then(setListings);
    if (tab === "reports" && !reports) fetchAllReports().then(setReports);
    if (tab === "accounts" && !profiles) {
      fetchAllProfiles().then(setProfiles);
      fetchBannedIds().then((ids) => setBannedIds(new Set(ids)));
    }
    if (tab === "log" && !log) fetchAuditLog().then(setLog);
  }, [tab, stats, listings, reports, profiles, log]);

  const deleteListing = async (id: number | string) => {
    const reason = prompt("Reason for removing this listing (shown to the buyer):", "Spam / policy violation");
    if (reason === null) { setConfirmDeleteId(null); return; }
    const { error } = await adminDeleteListing(id, adminId, reason || null);
    setConfirmDeleteId(null);
    if (error) { toast("Couldn't delete — " + error); return; }
    setListings((prev) => prev?.filter((l) => l.id !== id) ?? null);
    toast("Listing deleted");
  };

  const banFromListing = async (l: Listing) => {
    if (!l.seller_id) return;
    const reason = prompt(`Ban ${l.seller_name}? Reason:`);
    if (reason === null) return;
    const { error } = await banUser(l.seller_id, reason || "Banned by admin", adminId);
    if (error) { toast("Couldn't ban — " + error); return; }
    toast(`${l.seller_name} banned`);
  };

  const handleResolve = async (id: number) => {
    setReports((prev) => prev?.map((r) => (r.id === id ? { ...r, resolved: true } : r)) ?? null);
    await resolveReport(id, adminId);
  };

  const handleReportDeleteListing = async (targetId: string) => {
    const reason = prompt("Reason for removing this listing (shown to the buyer):", "Reported as spam / inappropriate");
    if (reason === null) return;
    const { error } = await adminDeleteListing(targetId, adminId, reason || null);
    if (error) { toast("Couldn't delete — " + error); return; }
    toast("Listing deleted");
    setListings(null); // force refetch next time listings tab opens
  };

  const handleReportBanUser = async (targetId: string) => {
    const reason = prompt("Reason for ban:");
    if (reason === null) return;
    const { error } = await banUser(targetId, reason || "Banned by admin", adminId);
    if (error) { toast("Couldn't ban — " + error); return; }
    toast("User banned");
  };

  const openAccount = async (p: AdminProfile) => {
    setSelectedAccount(p);
    setAccountConvos(null);
    const rows = await fetchConversationsForUser(p.id);
    setAccountConvos(rows);
  };

  const openConvo = async (c: Conversation) => {
    setSelectedConvo(c);
    setConvoMessages(null);
    const rows = await fetchMessages(c.id);
    setConvoMessages(rows);
  };

  const toggleBan = async (p: AdminProfile) => {
    if (bannedIds.has(p.id)) {
      const { error } = await unbanUser(p.id, adminId);
      if (error) { toast("Couldn't unban — " + error); return; }
      setBannedIds((prev) => { const n = new Set(prev); n.delete(p.id); return n; });
      toast("Unbanned");
    } else {
      const reason = prompt(`Ban ${p.full_name || p.email}? Reason:`);
      if (reason === null) return;
      const { error } = await banUser(p.id, reason || "Banned by admin", adminId);
      if (error) { toast("Couldn't ban — " + error); return; }
      setBannedIds((prev) => new Set(prev).add(p.id));
      toast("Banned");
    }
  };

  const filteredProfiles = (profiles ?? []).filter((p) => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return true;
    return (p.full_name ?? "").toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q);
  });

  const tabBtn = (t: AdminTab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        flexShrink: 0, padding: "10px 14px", fontFamily: "Jost", fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: "none", borderBottom: `2px solid ${tab === t ? C.wine : "transparent"}`,
        background: "none", color: tab === t ? C.wine : C.mute, whiteSpace: "nowrap",
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

  const backBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink, marginBottom: 12 }}>←</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 60, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
        <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine }}>Admin</div>
      </header>

      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${C.line}`, background: "#fff", flexShrink: 0 }}>
        {tabBtn("stats", "Overview")}
        {tabBtn("listings", "Listings")}
        {tabBtn("reports", "Reports")}
        {tabBtn("accounts", "Accounts")}
        {tabBtn("log", "Audit log")}
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

        {tab === "accounts" && (
          selectedAccount ? (
            selectedConvo ? (
              // ── Read-only transcript of one conversation ──
              <div>
                {backBtn(() => { setSelectedConvo(null); setConvoMessages(null); })}
                <div style={{ fontFamily: "Cormorant Garamond", fontSize: 18, color: C.ink, marginBottom: 2 }}>{selectedConvo.listing_title}</div>
                <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute, marginBottom: 12 }}>
                  {selectedConvo.buyer_name} ↔ {selectedConvo.seller_name}
                </div>
                {!convoMessages ? (
                  <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
                ) : convoMessages.length === 0 ? (
                  <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>No messages.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {convoMessages.map((m) => {
                      const senderLabel = m.sender_id === selectedConvo.buyer_id ? selectedConvo.buyer_name : selectedConvo.seller_name;
                      const body = m.media_type === "image" ? "📷 Photo" : m.media_type === "voice" ? "🎤 Voice message" : m.body;
                      return (
                        <div key={m.id} style={{ padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "Jost", fontSize: 11.5, fontWeight: 600, color: C.wine }}>{senderLabel}</span>
                            <span style={{ fontFamily: "Jost", fontSize: 10.5, color: C.mute }}>{new Date(m.created_at).toLocaleString()}</span>
                          </div>
                          <div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink, marginTop: 4 }}>{body}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // ── This account's conversations ──
              <div>
                {backBtn(() => { setSelectedAccount(null); setAccountConvos(null); })}
                <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.ink }}>{selectedAccount.full_name || "Unnamed"}</div>
                <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute, marginBottom: 12 }}>{selectedAccount.email}</div>
                <button
                  onClick={() => toggleBan(selectedAccount)}
                  style={{ fontFamily: "Jost", fontSize: 12, padding: "7px 13px", borderRadius: 8, border: `1px solid ${bannedIds.has(selectedAccount.id) ? C.line : "#C8102E"}`, background: "#fff", color: bannedIds.has(selectedAccount.id) ? C.ink : "#C8102E", cursor: "pointer", marginBottom: 14 }}
                >
                  {bannedIds.has(selectedAccount.id) ? "Unban this account" : "Ban this account"}
                </button>
                <div style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 8 }}>Conversations</div>
                {!accountConvos ? (
                  <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
                ) : accountConvos.length === 0 ? (
                  <div style={{ fontFamily: "Jost", fontSize: 13, color: C.mute }}>No conversations.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {accountConvos.map((c) => {
                      const otherName = c.buyer_id === selectedAccount.id ? c.seller_name : c.buyer_name;
                      return (
                        <button key={c.id} onClick={() => openConvo(c)} style={{ textAlign: "left", padding: 12, border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff", cursor: "pointer" }}>
                          <div style={{ fontFamily: "Jost", fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{c.listing_title}</div>
                          <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute, marginTop: 2 }}>with {otherName}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          ) : (
            <div>
              <input
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "Jost", fontSize: 14, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, marginBottom: 12, outline: "none" }}
              />
              {!profiles ? (
                <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
              ) : filteredProfiles.length === 0 ? (
                <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>No accounts found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredProfiles.map((p) => (
                    <button key={p.id} onClick={() => openAccount(p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", padding: 12, border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff", cursor: "pointer" }}>
                      <div>
                        <div style={{ fontFamily: "Jost", fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{p.full_name || "Unnamed"}</div>
                        <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute }}>{p.email}</div>
                      </div>
                      {bannedIds.has(p.id) && (
                        <span style={{ fontFamily: "Jost", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#C8102E", border: "1px solid #C8102E", padding: "2px 8px", borderRadius: 20 }}>Banned</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {tab === "log" && (
          !log ? (
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
          ) : log.length === 0 ? (
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>No admin actions yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {log.map((a) => (
                <div key={a.id} style={{ padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff" }}>
                  <div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink, fontWeight: 600 }}>
                    {a.action.replace(/_/g, " ")} {a.target_type ? `· ${a.target_type} ${a.target_id}` : ""}
                  </div>
                  {a.reason && <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute, marginTop: 2 }}>{a.reason}</div>}
                  <div style={{ fontFamily: "Jost", fontSize: 10.5, color: C.mute, marginTop: 4 }}>{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
