"use client";
import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/constants";
import {
  Conversation, Message,
  fetchMessages, sendMessage, sendMediaMessage, subscribeToMessages, subscribeToMessageUpdates,
  markConversationRead, subscribeToConversation, toggleReaction, createTypingChannel,
} from "@/lib/chat";
import { uploadChatImage, uploadChatVoice } from "@/lib/storage";
import { PKR } from "@/lib/constants";
import {
  ExchangeRequest, fetchExchangeRequests, setExchangeStatus, subscribeToExchangeRequests,
} from "@/lib/exchange";
import {
  PriceOffer, createPriceOffer, fetchPriceOffers, setPriceOfferStatus, subscribeToPriceOffers,
} from "@/lib/priceOffers";
import { submitReview } from "@/lib/reviews";
import PhotoLightbox from "./PhotoLightbox";
import { ChatBubbleSkeleton } from "./Skeleton";

const MAX_RECORDING_SECONDS = 120;
const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "🙏"];
const STARTER_PROMPTS = [
  "Is this still available?",
  "Can you share more photos?",
  "What's the lowest price?",
  "Is it stitched or unstitched?",
];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function sameDay(a?: string, b?: string) {
  if (!a || !b) return false;
  return startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();
}
function dayLabel(dateStr: string) {
  const d = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "long",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
function timeLabel(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function quoteLabel(m: Message | undefined, currentUserId: string, otherName: string) {
  if (!m) return null;
  const who = m.sender_id === currentUserId ? "You" : otherName;
  const text = m.media_type === "image" ? "📷 Photo" : m.media_type === "voice" ? "🎤 Voice message" : (m.body ?? "");
  return { who, text };
}

export default function ChatScreen({
  conversation,
  currentUserId,
  onBack,
  onReportUser,
  onBlockUser,
}: {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
  onReportUser: (id: string, name: string) => void;
  onBlockUser: (id: string, name: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openImage, setOpenImage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Reply / reactions
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<number | null>(null);

  // Typing indicator
  const [otherTyping, setOtherTyping] = useState(false);
  const typingRef = useRef<{ sendTyping: (userId: string) => void; unsubscribe: () => void } | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  // Attachment sheet
  const [attachOpen, setAttachOpen] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecRef = useRef(0);
  const cancelRecRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const iAmBuyer = currentUserId === conversation.buyer_id;
  const otherName = iAmBuyer ? conversation.seller_name : conversation.buyer_name;
  const otherId = iAmBuyer ? conversation.seller_id : conversation.buyer_id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateValue, setRateValue] = useState(0);
  const [rateComment, setRateComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);

  const [otherLastRead, setOtherLastRead] = useState<string | null>(
    (iAmBuyer ? conversation.seller_last_read : conversation.buyer_last_read) ?? null
  );

  const [exchanges, setExchanges] = useState<ExchangeRequest[]>([]);
  const [offers, setOffers] = useState<PriceOffer[]>([]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [offerBusy, setOfferBusy] = useState(false);

  const appendMessage = (m: Message) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  const updateMessage = (m: Message) =>
    setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));

  const upsertExchange = (r: ExchangeRequest) =>
    setExchanges((prev) => {
      const i = prev.findIndex((x) => x.id === r.id);
      if (i >= 0) { const c = [...prev]; c[i] = r; return c; }
      return [...prev, r];
    });

  const acceptExchange = async (r: ExchangeRequest) => {
    setExchanges((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "accepted" } : x)));
    await setExchangeStatus(r.id, "accepted");
    await sendMessage(conversation.id, currentUserId, "✅ Exchange accepted — let's arrange the details!");
  };
  const declineExchange = async (r: ExchangeRequest) => {
    setExchanges((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "declined" } : x)));
    await setExchangeStatus(r.id, "declined");
    await sendMessage(conversation.id, currentUserId, "❌ Exchange request declined.");
  };

  const upsertOffer = (o: PriceOffer) =>
    setOffers((prev) => {
      const i = prev.findIndex((x) => x.id === o.id);
      if (i >= 0) { const c = [...prev]; c[i] = o; return c; }
      return [...prev, o];
    });

  const acceptOffer = async (o: PriceOffer) => {
    setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: "accepted" } : x)));
    await setPriceOfferStatus(o.id, "accepted");
    await sendMessage(conversation.id, currentUserId, `✅ Offer of ${PKR(o.amount)} accepted!`);
  };
  const declineOffer = async (o: PriceOffer) => {
    setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: "declined" } : x)));
    await setPriceOfferStatus(o.id, "declined");
    await sendMessage(conversation.id, currentUserId, `❌ Offer of ${PKR(o.amount)} declined.`);
  };

  const submitOffer = async () => {
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) return;
    setOfferBusy(true);
    const { offer, error } = await createPriceOffer({
      conversation_id: conversation.id,
      listing_id: conversation.listing_id,
      listing_title: conversation.listing_title,
      offerer_id: currentUserId,
      offerer_name: iAmBuyer ? conversation.buyer_name : conversation.seller_name,
      owner_id: otherId,
      amount,
      note: offerNote.trim() || null,
    });
    setOfferBusy(false);
    if (error) { alert("Couldn't send offer — " + error); return; }
    if (offer) upsertOffer(offer);
    setOfferOpen(false);
    setOfferAmount("");
    setOfferNote("");
  };

  // Load history + subscribe
  useEffect(() => {
    let active = true;
    fetchMessages(conversation.id).then((rows) => {
      if (!active) return;
      setMessages(rows);
      setLoading(false);
    });
    markConversationRead(conversation, currentUserId);

    const unsubMsg = subscribeToMessages(conversation.id, (m) => {
      appendMessage(m);
      if (m.sender_id !== currentUserId) markConversationRead(conversation, currentUserId);
    });
    const unsubUpdates = subscribeToMessageUpdates(conversation.id, updateMessage);
    const unsubConvo = subscribeToConversation(conversation.id, (c) => {
      setOtherLastRead((iAmBuyer ? c.seller_last_read : c.buyer_last_read) ?? null);
    });

    const typing = createTypingChannel(conversation.id, (userId) => {
      if (userId === currentUserId) return;
      setOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
    });
    typingRef.current = typing;

    fetchExchangeRequests(conversation.id).then((rows) => { if (active) setExchanges(rows); });
    const unsubExch = subscribeToExchangeRequests(conversation.id, upsertExchange);

    fetchPriceOffers(conversation.id).then((rows) => { if (active) setOffers(rows); });
    const unsubOffers = subscribeToPriceOffers(conversation.id, upsertOffer);

    return () => {
      active = false;
      unsubMsg(); unsubUpdates(); unsubConvo(); unsubExch(); unsubOffers();
      typing.unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, currentUserId, iAmBuyer]);

  const lastMine = [...messages].reverse().find((m) => m.sender_id === currentUserId);
  const lastMineSeen =
    !!lastMine && !!otherLastRead && new Date(otherLastRead) >= new Date(lastMine.created_at);

  // Merge messages + exchange cards + price offers into one time-ordered timeline
  const timeline = [
    ...messages.map((m) => ({ kind: "msg" as const, at: m.created_at, msg: m })),
    ...exchanges.map((x) => ({ kind: "exch" as const, at: x.created_at, exch: x })),
    ...offers.map((o) => ({ kind: "offer" as const, at: o.created_at, offer: o })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // Precompute day-divider + grouping metadata for tighter, chat-app-like layout
  const rows = timeline.map((entry, i) => {
    const prev = timeline[i - 1];
    const next = timeline[i + 1];
    const closeToPrev =
      entry.kind === "msg" && prev?.kind === "msg" &&
      prev.msg.sender_id === entry.msg.sender_id && sameDay(prev.at, entry.at) &&
      new Date(entry.at).getTime() - new Date(prev.at).getTime() < 5 * 60 * 1000;
    const closeToNext =
      entry.kind === "msg" && next?.kind === "msg" &&
      next.msg.sender_id === entry.msg.sender_id && sameDay(next.at, entry.at) &&
      new Date(next.at).getTime() - new Date(entry.at).getTime() < 5 * 60 * 1000;
    return {
      entry,
      showDayDivider: !prev || !sameDay(prev.at, entry.at),
      isFirstInGroup: !closeToPrev,
      isLastInGroup: !closeToNext,
    };
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, exchanges, otherTyping]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const replyId = replyTarget?.id ?? null;
    setReplyTarget(null);
    const { message, error } = await sendMessage(conversation.id, currentUserId, body, replyId);
    if (error) { setText(body); return; }
    if (message) appendMessage(message);
  };

  const sendQuick = async (body: string) => {
    const { message } = await sendMessage(conversation.id, currentUserId, body);
    if (message) appendMessage(message);
  };

  const onTextChange = (v: string) => {
    setText(v);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      typingRef.current?.sendTyping(currentUserId);
    }
  };

  const handleReact = async (m: Message, emoji: string) => {
    setActiveMsgId(null);
    const current = m.reactions ?? {};
    const holders = current[emoji] ?? [];
    const has = holders.includes(currentUserId);
    const nextHolders = has ? holders.filter((id) => id !== currentUserId) : [...holders, currentUserId];
    const next = { ...current };
    if (nextHolders.length > 0) next[emoji] = nextHolders; else delete next[emoji];
    updateMessage({ ...m, reactions: next });
    await toggleReaction(m, currentUserId, emoji);
  };

  const handleReply = (m: Message) => {
    setReplyTarget(m);
    setActiveMsgId(null);
  };

  const submitRating = async () => {
    if (rateValue < 1) return;
    setRatingBusy(true);
    const { error } = await submitReview(currentUserId, otherId, conversation.listing_id, rateValue, rateComment);
    setRatingBusy(false);
    if (error) { alert("Couldn't submit rating — " + error); return; }
    setRateOpen(false);
    setRateValue(0);
    setRateComment("");
  };

  // ── Photo ──
  const onPickImage = async (files: FileList | null) => {
    const f = files?.[0];
    if (f) {
      setUploading(true);
      const { url, error } = await uploadChatImage(f, currentUserId);
      setUploading(false);
      if (url) {
        const replyId = replyTarget?.id ?? null;
        setReplyTarget(null);
        const { message } = await sendMediaMessage(conversation.id, currentUserId, { url, type: "image" }, replyId);
        if (message) appendMessage(message);
      } else if (error) alert(error);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Voice ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRecRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelRecRef.current) return;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const secs = recSecRef.current;
        if (secs < 1) return; // too short
        setUploading(true);
        const { url, error } = await uploadChatVoice(blob, currentUserId);
        setUploading(false);
        if (url) {
          const replyId = replyTarget?.id ?? null;
          setReplyTarget(null);
          const { message } = await sendMediaMessage(conversation.id, currentUserId, { url, type: "voice", durationSec: secs }, replyId);
          if (message) appendMessage(message);
        } else if (error) alert(error);
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecSeconds(0);
      recSecRef.current = 0;
      recTimerRef.current = setInterval(() => {
        recSecRef.current += 1;
        setRecSeconds(recSecRef.current);
        if (recSecRef.current >= MAX_RECORDING_SECONDS) stopRecording(true);
      }, 1000);
    } catch {
      alert("Microphone access is needed to record a voice message. Please allow it and try again.");
    }
  };

  const stopRecording = (sendIt: boolean) => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    cancelRecRef.current = !sendIt;
    setRecording(false);
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  };

  const dotStyle = (delay: number): React.CSSProperties => ({
    width: 6, height: 6, borderRadius: 999, background: C.mute,
    animation: `dbTypingDot 1.2s ${delay}s infinite`,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, background: C.ivory }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
        <div style={{ width: 38, height: 38, borderRadius: 999, background: "linear-gradient(135deg,#7A2A3A 0%,#45121F 100%)", display: "grid", placeItems: "center", color: "#fff", fontFamily: "Cormorant Garamond", fontSize: 18 }}>
          {(otherName[0] || "?").toUpperCase()}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontFamily: "Jost", fontSize: 14, fontWeight: 600, color: C.ink }}>{otherName}</div>
          <div style={{ fontFamily: "Jost", fontSize: 11, color: C.mute }}>
            {otherTyping ? <span style={{ color: C.wine, fontWeight: 600 }}>typing…</span> : conversation.listing_title}
          </div>
        </div>
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="More" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", top: 38, right: 0, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(43,15,25,.16)", overflow: "hidden", zIndex: 10, minWidth: 150 }}>
              <button onClick={() => { setMenuOpen(false); setRateOpen(true); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", background: "#fff", fontFamily: "Jost", fontSize: 13.5, color: C.ink, cursor: "pointer" }}>⭐ Rate {otherName}</button>
              <button onClick={() => { setMenuOpen(false); onReportUser(otherId, otherName); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", borderTop: `1px solid ${C.line}`, background: "#fff", fontFamily: "Jost", fontSize: 13.5, color: C.ink, cursor: "pointer" }}>⚐ Report {otherName}</button>
              <button onClick={() => { setMenuOpen(false); onBlockUser(otherId, otherName); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", borderTop: `1px solid ${C.line}`, background: "#fff", fontFamily: "Jost", fontSize: 13.5, color: "#C8102E", cursor: "pointer" }}>🚫 Block {otherName}</button>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", background: C.ivory }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ChatBubbleSkeleton />
            <ChatBubbleSkeleton mine />
            <ChatBubbleSkeleton />
          </div>
        ) : timeline.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <div style={{ fontFamily: "Jost", fontSize: 13, color: C.mute, lineHeight: 1.6, marginBottom: 14 }}>
              Say salaam 👋<br />Ask about size, condition, or price.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {STARTER_PROMPTS.map((p) => (
                <button key={p} onClick={() => sendQuick(p)} style={{ fontFamily: "Jost", fontSize: 12.5, padding: "8px 13px", borderRadius: 20, border: `1px solid ${C.goldSoft}`, background: "#fff", color: C.wine, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          rows.map(({ entry, showDayDivider, isFirstInGroup, isLastInGroup }) => {
            if (entry.kind === "exch") {
              return (
                <div key={`x${entry.exch.id}`}>
                  {showDayDivider && (
                    <div style={{ textAlign: "center", margin: "10px 0" }}>
                      <span style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, background: "rgba(255,255,255,.7)", padding: "4px 12px", borderRadius: 20 }}>{dayLabel(entry.at)}</span>
                    </div>
                  )}
                  <ExchangeCard
                    req={entry.exch}
                    isOwner={entry.exch.owner_id === currentUserId}
                    onAccept={() => acceptExchange(entry.exch)}
                    onDecline={() => declineExchange(entry.exch)}
                    onImageTap={setOpenImage}
                  />
                </div>
              );
            }
            if (entry.kind === "offer") {
              return (
                <div key={`o${entry.offer.id}`}>
                  {showDayDivider && (
                    <div style={{ textAlign: "center", margin: "10px 0" }}>
                      <span style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, background: "rgba(255,255,255,.7)", padding: "4px 12px", borderRadius: 20 }}>{dayLabel(entry.at)}</span>
                    </div>
                  )}
                  <PriceOfferCard
                    offer={entry.offer}
                    isOwner={entry.offer.owner_id === currentUserId}
                    onAccept={() => acceptOffer(entry.offer)}
                    onDecline={() => declineOffer(entry.offer)}
                  />
                </div>
              );
            }
            const m = entry.msg;
            const mine = m.sender_id === currentUserId;
            const isLastMine = mine && lastMine?.id === m.id;
            const quote = quoteLabel(messages.find((x) => x.id === m.reply_to_id), currentUserId, otherName);
            const reactionEntries = Object.entries(m.reactions ?? {}).filter(([, ids]) => ids.length > 0);

            return (
              <div key={m.id}>
                {showDayDivider && (
                  <div style={{ textAlign: "center", margin: "10px 0" }}>
                    <span style={{ fontFamily: "Jost", fontSize: 11, color: C.mute, background: "rgba(255,255,255,.7)", padding: "4px 12px", borderRadius: 20 }}>{dayLabel(entry.at)}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginTop: isFirstInGroup ? 10 : 2, flexDirection: mine ? "row-reverse" : "row" }}>
                  <div
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%",
                      animation: "dbMsgIn .18s ease-out",
                    }}
                    onClick={() => { if (!m.media_url) setActiveMsgId((id) => (id === m.id ? null : m.id)); }}
                  >
                    {quote && (
                      <div style={{
                        borderLeft: `3px solid ${mine ? "rgba(255,255,255,.55)" : C.gold}`,
                        paddingLeft: 8, marginBottom: 4, opacity: 0.85,
                        background: mine ? "rgba(255,255,255,.08)" : "rgba(176,138,62,.06)",
                        borderRadius: 6, padding: "4px 8px 4px 8px",
                      }}>
                        <div style={{ fontFamily: "Jost", fontSize: 11, fontWeight: 600, color: mine ? "#fff" : C.wine }}>{quote.who}</div>
                        <div style={{ fontFamily: "Jost", fontSize: 12, color: mine ? "rgba(255,255,255,.85)" : C.mute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{quote.text}</div>
                      </div>
                    )}
                    {m.media_type === "image" && m.media_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.media_url}
                        alt={mine ? "Photo you sent" : `Photo from ${otherName}`}
                        onClick={() => setOpenImage(m.media_url!)}
                        style={{ maxWidth: 210, width: "100%", borderRadius: 16, display: "block", cursor: "pointer", border: `1px solid ${C.line}` }}
                      />
                    ) : m.media_type === "voice" && m.media_url ? (
                      <VoiceBubble url={m.media_url} duration={m.duration_sec ?? 0} mine={mine} />
                    ) : (
                      <div style={{
                        fontFamily: "Jost", fontSize: 14, lineHeight: 1.4,
                        padding: "9px 13px", borderRadius: 16,
                        borderBottomRightRadius: mine && isLastInGroup ? 4 : 16,
                        borderBottomLeftRadius: !mine && isLastInGroup ? 4 : 16,
                        background: mine ? C.wine : "#fff",
                        color: mine ? "#fff" : C.ink,
                        border: mine ? "none" : `1px solid ${C.line}`,
                        whiteSpace: "pre-wrap", wordBreak: "break-word", cursor: "pointer",
                      }}>
                        {m.body}
                      </div>
                    )}
                    {reactionEntries.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        {reactionEntries.map(([emoji, ids]) => (
                          <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); handleReact(m, emoji); }}
                            style={{
                              fontFamily: "Jost", fontSize: 12, padding: "2px 7px", borderRadius: 12,
                              border: `1px solid ${ids.includes(currentUserId) ? C.wine : C.line}`,
                              background: ids.includes(currentUserId) ? "rgba(78,22,34,.08)" : "#fff",
                              cursor: "pointer",
                            }}
                          >
                            {emoji}{ids.length > 1 ? ` ${ids.length}` : ""}
                          </button>
                        ))}
                      </div>
                    )}
                    {isLastInGroup && (
                      <div style={{ textAlign: mine ? "right" : "left", fontFamily: "Jost", fontSize: 10.5, color: isLastMine && lastMineSeen ? C.green : C.mute, marginTop: 3 }}>
                        {timeLabel(m.created_at)}{isLastMine ? (lastMineSeen ? " · ✓✓ Seen" : " · ✓ Sent") : ""}
                      </div>
                    )}
                  </div>
                  {!m.media_url && (
                    <button
                      onClick={() => setActiveMsgId((id) => (id === m.id ? null : m.id))}
                      aria-label="Message actions"
                      style={{ width: 22, height: 22, borderRadius: 999, border: "none", background: "transparent", color: C.mute, fontSize: 14, cursor: "pointer", flexShrink: 0, opacity: 0.6 }}
                    >
                      ⋯
                    </button>
                  )}
                </div>
                {activeMsgId === m.id && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginTop: 4,
                    alignSelf: mine ? "flex-end" : "flex-start",
                    marginLeft: mine ? "auto" : 0, width: "fit-content",
                    background: "#fff", border: `1px solid ${C.line}`, borderRadius: 20,
                    padding: "6px 10px", boxShadow: "0 4px 14px rgba(43,15,25,.12)",
                  }}>
                    {REACTION_EMOJIS.map((e) => (
                      <button key={e} onClick={() => handleReact(m, e)} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer", padding: 2 }}>{e}</button>
                    ))}
                    <button onClick={() => handleReply(m)} style={{ border: "none", background: "none", fontFamily: "Jost", fontSize: 12.5, color: C.wine, cursor: "pointer", fontWeight: 600, paddingLeft: 6, whiteSpace: "nowrap" }}>↩ Reply</button>
                  </div>
                )}
              </div>
            );
          })
        )}
        {otherTyping && (
          <div style={{ alignSelf: "flex-start", display: "flex", gap: 4, alignItems: "center", padding: "10px 14px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, borderBottomLeftRadius: 4, marginTop: 8 }}>
            <span style={dotStyle(0)} /><span style={dotStyle(0.15)} /><span style={dotStyle(0.3)} />
          </div>
        )}
        {uploading && (
          <div style={{ alignSelf: "flex-end", fontFamily: "Jost", fontSize: 12, color: C.mute, padding: "4px 6px" }}>Sending…</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Reply preview */}
      {replyTarget && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderTop: `1px solid ${C.line}`, background: C.ivory }}>
          <div style={{ flex: 1, borderLeft: `3px solid ${C.gold}`, paddingLeft: 8, minWidth: 0 }}>
            <div style={{ fontFamily: "Jost", fontSize: 11.5, fontWeight: 600, color: C.wine }}>
              Replying to {replyTarget.sender_id === currentUserId ? "yourself" : otherName}
            </div>
            <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {replyTarget.media_type === "image" ? "📷 Photo" : replyTarget.media_type === "voice" ? "🎤 Voice message" : replyTarget.body}
            </div>
          </div>
          <button onClick={() => setReplyTarget(null)} aria-label="Cancel reply" style={{ border: "none", background: "none", fontSize: 18, color: C.mute, cursor: "pointer" }}>×</button>
        </div>
      )}

      {/* Input bar */}
      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files)} style={{ display: "none" }} />

      {recording ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: `1px solid ${C.line}`, background: "#fff" }}>
          <button onClick={() => stopRecording(false)} aria-label="Cancel" style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.mute, fontSize: 17, cursor: "pointer" }}>🗑</button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#C8102E", animation: "dbPulse 1s infinite" }} />
            <span style={{ fontFamily: "Jost", fontSize: 14, color: C.ink }}>Recording… {fmtTime(recSeconds)}</span>
          </div>
          <button onClick={() => stopRecording(true)} style={{ padding: "0 18px", height: 40, borderRadius: 22, border: "none", background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Send</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderTop: `1px solid ${C.line}`, background: "#fff" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button onClick={() => setAttachOpen((o) => !o)} aria-label="Attach" style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.wine, fontSize: 20, cursor: "pointer" }}>+</button>
            {attachOpen && (
              <div style={{ position: "absolute", bottom: 48, left: 0, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(43,15,25,.16)", padding: 6, minWidth: 150, zIndex: 10 }}>
                <button onClick={() => { setAttachOpen(false); fileRef.current?.click(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 10px", border: "none", background: "#fff", borderRadius: 8, fontFamily: "Jost", fontSize: 13.5, color: C.ink, cursor: "pointer" }}>📷 Photo</button>
                <button onClick={() => { setAttachOpen(false); setOfferOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 10px", border: "none", background: "#fff", borderRadius: 8, fontFamily: "Jost", fontSize: 13.5, color: C.ink, cursor: "pointer" }}>💰 Offer price</button>
              </div>
            )}
          </div>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            maxLength={2000}
            style={{ flex: 1, fontFamily: "Jost", fontSize: 14, padding: "11px 14px", borderRadius: 22, border: `1px solid ${C.line}`, outline: "none", color: C.ink, minWidth: 0 }}
          />
          {text.trim() ? (
            <button onClick={send} style={{ padding: "0 18px", height: 40, borderRadius: 22, border: "none", background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>Send</button>
          ) : (
            <button onClick={startRecording} aria-label="Record voice" style={{ width: 40, height: 40, borderRadius: 999, border: "none", background: C.wine, color: "#fff", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>🎤</button>
          )}
        </div>
      )}

      {/* Full-screen zoomable image viewer */}
      {openImage && (
        <PhotoLightbox photos={[openImage]} index={0} setIndex={() => {}} onClose={() => setOpenImage(null)} alt="Chat photo" />
      )}

      {rateOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,15,25,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 340 }}>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine, marginBottom: 4 }}>Rate {otherName}</div>
            <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginBottom: 14 }}>How was your experience with them?</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRateValue(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} style={{ border: "none", background: "none", fontSize: 30, cursor: "pointer", color: n <= rateValue ? C.gold : C.line, lineHeight: 1 }}>★</button>
              ))}
            </div>
            <textarea
              value={rateComment}
              onChange={(e) => setRateComment(e.target.value)}
              placeholder="Optional comment…"
              maxLength={300}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "Jost", fontSize: 13.5, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, outline: "none", resize: "none", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setRateOpen(false); setRateValue(0); setRateComment(""); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>Cancel</button>
              <button onClick={submitRating} disabled={rateValue < 1 || ratingBusy} style={{ flex: 1.3, padding: "11px 0", borderRadius: 10, border: "none", background: rateValue < 1 || ratingBusy ? C.mute : C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: rateValue < 1 || ratingBusy ? "default" : "pointer" }}>
                {ratingBusy ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {offerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,15,25,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 340 }}>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine, marginBottom: 4 }}>Offer a price</div>
            <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginBottom: 14 }}>{conversation.listing_title}</div>
            <label style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.mute, marginBottom: 6, display: "block" }}>Your offer (Rs)</label>
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="e.g. 15000"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "Jost", fontSize: 14, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, outline: "none", marginBottom: 12 }}
            />
            <textarea
              value={offerNote}
              onChange={(e) => setOfferNote(e.target.value)}
              placeholder="Optional note…"
              maxLength={200}
              rows={2}
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "Jost", fontSize: 13.5, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, outline: "none", resize: "none", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setOfferOpen(false); setOfferAmount(""); setOfferNote(""); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>Cancel</button>
              <button onClick={submitOffer} disabled={!offerAmount || Number(offerAmount) <= 0 || offerBusy} style={{ flex: 1.3, padding: "11px 0", borderRadius: 10, border: "none", background: !offerAmount || offerBusy ? C.mute : C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 13.5, cursor: !offerAmount || offerBusy ? "default" : "pointer" }}>
                {offerBusy ? "Sending…" : "Send offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export function VoiceBubble({ url, duration, mine }: { url: string; duration: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 16,
      borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4,
      background: mine ? C.wine : "#fff", color: mine ? "#fff" : C.ink,
      border: mine ? "none" : `1px solid ${C.line}`, minWidth: 170,
    }}>
      <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} style={{ width: 32, height: 32, borderRadius: 999, border: "none", background: mine ? "rgba(255,255,255,.22)" : C.wine, color: "#fff", fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
        {playing ? "❚❚" : "▶"}
      </button>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: mine ? "rgba(255,255,255,.3)" : C.line, overflow: "hidden" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: mine ? "#fff" : C.wine }} />
      </div>
      <span style={{ fontFamily: "Jost", fontSize: 11, opacity: 0.85, flexShrink: 0 }}>{fmtTime(duration)}</span>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => { const a = e.currentTarget; if (a.duration) setProgress(a.currentTime / a.duration); }}
      />
    </div>
  );
}

