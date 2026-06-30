"use client";
import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/constants";
import {
  Conversation, Message,
  fetchMessages, sendMessage, sendMediaMessage, subscribeToMessages,
  markConversationRead, subscribeToConversation,
} from "@/lib/chat";
import { uploadChatImage, uploadChatVoice } from "@/lib/storage";

export default function ChatScreen({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
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

  const [otherLastRead, setOtherLastRead] = useState<string | null>(
    (iAmBuyer ? conversation.seller_last_read : conversation.buyer_last_read) ?? null
  );

  const appendMessage = (m: Message) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

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
    return () => { active = false; unsubMsg(); unsubConvo(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, currentUserId, iAmBuyer]);

  const lastMine = [...messages].reverse().find((m) => m.sender_id === currentUserId);
  const lastMineSeen =
    !!lastMine && !!otherLastRead && new Date(otherLastRead) >= new Date(lastMine.created_at);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8, background: C.ivory }}>
        {loading ? (
          <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 20 }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", fontFamily: "Jost", fontSize: 13, color: C.mute, marginTop: 30, lineHeight: 1.6 }}>
            Say salaam 👋<br />Ask about size, condition, or price.
          </div>
        ) : (
          messages.map((m) => {
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

      {/* Full-screen image viewer */}
      {openImage && (
        <div onClick={() => setOpenImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={openImage} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <button onClick={() => setOpenImage(null)} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 999, border: "none", background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
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
