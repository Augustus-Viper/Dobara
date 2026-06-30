"use client";
import { useEffect, useState } from "react";
import { C } from "@/lib/constants";
import { Conversation, fetchMyConversations } from "@/lib/chat";
import Motif from "./Motif";
import Divider from "./Divider";

export default function Inbox({
  currentUserId,
  unread,
  onOpen,
}: {
  currentUserId: string;
  unread: Set<number>;
  onOpen: (c: Conversation) => void;
}) {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyConversations(currentUserId).then((rows) => {
      setConvos(rows);
      setLoading(false);
    });
  }, [currentUserId]);

  return (
    <div style={{ padding: "16px 18px 0" }}>
      <h2 style={{ fontFamily: "Cormorant Garamond", fontSize: 24, color: C.ink, margin: 0 }}>Messages</h2>
      <Divider />

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "Jost", fontSize: 14, color: C.mute }}>Loading…</div>
      ) : convos.length === 0 ? (
        <div style={{ padding: "50px 20px", textAlign: "center" }}>
          <Motif size={26} style={{ opacity: 0.6 }} />
          <p style={{ fontFamily: "Jost", fontSize: 14, color: C.mute, marginTop: 12, lineHeight: 1.6 }}>
            No messages yet.<br />Open any suit and tap <b>Message seller</b> to start chatting.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {convos.map((c) => {
            const otherName = currentUserId === c.buyer_id ? c.seller_name : c.buyer_name;
            const role = currentUserId === c.buyer_id ? "Buying" : "Selling";
            const isUnread = unread.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onOpen(c)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 999, background: "linear-gradient(135deg,#7A2A3A 0%,#45121F 100%)", display: "grid", placeItems: "center", color: "#fff", fontFamily: "Cormorant Garamond", fontSize: 19, flexShrink: 0 }}>
                  {(otherName[0] || "?").toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Jost", fontSize: 14, fontWeight: isUnread ? 700 : 600, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
                    {otherName}
                    {isUnread && <span style={{ width: 9, height: 9, borderRadius: 999, background: "#C8102E", flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontFamily: "Jost", fontSize: 12, color: C.mute, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.listing_title}</div>
                </div>
                <span style={{ fontFamily: "Jost", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: role === "Selling" ? C.green : C.wine, border: `1px solid ${role === "Selling" ? C.green : C.wine}`, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>{role}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
