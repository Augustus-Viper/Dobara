"use client";
import { useState, useEffect, useRef } from "react";
import { C, OCCASIONS, SWATCHES, PKR } from "@/lib/constants";
import { Listing } from "@/types/listing";
import { fetchListings, createListing, fetchListingById, updateListing, incrementViews, fetchSoldThisWeek } from "@/lib/listings";
import SellerProfile from "@/components/SellerProfile";
import Motif from "@/components/Motif";
import Divider from "@/components/Divider";
import ListingCard from "@/components/ListingCard";
import { ListingGridSkeleton } from "@/components/Skeleton";
import ListingDetail from "@/components/ListingDetail";
import SellForm from "@/components/SellForm";
import AuthScreen from "@/components/AuthScreen";
import ResetPasswordScreen from "@/components/ResetPasswordScreen";
import Inbox from "@/components/Inbox";
import ChatScreen from "@/components/ChatScreen";
import InstallButton from "@/components/InstallButton";
import NotifyButton from "@/components/NotifyButton";
import MyListings from "@/components/MyListings";
import ExchangeOfferForm, { OfferData } from "@/components/ExchangeOfferForm";
import { createExchangeRequest } from "@/lib/exchange";
import { sendMessage } from "@/lib/chat";
import { fetchSavedIds, addSaved, removeSaved } from "@/lib/saved";
import { reportContent, blockUser, fetchBlockedIds } from "@/lib/moderation";
import { checkIsAdmin, fetchBannedIds } from "@/lib/admin";
import { fuzzyIncludes } from "@/lib/search";
import { getRecentSearches, addRecentSearch } from "@/lib/recentSearches";
import { fetchSellerRating, SellerRating } from "@/lib/reviews";
import AdminPanel from "@/components/AdminPanel";
import AccountSettings from "@/components/AccountSettings";
import ReportDialog from "@/components/ReportDialog";
import LegalScreen from "@/components/LegalScreen";
import FilterSheet, { Filters, EMPTY_FILTERS, activeFilterCount } from "@/components/FilterSheet";
import { buzz, playPing, showNotification } from "@/lib/notify";
import { useAuth } from "@/components/AuthProvider";
import {
  Conversation, getOrCreateConversation,
  getUnreadConversationIds, subscribeToAllMyMessages, markConversationRead,
} from "@/lib/chat";

type Tab = "browse" | "sell" | "chats" | "saved" | "profile";