export function PriceOfferCard({
  offer, isOwner, onAccept, onDecline, readOnly = false,
}: {
  offer: PriceOffer;
  isOwner: boolean;
  onAccept: () => void;
  onDecline: () => void;
  readOnly?: boolean;
}) {
  const statusColor = offer.status === "accepted" ? C.green : offer.status === "declined" ? "#B23A48" : C.gold;

  return (
    <div style={{ alignSelf: "stretch", background: "#fff", border: `1px solid ${statusColor}`, borderRadius: 16, padding: 13, margin: "4px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: statusColor, fontWeight: 600 }}>
          💰 Price offer
        </span>
        {offer.status !== "pending" && (
          <span style={{ fontFamily: "Jost", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: statusColor, border: `1px solid ${statusColor}`, padding: "2px 8px", borderRadius: 20 }}>
            {offer.status}
          </span>
        )}
      </div>

      <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginBottom: 6, lineHeight: 1.4 }}>
        <b style={{ color: C.ink }}>{offer.offerer_name}</b> offered for <b style={{ color: C.ink }}>{offer.listing_title}</b>
      </div>

      <div style={{ fontFamily: "Cormorant Garamond", fontSize: 24, color: C.wine }}>{PKR(offer.amount)}</div>

      {offer.note && (
        <div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink, marginTop: 10, padding: "8px 10px", background: "rgba(176,138,62,.06)", borderRadius: 8, lineHeight: 1.4 }}>“{offer.note}”</div>
      )}

      {offer.status === "pending" && !readOnly ? (
        isOwner ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onDecline} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Decline</button>
            <button onClick={onAccept} style={{ flex: 1.3, padding: "11px 0", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Accept</button>
          </div>
        ) : (
          <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginTop: 12, textAlign: "center" }}>Waiting for their response…</div>
        )
      ) : null}
    </div>
  );
}

