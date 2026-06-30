"use client";
import { useState, useEffect, useRef } from "react";
import { C, OCCASIONS, SWATCHES } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { fetchListings, createListing } from "@/lib/listings";
import Motif from "@/components/Motif";
import Divider from "@/components/Divider";
import ListingCard from "@/components/ListingCard";
import ListingDetail from "@/components/ListingDetail";
import SellForm from "@/components/SellForm";
import AuthScreen from "@/components/AuthScreen";
import Inbox from "@/components/Inbox";
import ChatScreen from "@/components/ChatScreen";
import { useAuth } from "@/components/AuthProvider";
import {
  Conversation, getOrCreateConversation,
  getUnreadConversationIds, subscribeToAllMyMessages, markConversationRead,
} from "@/lib/chat";

type Tab = "browse" | "sell" | "chats" | "saved" | "profile";

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "60px 30px", textAlign: "center" }}>
      <Motif size={26} style={{ opacity: 0.6 }} />
      <p style={{ fontFamily: "Jost", fontSize: 14, color: C.mute, marginTop: 12 }}>{message}</p>
    </div>
  );
}

function ListingGrid({
  data, saved, onSave, onOpen, empty,
}: {
  data: Listing[];
  saved: Set<number | string>;
  onSave: (id: number | string) => void;
  onOpen: (id: number | string) => void;
  empty: string;
}) {
  if (!data.length) return <EmptyState message={empty} />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "4px 14px 24px" }}>
      {data.map((item) => (
        <ListingCard key={item.id} item={item} saved={saved.has(item.id)} onSave={onSave} onOpen={onOpen} />
      ))}
    </div>
  );
}