function EmptyState({ heading, message }: { heading?: string; message: string }) {
  return (
    <div style={{ padding: "60px 30px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, background: "rgba(176,138,62,.1)", display: "grid", placeItems: "center", margin: "0 auto" }}>
        <Motif size={26} />
      </div>
      {heading && <div style={{ fontFamily: "Cormorant Garamond", fontSize: 19, color: C.ink, marginTop: 16 }}>{heading}</div>}
      <p style={{ fontFamily: "Jost", fontSize: 13.5, color: C.mute, marginTop: 6, lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

function ListingGrid({
  data, saved, onSave, onOpen, empty, emptyHeading,
}: {
  data: Listing[];
  saved: Set<number | string>;
  onSave: (id: number | string) => void;
  onOpen: (id: number | string) => void;
  empty: string;
  emptyHeading?: string;
}) {
  if (!data.length) return <EmptyState heading={emptyHeading} message={empty} />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "4px 14px 24px" }}>
      {data.map((item) => (
        <ListingCard key={item.id} item={item} saved={saved.has(item.id)} onSave={onSave} onOpen={onOpen} />
      ))}
    </div>
  );
}

export default function DobaraApp() {
  const { user, loading: authLoading, signOut, recovering, bannedMessage, clearBannedMessage } = useAuth();
  const [tab, setTab] = useState<Tab>("browse");
  const [category, setCategory] = useState("All");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [saved, setSaved] = useState<Set<number | string>>(new Set());
  const [openId, setOpenId] = useState<number | string | null>(null);
  const [openChat, setOpenChat] = useState<Conversation | null>(null);
  const [autoOpenOffer, setAutoOpenOffer] = useState(false);
  const [exchangeFor, setExchangeFor] = useState<Listing | null>(null);
  const [unread, setUnread] = useState<Set<number>>(new Set());
  const [myCount, setMyCount] = useState(0);
  const [myRating, setMyRating] = useState<SellerRating | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [soldThisWeek, setSoldThisWeek] = useState(0);

  useEffect(() => { setRecentSearches(getRecentSearches()); }, []);
  useEffect(() => { fetchSoldThisWeek().then(setSoldThisWeek); }, []);

  const commitSearch = (term: string) => {
    if (!term.trim()) return;
    addRecentSearch(term);
    setRecentSearches(getRecentSearches());
  };
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openSeller, setOpenSeller] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [myListingsVersion, setMyListingsVersion] = useState(0);
  const [reportTarget, setReportTarget] = useState<{ type: "listing" | "user"; id: string | number; label: string } | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  // Keep the currently-open chat id available inside subscription callbacks
  const openChatRef = useRef<Conversation | null>(null);
  openChatRef.current = openChat;
  const publishingRef = useRef(false);

  // Load real listings from Supabase when the app opens
  useEffect(() => {
    fetchListings().then((rows) => {
      setListings(rows);
      setLoadingListings(false);
    });
  }, []);

  // Opened via a shared link (/listing/123 → /?suit=123) → open that suit
  useEffect(() => {
    const suit = new URLSearchParams(window.location.search).get("suit");
    if (!suit) return;
    fetchListingById(suit).then((l) => {
      if (l) {
        setListings((prev) => (prev.some((x) => x.id === l.id) ? prev : [l, ...prev]));
        setOpenId(l.id);
        if (l.status === "sold") toast("That suit has sold — here are similar ones");
      } else {
        toast("That listing is no longer available — here are similar suits");
      }
      window.history.replaceState({}, "", "/");
    });
  }, []);

  // Track unread messages for the Chats badge (live)
  useEffect(() => {
    if (!user) { setUnread(new Set()); return; }

    getUnreadConversationIds(user.id).then((ids) => setUnread(new Set(ids)));

    const unsub = subscribeToAllMyMessages((m) => {
      // Only messages from the other person matter
      if (m.sender_id === user.id) return;
      const viewing = openChatRef.current?.id === m.conversation_id;
      if (viewing) return; // I'm already looking at this chat — no alert needed

      setUnread((prev) => new Set(prev).add(m.conversation_id));

      // Alert: buzz + ding while the app is open
      buzz(180);
      playPing();
      // Browser banner only when the app isn't the focused tab
      if (typeof document !== "undefined" && document.hidden) {
        const body =
          m.media_type === "image" ? "📷 Photo" :
          m.media_type === "voice" ? "🎤 Voice message" :
          m.body ?? "New message";
        showNotification("New message · Dobara", body);
      }
    });

    return unsub;
  }, [user]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  };

  // Load the user's saved items from the database
  useEffect(() => {
    if (!user) { setSaved(new Set()); return; }
    fetchSavedIds(user.id).then((ids) => setSaved(new Set(ids)));
  }, [user]);

  // Load the people this user has blocked
  useEffect(() => {
    if (!user) { setBlockedIds(new Set()); return; }
    fetchBlockedIds(user.id).then((ids) => setBlockedIds(new Set(ids)));
  }, [user]);

  // Load this user's own live rating
  useEffect(() => {
    if (!user) { setMyRating(null); return; }
    fetchSellerRating(user.id).then(setMyRating);
  }, [user]);

  // Platform-wide bans — hide banned sellers' listings for everyone
  useEffect(() => {
    fetchBannedIds().then((ids) => setBannedIds(new Set(ids)));
  }, []);

  // Am I an admin?
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    checkIsAdmin(user.id).then(setIsAdmin);
  }, [user]);

  // Surface a message if this account just got banned
  useEffect(() => {
    if (bannedMessage) {
      toast(bannedMessage);
      clearBannedMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannedMessage]);

  const openReport = (target: { type: "listing" | "user"; id: string | number; label: string }) => {
    if (!user) { toast("Log in to report"); setTab("profile"); return; }
    setReportTarget(target);
  };

  const submitReport = async (reason: string, details: string) => {
    if (!user || !reportTarget) return;
    await reportContent(user.id, reportTarget.type, reportTarget.id, reason, details);
  };

  const handleBlock = async (blockedId: string, name: string) => {
    if (!user) return;
    await blockUser(user.id, blockedId);
    setBlockedIds((prev) => new Set(prev).add(blockedId));
    setOpenChat(null);
    toast(`${name} blocked`);
  };

  const toggleSave = (id: number | string) => {
    if (!user) { toast("Log in to save suits"); setTab("profile"); return; }
    const numId = id as number;
    setSaved((s) => {
      const n = new Set(s);
      if (n.has(id)) { n.delete(id); removeSaved(user.id, numId); }
      else { n.add(id); addSaved(user.id, numId); }
      return n;
    });
  };

  // Count a view once each time a suit is opened (any entry point)
  useEffect(() => {
    if (openId == null) return;
    incrementViews(openId);
    setListings((prev) => prev.map((l) => (l.id === openId ? { ...l, views: (l.views ?? 0) + 1 } : l)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const openListing = (id: number | string) => { setOpenId(id); window.scrollTo?.(0, 0); };

  // Open a suit from a seller's profile
  const openSellerListing = (l: Listing) => {
    setListings((prev) => (prev.some((x) => x.id === l.id) ? prev : [l, ...prev]));
    setOpenSeller(null);
    setOpenId(l.id);
  };

  // Save edits to one of my listings
  const submitEditedListing = async (data: Omit<Listing, "id">) => {
    if (!editingListing) return;
    const id = editingListing.id;
    const { error } = await updateListing(id, data);
    if (error) { toast("Couldn't save — " + error); return; }
    setListings((prev) => prev.map((l) => (l.id === id ? {
      ...l,
      title: data.title, colour: data.colour, occasion: data.occasion, city: data.city,
      condition: data.condition, fit: data.fit, measurements: data.measurements,
      can_alter: data.can_alter, original_price: data.original_price, price: data.price,
      open_to_exchange: data.open_to_exchange, images: data.images,
    } : l)));
    setEditingListing(null);
    setMyListingsVersion((v) => v + 1);
    toast("Listing updated ✦");
  };

  // Share a specific suit (native share sheet → WhatsApp, or copy link)
  const shareListing = async (item: Listing) => {
    const url = `${window.location.origin}/listing/${item.id}`;
    const text = `${item.title} — ${PKR(item.price)} on Dobara ✦`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text, url });
      else { await navigator.clipboard.writeText(url); toast("Link copied ✦"); }
    } catch { /* user cancelled the share sheet */ }
  };

  const publish = async (data: Omit<Listing, "id">) => {
    if (!user) { toast("Please log in first"); return; }
    if (publishingRef.current) return; // prevent duplicate inserts
    publishingRef.current = true;
    const { listing, error } = await createListing(data, user.id, profileName);
    publishingRef.current = false;
    if (error || !listing) {
      toast("Could not save — " + (error ?? "please try again"));
      return;
    }
    if (listing.status === "draft") {
      setTab("profile");
      toast("Saved as draft — publish it anytime from My Listings");
    } else {
      setListings((l) => [listing, ...l]);
      setTab("browse"); setCategory("All"); toast("Your suit is live ✦");
    }
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
  const startChat = async (item: Listing, openOffer = false) => {
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
    setAutoOpenOffer(openOffer);
    openConversation(conversation);
  };

  // Open the exchange offer form for a listing
  const proposeExchange = (item: Listing) => {
    if (!user) { toast("Log in to propose an exchange"); setOpenId(null); setTab("profile"); return; }
    if (!item.seller_id) { toast("This is a sample listing — can't exchange"); return; }
    if (item.seller_id === user.id) { toast("This is your own listing"); return; }
    setExchangeFor(item);
  };

  // Submit the offer → create conversation + exchange request, then open the chat
  const submitExchange = async (offer: OfferData) => {
    if (!user || !exchangeFor) return;
    const item = exchangeFor;
    const { conversation, error } = await getOrCreateConversation({
      listingId: item.id as number,
      listingTitle: item.title,
      sellerId: item.seller_id!,
      sellerName: item.seller_name,
      buyerId: user.id,
      buyerName: profileName,
    });
    if (error || !conversation) { toast("Couldn't start exchange — " + (error ?? "try again")); return; }
    const { error: exErr } = await createExchangeRequest({
      conversation_id: conversation.id,
      listing_id: item.id as number,
      listing_title: item.title,
      requester_id: user.id,
      requester_name: profileName,
      owner_id: item.seller_id!,
      offered_title: offer.title,
      offered_size: offer.size,
      offered_condition: offer.condition,
      offered_value: offer.value,
      offered_note: offer.note,
      offered_images: offer.images,
    });
    setExchangeFor(null);
    setOpenId(null);
    if (exErr) { toast("Couldn't send offer — " + exErr); return; }
    // A chat line so the owner gets notified and sees context
    await sendMessage(conversation.id, user.id, `⇄ Sent an exchange offer for "${item.title}"`);
    openConversation(conversation);
    toast("Exchange offer sent ✦");
  };

  const openItem = listings.find((l) => l.id === openId) ?? null;
  const visible = listings.filter((l) => !l.seller_id || (!blockedIds.has(l.seller_id) && !bannedIds.has(l.seller_id)));

  // Apply search + filters + sort for the Browse grid
  const q = search.trim().toLowerCase();
  // Browse only shows live listings — a sold/draft suit reached via a share link
  // gets injected into `listings`, so keep it out of the grid.
  const browsable = visible.filter((l) => (l.status ?? "active") === "active");
  let shown = category === "All" ? browsable : browsable.filter((l) => l.occasion === category);
  if (q) shown = shown.filter((l) => [l.title, l.colour, l.fabric, l.city, l.occasion].some((v) => fuzzyIncludes(v || "", q)));
  if (filters.city) shown = shown.filter((l) => l.city === filters.city);
  if (filters.fit) shown = shown.filter((l) => l.fit === filters.fit);
  if (filters.size) shown = shown.filter((l) => l.size === filters.size);
  if (filters.minPrice != null) shown = shown.filter((l) => l.price >= filters.minPrice!);
  if (filters.maxPrice != null) shown = shown.filter((l) => l.price <= filters.maxPrice!);
  if (filters.exchangeOnly) shown = shown.filter((l) => l.open_to_exchange);
  if (filters.sort === "price_asc") shown = [...shown].sort((a, b) => a.price - b.price);
  else if (filters.sort === "price_desc") shown = [...shown].sort((a, b) => b.price - a.price);

  const savedItems = visible.filter((l) => saved.has(l.id));

  return (
    <div style={{ minHeight: "100vh", background: C.ivory, display: "flex", justifyContent: "center" }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        .db-card { transition: transform .15s ease, box-shadow .15s ease; }
        .db-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(74,18,31,.12); }
        .db-emb { position:absolute; inset:0; opacity:.16; background-image:radial-gradient(circle at 20% 30%, rgba(255,255,255,.7) 0 1.5px, transparent 2px), radial-gradient(circle at 70% 60%, rgba(255,255,255,.6) 0 1.5px, transparent 2px), radial-gradient(circle at 45% 80%, rgba(255,255,255,.5) 0 1.5px, transparent 2px); background-size:46px 46px; }
        select, input { font-family: Jost; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes dbFade { from { opacity: .3; } to { opacity: 1; } }
        @keyframes dbPulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        @keyframes dbMsgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dbTypingDot { 0%,60%,100% { opacity: .25; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }
        @keyframes dbShimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
        .db-skel { background: linear-gradient(90deg, ${C.line} 25%, #f3ece4 37%, ${C.line} 63%); background-size: 400px 100%; animation: dbShimmer 1.4s ease-in-out infinite; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 430, background: C.ivory, position: "relative", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 0 60px rgba(43,26,28,.08)" }}>

        {!openItem && !openChat && (
          <header style={{ padding: "16px 18px 10px", flexShrink: 0, background: C.ivory, borderBottom: `1px solid ${C.line}`, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Motif size={14} />
              <span style={{ fontFamily: "Cormorant Garamond", fontWeight: 600, fontSize: 26, letterSpacing: 2, color: C.wine }}>DOBARA</span>
              <Motif size={14} />
            </div>
            <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: C.mute, marginTop: -2 }}>
              worn once · loved again
            </div>
            <div style={{ position: "absolute", right: 14, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
              <InstallButton variant="header" />
            </div>
          </header>
        )}

        <main style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
          {openChat ? (
            <ChatScreen
              conversation={openChat}
              currentUserId={user!.id}
              onBack={() => setOpenChat(null)}
              onReportUser={(id, name) => openReport({ type: "user", id, label: name })}
              onBlockUser={handleBlock}
              autoOpenOffer={autoOpenOffer}
            />
          ) : openItem ? (
            <ListingDetail
              item={openItem}
              saved={saved.has(openItem.id)}
              savedIds={saved}
              onSave={toggleSave}
              onBack={() => setOpenId(null)}
              onMessageSeller={() => startChat(openItem)}
              onMakeOffer={() => startChat(openItem, true)}
              onProposeExchange={() => proposeExchange(openItem)}
              onReport={() => openReport({ type: "listing", id: openItem.id, label: openItem.title })}
              onShare={() => shareListing(openItem)}
              onOpenSeller={() => openItem.seller_id && setOpenSeller(openItem.seller_id)}
              related={listings.filter((l) => l.id !== openItem.id && l.status !== "sold" && (l.occasion === openItem.occasion || l.city === openItem.city)).slice(0, 8)}
              onOpenRelated={openListing}
            />
          ) : tab === "browse" ? (
            <>
              {/* Search + Filters */}
              <div style={{ display: "flex", gap: 8, padding: "12px 14px 4px", alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.mute, fontSize: 14 }}>⌕</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => { commitSearch(search); setTimeout(() => setSearchFocused(false), 150); }}
                    onKeyDown={(e) => e.key === "Enter" && commitSearch(search)}
                    placeholder="Search suits, colour, city…"
                    style={{ width: "100%", fontFamily: "Jost", fontSize: 14, padding: "10px 12px 10px 32px", borderRadius: 22, border: `1px solid ${C.line}`, background: "#fff", outline: "none", color: C.ink, boxSizing: "border-box" }}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} aria-label="Clear search" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: C.mute, fontSize: 16, cursor: "pointer" }}>×</button>
                  )}
                  {searchFocused && !search && recentSearches.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(43,15,25,.14)", padding: 10, zIndex: 20 }}>
                      <div style={{ fontFamily: "Jost", fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 8 }}>Recent searches</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setSearch(term); setSearchFocused(false); }}
                            style={{ fontFamily: "Jost", fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.line}`, background: C.ivory, color: C.ink, cursor: "pointer" }}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setFilterOpen(true)} style={{ position: "relative", flexShrink: 0, padding: "10px 14px", borderRadius: 22, border: `1px solid ${activeFilterCount(filters) ? C.wine : C.line}`, background: activeFilterCount(filters) ? C.wine : "#fff", color: activeFilterCount(filters) ? "#fff" : C.ink, fontFamily: "Jost", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ⚙ Filters{activeFilterCount(filters) ? ` · ${activeFilterCount(filters)}` : ""}
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 14px 10px" }}>
                {OCCASIONS.map((c) => (
                  <button key={c} onClick={() => setCategory(c)} style={{ flex: "0 0 auto", padding: "7px 15px", borderRadius: 20, border: `1px solid ${category === c ? C.wine : C.line}`, background: category === c ? C.wine : "#fff", color: category === c ? "#fff" : C.ink, fontFamily: "Jost", fontSize: 13, cursor: "pointer" }}>{c}</button>
                ))}
              </div>
              {soldThisWeek > 0 && !search && !activeFilterCount(filters) && category === "All" && (
                <div style={{ margin: "0 14px 8px", padding: "8px 14px", borderRadius: 12, background: "rgba(176,138,62,.08)", border: `1px solid ${C.line}`, fontFamily: "Jost", fontSize: 12.5, color: C.wine, textAlign: "center" }}>
                  ✦ {soldThisWeek} {soldThisWeek === 1 ? "suit" : "suits"} found a new home this week
                </div>
              )}
              {loadingListings ? (
                <ListingGridSkeleton />
              ) : (
                <ListingGrid
                  data={shown}
                  saved={saved}
                  onSave={toggleSave}
                  onOpen={openListing}
                  emptyHeading={search || activeFilterCount(filters) ? "No matches" : "Be the first to list"}
                  empty={search || activeFilterCount(filters) ? "Try a different word or clear your filters." : "No suits listed yet — tap Sell to add yours."}
                />
              )}
            </>
          ) : tab === "sell" ? (
            user ? (
              <SellForm onPublish={publish} toast={toast} />
            ) : (
              <AuthScreen onShowLegal={() => setLegalOpen(true)} />
            )
          ) : tab === "chats" ? (
            user ? (
              <Inbox currentUserId={user.id} unread={unread} blockedIds={blockedIds} onOpen={openConversation} />
            ) : (
              <AuthScreen onShowLegal={() => setLegalOpen(true)} />
            )
          ) : tab === "saved" ? (
            <>
              <div style={{ padding: "16px 18px 0" }}>
                <h2 style={{ fontFamily: "Cormorant Garamond", fontSize: 24, color: C.ink, margin: 0 }}>Saved</h2>
                <Divider />
              </div>
              <ListingGrid
                data={savedItems}
                saved={saved}
                onSave={toggleSave}
                onOpen={openListing}
                emptyHeading="Nothing saved yet"
                empty="Tap the heart on a suit to build your wishlist as you browse."
              />
            </>
          ) : authLoading ? (
            <div style={{ padding: "60px 30px", textAlign: "center", fontFamily: "Jost", fontSize: 14, color: C.mute }}>Loading…</div>
          ) : !user ? (
            <AuthScreen onShowLegal={() => setLegalOpen(true)} />
          ) : (
            <div style={{ padding: "18px 18px 18px", display: "flex", flexDirection: "column", minHeight: "100%", boxSizing: "border-box" }}>
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
                {([["Listed", myCount], ["Saved", saved.size], ["Rating", myRating && myRating.review_count > 0 ? myRating.avg_rating.toFixed(1) : "—"]] as [string, number | string][]).map(([k, v]) => (
                  <div key={k} style={{ padding: "14px 0", border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff" }}>
                    <div style={{ fontFamily: "Cormorant Garamond", fontSize: 22, color: C.wine }}>{v}</div>
                    <div style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 1 }}>{k}</div>
                  </div>
                ))}
              </div>

              {/* My listings manager — delete / mark sold / status */}
              <MyListings key={myListingsVersion} currentUserId={user.id} toast={toast} onCount={setMyCount} onEdit={setEditingListing} />

              {/* Pinned to the bottom, just above the tab bar */}
              <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                {isAdmin && (
                  <button
                    onClick={() => setAdminOpen(true)}
                    style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.gold}`, background: "transparent", color: C.gold, fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                  >
                    ⚙ Admin
                  </button>
                )}
                <NotifyButton toast={toast} userId={user.id} />
                <InstallButton variant="block" />
                <button
                  onClick={() => setSettingsOpen(true)}
                  style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink, fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Account settings
                </button>
                <button
                  onClick={async () => { await signOut(); toast("Logged out"); }}
                  style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.wine}`, background: "transparent", color: C.wine, fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Log out
                </button>
                <button
                  onClick={() => setLegalOpen(true)}
                  style={{ background: "none", border: "none", color: C.mute, fontFamily: "Jost", fontSize: 12.5, cursor: "pointer", padding: "2px 0", textDecoration: "underline" }}
                >
                  Terms &amp; Privacy
                </button>
              </div>
            </div>
          )}
        </main>

        {recovering && <ResetPasswordScreen />}
        {legalOpen && <LegalScreen onClose={() => setLegalOpen(false)} />}
        {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} toast={toast} />}
        {settingsOpen && user && <AccountSettings onClose={() => setSettingsOpen(false)} toast={toast} currentName={profileName} />}
        {openSeller && (
          <SellerProfile sellerId={openSeller} saved={saved} onSave={toggleSave} onOpen={openSellerListing} onBack={() => setOpenSeller(null)} />
        )}
        {editingListing && (
          <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 57, display: "flex", flexDirection: "column" }}>
            <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
              <button onClick={() => setEditingListing(null)} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
              <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine }}>Edit listing</div>
            </header>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <SellForm initial={editingListing} heading="Edit your suit" submitLabel="Save changes" onPublish={submitEditedListing} toast={toast} />
            </div>
          </div>
        )}
        {filterOpen && (
          <FilterSheet initial={filters} onApply={setFilters} onClose={() => setFilterOpen(false)} />
        )}
        {reportTarget && (
          <ReportDialog
            label={reportTarget.label}
            onSubmit={submitReport}
            onClose={() => setReportTarget(null)}
          />
        )}

        {exchangeFor && user && (
          <ExchangeOfferForm
            target={exchangeFor}
            currentUserId={user.id}
            onSubmit={submitExchange}
            onCancel={() => setExchangeFor(null)}
          />
        )}

        {toastMsg && (
          <div style={{ position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", background: C.wineDeep, color: "#fff", fontFamily: "Jost", fontSize: 13, padding: "10px 18px", borderRadius: 30, zIndex: 20, maxWidth: 360, textAlign: "center" }}>
            {toastMsg}
          </div>
        )}

        {!openItem && !openChat && (
          <nav style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(5,1fr)", background: "#fff", borderTop: `1px solid ${C.line}`, paddingBottom: 4 }}>
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
