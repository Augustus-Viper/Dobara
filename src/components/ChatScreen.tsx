"use client";
import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/constants";
import {
  Conversation, Message,
  fetchMessages, sendMessage, subscribeToMessages,
  markConversationRead, subscribeToConversation,
} from "@/lib/chat";

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
  const endRef = useRef<HTMLDivElement>(null);

  const iAmBuyer = currentUserId === conversation.buyer_id;
  const otherName = iAmBuyer ? conversation.seller_name : conversation.buyer_name;

  // When did the OTHER person last read this chat? (drives the "Seen" label)
  const [otherLastRead, setOtherLastRead] = useState<string | null>(
    (iAmBuyer ? conversation.seller_last_read : conversation.buyer_last_read) ?? null
  );

  // Load history + subscribe to live updates
  useEffect(() => {
    let active = true;
    fetchMessages(conversation.id).then((rows) => {
      if (!active) return;
      setMessages(rows);
      setLoading(false);
    });

    // Opening the chat = I've read it
    markConversationRead(conversation, currentUserId);

    // New messages arriving live
    const unsubMsg = subscribeToMessages(conversation.id, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      // If the other person messaged while I'm looking, mark read so they see "Seen"
      if (m.sender_id !== currentUserId) markConversationRead(conversation, currentUserId);
    });

    // The other person's read-receipt updating live
    const unsubConvo = subscribeToConversation(conversation.id, (c) => {
      setOtherLastRead((iAmBuyer ? c.seller_last_read : c.buyer_last_read) ?? null);
    });

    return () => { active = false; unsubMsg(); unsubConvo(); };
  }, [conversation.id, currentUserId, iAmBuyer]);

  // The last message I sent — only this one shows a Sent/Seen status
  const lastMine = [...messages].reverse().find((m) => m.sender_id === currentUserId);
  const lastMineSeen =
    !!lastMine && !!otherLastRead &&
    new Date(otherLastRead) >= new Date(lastMine.created_at);

  // Auto-scroll to newest
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const { message, error } = await sendMessage(conversation.id, currentUserId, body);
    if (error) { setText(body); return; }
    if (message) {
      setMessages((prev) => (prev.some((x) => x.id === message.id) ? prev : [...prev, message]));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
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
              <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
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
                {isLastMine && (
                  <div style={{ textAlign: "right", fontFamily: "Jost", fontSize: 10.5, color: lastMineSeen ? C.green : C.mute, marginTop: 3, marginRight: 2 }}>
                    {lastMineSeen ? "✓✓ Seen" : "✓ Sent"}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${C.line}`, background: "#fff" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          style={{ flex: 1, fontFamily: "Jost", fontSize: 14, padding: "11px 14px", borderRadius: 22, border: `1px solid ${C.line}`, outline: "none", color: C.ink }}
        />
        <button
          onClick={send}
          style={{ padding: "0 18px", borderRadius: 22, border: "none", background: C.wine, color: "#fff", fontFamily: "Jost", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