export default function DobaraApp() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("browse");
  const [category, setCategory] = useState("All");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [saved, setSaved] = useState<Set<number | string>>(new Set());
  const [openId, setOpenId] = useState<number | string | null>(null);
  const [openChat, setOpenChat] = useState<Conversation | null>(null);
  const [unread, setUnread] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState("");

  // Keep the currently-open chat id available inside subscription callbacks
  const openChatRef = useRef<Conversation | null>(null);
  openChatRef.current = openChat;

  // Load real listings from Supabase when the app opens
  useEffect(() => {
    fetchListings().then((rows) => {
      setListings(rows);
      setLoadingListings(false);
    });
  }, []);

  // Track unread messages for the Chats badge (live)
  useEffect(() => {
    if (!user) { setUnread(new Set()); return; }

    getUnreadConversationIds(user.id).then((ids) => setUnread(new Set(ids)));

    const unsub = subscribeToAllMyMessages((m) => {
      // Only messages from the other person count, and not for the chat I'm viewing
      if (m.sender_id === user.id) return;
      if (openChatRef.current?.id === m.conversation_id) return;
      setUnread((prev) => new Set(prev).add(m.conversation_id));
    });

    return unsub;
  }, [user]);

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2400);
  };

  const toggleSave = (id: number | string) =>
    setSaved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openListing = (id: number | string) => { setOpenId(id); window.scrollTo?.(0, 0); };

  const publish = async (data: Omit<Listing, "id">) => {
    if (!user) { toast("Please log in first"); return; }
    const { listing, error } = await createListing(data, user.id, profileName);
    if (error || !listing) {
      toast("Could not save — " + (error ?? "please try again"));
      return;
    }
    setListings((l) => [listing, ...l]);
    setTab("browse"); setCategory("All"); toast("Your suit is live ✦");
  };

  const profileName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "You";

  // Open a conversation: mark it read, clear its badge, show the chat
  const openConversation = (c: Conversation) => {
    if (user) markConversationRead(c, user.id);
    setUnread((prev) => { const n = new Set(prev); n.delete(c.id); return n; });
    setOpenChat(c);
  };

  // Start (or resume) a chat with a listing's seller
  const startChat = async (item: Listing) => {
    if (!user) { toast("Log in to message the seller"); setOpenId(null); setTab("profile"); return; }
    if (!item.seller_id) { toast("This is a sample listing — no seller to message"); return; }
    if (item.seller_id === user.id) { toast("This is your own listing"); return; }

    const { conversation, error } = await getOrCreateConversation({
      listingId: item.id as number,
      listingTitle: item.title,
      sellerId: item.seller_id,
      sellerName: item.seller_name,
      buyerId: user.id,
      buyerName: profileName,
    });
    if (error || !conversation) { toast("Could not open chat — " + (error ?? "try again")); return; }
    setOpenId(null);
    openConversation(conversation);
  };

  const openItem = listings.find((l) => l.id === openId) ?? null;
  const shown = category === "All" ? listings : listings.filter((l) => l.occasion === category);
  const savedItems = listings.filter((l) => saved.has(l.id));

  return (
    <div style={{ minHeight: "100vh", background: C.ivory, display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@400;500;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        .db-card { transition: transform .15s ease, box-shadow .15s ease; }
        .db-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(74,18,31,.12); }
        .db-emb { position:absolute; inset:0; opacity:.16; background-image:radial-gradient(circle at 20% 30%, rgba(255,255,255,.7) 0 1.5px, transparent 2px), radial-gradient(circle at 70% 60%, rgba(255,255,255,.6) 0 1.5px, transparent 2px), radial-gradient(circle at 45% 80%, rgba(255,255,255,.5) 0 1.5px, transparent 2px); background-size:46px 46px; }
        select, input { font-family: Jost; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 430, background: C.ivory, position: "relative", minHeight: "100vh", boxShadow: "0 0 60px rgba(43,26,28,.08)" }}>

        {!openItem && !openChat && (
          <header style={{ padding: "16px 18px 10px", position: "sticky", top: 0, zIndex: 5, background: C.ivory, borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Motif size={14} />
              <span style={{ fontFamily: "Cormorant Garamond", fontWeight: 600, fontSize: 26, letterSpacing: 2, color: C.wine }}>DOBARA</span>
              <Motif size={14} />
            </div>
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: C.mute, marginTop: -2 }}>
              worn once · loved again
            </div>
          </header>
        )}

        <main>
          {openChat ? (
            <ChatScreen conversation={openChat} currentUserId={user!.id} onBack={() => setOpenChat(null)} />
          ) : openItem ? (
            <ListingDetail item={openItem} saved={saved.has(openItem.id)} onSave={toggleSave} onBack={() => setOpenId(null)} toast={toast} onMessageSeller={() => startChat(openItem)} />
          ) : tab === "browse" ? (
            <>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 14px 10px" }}>
                {OCCASIONS.map((c) => (
                  <button key={c} onClick={() => setCategory(c)} style={{ flex: "0 0 auto", padding: "7px 15px", borderRadius: 20, border: `1px solid ${category === c ? C.wine : C.line}`, background: category === c ? C.wine : "#fff", color: category === c ? "#fff" : C.ink, fontFamily: "Jost", fontSize: 13, cursor: "pointer" }}>{c}</button>
                ))}
              </div>
              {loadingListings ? (
                <div style={{ padding: "60px 30px", textAlign: "center", fontFamily: "Jost", fontSize: 14, color: C.mute }}>Loading suits…</div>
              ) : (
                <ListingGrid data={shown} saved={saved} onSave={toggleSave} onOpen={openListing} empty="No suits listed yet — be the first to list one!" />
              )}
            </>
          ) : tab === "sell" ? (
            user ? (
              <SellForm onPublish={publish} toast={toast} />
            ) : (
              <AuthScreen />
            )
          ) : tab === "chats" ? (
            user ? (
              <Inbox currentUserId={user.id} unread={unread} onOpen={openConversation} />
            ) : (
              <AuthScreen />
            )
          ) : tab === "saved" ? (
            <>
              <div style={{ padding: "16px 18px 0" }}>
                <h2 style={{ fontFamily: "Cormorant Garamond", fontSize: 24, color: C.ink, margin: 0 }}>Saved</h2>
                <Divider />
              </div>
              <ListingGrid data={savedItems} saved={saved} onSave={toggleSave} onOpen={openListing} empty="Tap the heart on a suit to save it here." />
            </>
          ) : authLoading ? (
            <div style={{ padding: "60px 30px", textAlign: "center", fontFamily: "Jost", fontSize: 14, color: C.mute }}>Loading…</div>
          ) : !user ? (
            <AuthScreen />
          ) : (
            <div style={{ padding: "18px 18px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 58, height: 58, borderRadius: 999, background: SWATCHES.maroon, display: "grid", placeItems: "center", color: "#fff", fontFamily: "Cormorant Garamond", fontSize: 26 }}>
                  {(profileName[0] || "?").toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.ink }}>{profileName}</div>
                  <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute }}>{user.email}</div>
                </div>
              </div>
              <Divider />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
                {([["Listed", listings.filter((l) => l.seller_name === "You").length], ["Saved", saved.size], ["Rating", "5.0"]] as [string, number | string][]).map(([k, v]) => (
                  <div key={k} style={{ padding: "14px 0", border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff" }}>
                    <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.wine }}>{v}</div>
                    <div style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 1 }}>{k}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={async () => { await signOut(); toast("Logged out"); }}
                style={{ width: "100%", marginTop: 22, padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.wine}`, background: "transparent", color: C.wine, fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Log out
              </button>
            </div>
          )}
        </main>

        {toastMsg && (
          <div style={{ position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", background: C.wineDeep, color: "#fff", fontFamily: "Jost", fontSize: 13, padding: "10px 18px", borderRadius: 30, zIndex: 20, maxWidth: 360, textAlign: "center" }}>
            {toastMsg}
          </div>
        )}

        {!openItem && !openChat && (
          <nav style={{ position: "sticky", bottom: 0, display: "grid", gridTemplateColumns: "repeat(5,1fr)", background: "#fff", borderTop: `1px solid ${C.line}`, paddingBottom: 4 }}>
            {([["browse", "Browse", "⌂"], ["sell", "Sell", "＋"], ["chats", "Chats", "✉"], ["saved", "Saved", "♥"], ["profile", "You", "◍"]] as [Tab, string, string][]).map(([id, label, ic]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding: "11px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === id ? C.wine : C.mute }}>
                <span style={{ position: "relative", fontSize: 17 }}>
                  {ic}
                  {id === "chats" && unread.size > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -10, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "#C8102E", color: "#fff", fontFamily: "Jost", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>
                      {unread.size}
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: "Jost", fontSize: 11, fontWeight: tab === id ? 600 : 400 }}>{label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
