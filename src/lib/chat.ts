import { supabase } from "./supabase";

export interface Conversation {
  id: number;
  listing_id: number;
  listing_title: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
  buyer_last_read?: string | null;
  seller_last_read?: string | null;
  created_at?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  body: string | null;
  media_url?: string | null;
  media_type?: "image" | "voice" | null;
  duration_sec?: number | null;
  created_at: string;
}

// Find an existing buyer↔listing conversation, or create one
export async function getOrCreateConversation(params: {
  listingId: number | string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
}): Promise<{ conversation: Conversation | null; error: string | null }> {
  const { listingId, listingTitle, sellerId, sellerName, buyerId, buyerName } = params;

  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (existing) return { conversation: existing as Conversation, error: null };

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      listing_id: listingId,
      listing_title: listingTitle,
      buyer_id: buyerId,
      buyer_name: buyerName,
      seller_id: sellerId,
      seller_name: sellerName,
    })
    .select()
    .single();

  if (error) return { conversation: null, error: error.message };
  return { conversation: data as Conversation, error: null };
}

// All conversations about a given listing (used to notify buyers when it's sold/removed)
export async function fetchConversationsForListing(listingId: number | string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("listing_id", listingId);
  if (error) { console.error("fetchConversationsForListing:", error.message); return []; }
  return (data ?? []) as Conversation[];
}

// All conversations the user is part of (as buyer OR seller)
export async function fetchMyConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) { console.error("fetchMyConversations:", error.message); return []; }
  return (data ?? []) as Conversation[];
}

export async function fetchMessages(conversationId: number): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) { console.error("fetchMessages:", error.message); return []; }
  return (data ?? []) as Message[];
}

export async function sendMessage(
  conversationId: number,
  senderId: string,
  body: string
): Promise<{ message: Message | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select()
    .single();

  if (error) return { message: null, error: error.message };
  return { message: data as Message, error: null };
}

// Send a photo or voice message
export async function sendMediaMessage(
  conversationId: number,
  senderId: string,
  media: { url: string; type: "image" | "voice"; durationSec?: number; body?: string }
): Promise<{ message: Message | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: media.body ?? null,
      media_url: media.url,
      media_type: media.type,
      duration_sec: media.durationSec ?? null,
    })
    .select()
    .single();

  if (error) return { message: null, error: error.message };
  return { message: data as Message, error: null };
}

// Live-subscribe to new messages in a conversation. Returns an unsubscribe fn.
export function subscribeToMessages(
  conversationId: number,
  onInsert: (m: Message) => void
) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// Mark a conversation as read NOW for the given user (their side only)
export async function markConversationRead(conversation: Conversation, userId: string) {
  const field = userId === conversation.buyer_id ? "buyer_last_read" : "seller_last_read";
  await supabase
    .from("conversations")
    .update({ [field]: new Date().toISOString() })
    .eq("id", conversation.id);
}

// Live-subscribe to a single conversation's updates (used for "Seen" receipts)
export function subscribeToConversation(
  conversationId: number,
  onUpdate: (c: Conversation) => void
) {
  const channel = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` },
      (payload) => onUpdate(payload.new as Conversation)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// Live-subscribe to every new message across ALL my conversations (for the badge).
// RLS ensures we only receive messages from conversations we're part of.
export function subscribeToAllMyMessages(onInsert: (m: Message) => void) {
  const channel = supabase
    .channel("my-messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// Which of my conversations have unread messages (from the other person)?
export async function getUnreadConversationIds(userId: string): Promise<number[]> {
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, buyer_last_read, seller_last_read")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

  if (!convos || convos.length === 0) return [];

  const ids = convos.map((c) => c.id as number);
  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", ids)
    .neq("sender_id", userId)
    .order("created_at", { ascending: false });

  // Newest message from the other person, per conversation
  const newestOther: Record<number, string> = {};
  for (const m of msgs ?? []) {
    const cid = m.conversation_id as number;
    if (!newestOther[cid]) newestOther[cid] = m.created_at as string;
  }

  const unread: number[] = [];
  for (const c of convos) {
    const cid = c.id as number;
    const newest = newestOther[cid];
    if (!newest) continue;
    const lastRead = (userId === c.buyer_id ? c.buyer_last_read : c.seller_last_read) as string | null;
    if (!lastRead || new Date(newest) > new Date(lastRead)) unread.push(cid);
  }
  return unread;
}