export function ExchangeCard({
  req, isOwner, onAccept, onDecline, onImageTap, readOnly = false,
}: {
  req: ExchangeRequest;
  isOwner: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onImageTap: (url: string) => void;
  readOnly?: boolean;
}) {
  const statusColor = req.status === "accepted" ? C.green : req.status === "declined" ? "#B23A48" : C.gold;
  const lab: React.CSSProperties = { fontFamily: "Jost", fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase", color: C.mute };

  return (
    <div style={{ alignSelf: "stretch", background: "#fff", border: `1px solid ${statusColor}`, borderRadius: 16, padding: 13, margin: "4px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "Jost", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: statusColor, fontWeight: 600 }}>
          ⇄ Exchange offer
        </span>
        {req.status !== "pending" && (
          <span style={{ fontFamily: "Jost", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: statusColor, border: `1px solid ${statusColor}`, padding: "2px 8px", borderRadius: 20 }}>
            {req.status}
          </span>
        )}
      </div>

      <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginBottom: 10, lineHeight: 1.4 }}>
        <b style={{ color: C.ink }}>{req.requester_name}</b> offers their suit for <b style={{ color: C.ink }}>{req.listing_title}</b>
      </div>

      {req.offered_images?.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
          {req.offered_images.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt={`Photo of ${req.offered_title}`} onClick={() => onImageTap(u)} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: `1px solid ${C.line}`, cursor: "pointer" }} />
          ))}
        </div>
      )}

      <div style={{ fontFamily: "Cormorant Garamond", fontSize: 19, color: C.ink, lineHeight: 1.1 }}>{req.offered_title}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 8 }}>
        {req.offered_size && <div><div style={lab}>Size</div><div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink }}>{req.offered_size}</div></div>}
        {req.offered_condition && <div><div style={lab}>Condition</div><div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink }}>{req.offered_condition}</div></div>}
        {req.offered_value != null && <div><div style={lab}>Value</div><div style={{ fontFamily: "Jost", fontSize: 13, color: C.wine }}>{PKR(req.offered_value)}</div></div>}
      </div>

      {req.offered_note && (
        <div style={{ fontFamily: "Jost", fontSize: 13, color: C.ink, marginTop: 10, padding: "8px 10px", background: "rgba(176,138,62,.06)", borderRadius: 8, lineHeight: 1.4 }}>“{req.offered_note}”</div>
      )}

      {req.status === "pending" && !readOnly ? (
        isOwner ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onDecline} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "#fff", color: C.mute, fontFamily: "Jost", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Decline</button>
            <button onClick={onAccept} style={{ flex: 1.3, padding: "11px 0", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Accept</button>
          </div>
        ) : (
          <div style={{ fontFamily: "Jost", fontSize: 12.5, color: C.mute, marginTop: 12, textAlign: "center" }}>Waiting for their response…</div>
        )
      ) : null}
    </div>
  );
}
