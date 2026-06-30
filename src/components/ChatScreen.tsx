"use client";
import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/constants";
import {
  Conversation, Message,
  fetchMessages, sendMessage, sendMediaMessage, subscribeToMessages,
  markConversationRead, subscribeToConversation,
} from "@/lib/chat";
import { uploadChatImage, uploadChatVoice } from "@/lib/storage";
import { PKR } from "@/lib/constants";
import {
  ExchangeRequest, fetchExchangeRequests, setExchangeStatus, subscribeToExchangeRequests,
} from "@/lib/exchange";
import PhotoLightbox from "./PhotoLightbox";

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

  const [otherLastRead, setOtherLastRead] = useState<string | null>(
    (iAmBuyer ? conversation.seller_last_read : conversation.buyer_last_read) ?? null
  );

  const [exchanges, setExchanges] = useState<ExchangeRequest[]>([]);

  const appendMessage = (m: Message) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

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
    const unsubConvo = subscribeToConversation(conversation.id, (c) => {
      setOtherLastRead((iAmBuyer ? c.seller_last_read : c.buyer_last_read) ?? null);
    });

    fetchExchangeRequests(conversation.id).then((rows) => { if (active) setExchanges(rows); });
    const unsubExch = subscribeToExchangeRequests(conversation.id, upsertExchange);

    return () => { active = false; unsubMsg(); unsubConvo(); unsubExch(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, currentUserId, iAmBuyer]);

  const lastMine = [...messages].reverse().find((m) => m.sender_id === currentUserId);
  const lastMineSeen =
    !!lastMine && !!otherLastRead && new Date(otherLastRead) >= new Date(lastMine.created_at);

  // Merge messages + exchange cards into one time-ordered timeline
  const timeline = [
    ...messages.map((m) => ({ kind: "msg" as const, at: m.created_at, msg: m })),
    ...exchanges.map((x) => ({ kind: "exch" as const, at: x.created_at, exch: x })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, exchanges]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const { message, error } = await sendMessage(conversation.id, currentUserId, body);
    if (error) { setText(body); return; }
    if (message) appendMessage(message);
  };

  // ── Photo ──
  const onPickImage = async (files: FileList | null) => {
    const f = files?.[0];
    if (f) {
      setUploading(true);
      const { url, error } = await uploadChatImage(f, currentUserId);
      setUploading(false);
      if (url) {
        const { message } = await sendMediaMessage(conversation.id, currentUserId, { url, type: "image" });
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
          const { message } = await sendMediaMessage(conversation.id, currentUserId, { url, type: "voice", durationSec: secs });
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
          <div style={{ fontFamily: "Jost", fontSize: 11, color: C.mute }}>{conversation.listing_title}</div>
        </div>
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="More" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", top: 38, right: 0, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(43,15,25,.16)", overflow: "hidden", zIndex: 10, minWidth: 150 }}>
              <button onClick={() => { setMenuOpen(false); onReportUser(otherId, otherName); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", background: "#fff", fontFamily: "Jost", fontSize: 13.5, color: C.ink, cursor: "pointer" }}>⚐ Report {otherName}</button>
              <button onClick={() => { setMenuOpen(false); onBlockUser(otherId, otherName); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", borderTop: `1px solid ${C.line}`, background: "#fff", fontFamily: "Jost", fontSize: 13.5, color: "#C8102E", cursor: "pointer" }}>🚫 Block {otherName}</button>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8, background: C.ivory }}>
        {loading ? (
          <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
        ) : timeline.length === 0 ? (
          <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 30, lineHeight: 1.6 }}>
            Say salaam 👋<br />Ask about size, condition, or price.
          </div>
        ) : (
          timeline.map((entry) => {
            if (entry.kind === "exch") {
              return (
                <ExchangeCard
                  key={`x${entry.exch.id}`}
                  req={entry.exch}
                  isOwner={entry.exch.owner_id === currentUserId}
                  onAccept={() => acceptExchange(entry.exch)}
                  onDecline={() => declineExchange(entry.exch)}
                  onImageTap={setOpenImage}
                />
              );
            }
            const m = entry.msg;
            const mine = m.sender_id === currentUserId;
            const isLastMine = mine && lastMine?.id === m.id;
            return (
              <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                {m.media_type === "image" && m.media_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.media_url}
                    alt=""
                    onClick={() => setOpenImage(m.media_url!)}
                    style={{ maxWidth: 210, width: "100%", borderRadius: 16, display: "block", cursor: "pointer", border: `1px solid ${C.line}` }}
                  />
                ) : m.media_type === "voice" && m.media_url ? (
                  <VoiceBubble url={m.media_url} duration={m.duration_sec ?? 0} mine={mine} />
                ) : (
                  <div style={{
                    fontFamily: "Jost", fontSize: 14, lineHeight: 1.4,
                    padding: "9px 13px", borderRadius: 16,
                    borderBottomRightRadius: mine ? 4 : 16,
                    borderBottomLeftRadius: mine ? 16 : 4,
                    background: mine ? C.wine : "#fff",
                    color: mine ? "#fff" : C.ink,
                    border: mine ? "none" : `1px solid ${C.line}`,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {m.body}
                  </div>
                )}
                {isLastMine && (
                  <div style={{ textAlign: "right", fontFamily: "Jost", fontSize: 10.5, color: lastMineSeen ? C.green : C.mute, marginTop: 3, marginRight: 2 }}>
                    {lastMineSeen ? "✓✓ Seen" : "✓ Sent"}
                  </div>
                )}
              </div>
            );
          })
        )}
        {uploading && (
          <div style={{ alignSelf: "flex-end", fontFamily: "Jost", fontSize: 12, color: C.mute, padding: "4px 6px" }}>Sending…</div>
        )}
        <div ref={endRef} />
      </div>

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
          <button onClick={() => fileRef.current?.click()} aria-label="Send photo" style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.wine, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>📷</button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
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
        <PhotoLightbox photos={[openImage]} index={0} setIndex={() => {}} onClose={() => setOpenImage(null)} />
      )}
    </div>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function VoiceBubble({ url, duration, mine }: { url: string; duration: number; mine: boolean }) {
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

function ExchangeCard({
  req, isOwner, onAccept, onDecline, onImageTap,
}: {
  req: ExchangeRequest;
  isOwner: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onImageTap: (url: string) => void;
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
            <img key={i} src={u} alt="" onClick={() => onImageTap(u)} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: `1px solid ${C.line}`, cursor: "pointer" }} />
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

      {req.status === "pending" ? (
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
