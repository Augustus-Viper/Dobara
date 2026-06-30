import { supabase } from "./supabase";

export interface ExchangeRequest {
  id: number;
  created_at: string;
  conversation_id: number;
  listing_id: number;
  listing_title: string;
  requester_id: string;
  requester_name: string;
  owner_id: string;
  offered_title: string;
  offered_size: string | null;
  offered_condition: string | null;
  offered_value: number | null;
  offered_note: string | null;
  offered_images: string[];
  status: "pending" | "accepted" | "declined";
}

export async function createExchangeRequest(
  req: Omit<ExchangeRequest, "id" | "created_at" | "status">
): Promise<{ request: ExchangeRequest | null; error: string | null }> {
  const { data, error } = await supabase
    .from("exchange_requests")
    .insert(req)
    .select()
    .single();
  if (error) return { request: null, error: error.message };
  return { request: data as ExchangeRequest, error: null };
}

export async function fetchExchangeRequests(conversationId: number): Promise<ExchangeRequest[]> {
  const { data, error } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) { console.error("fetchExchangeRequests:", error.message); return []; }
  return (data ?? []) as ExchangeRequest[];
}

export async function setExchangeStatus(
  id: number,
  status: "accepted" | "declined"
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("exchange_requests").update({ status }).eq("id", id);
  return { error: error ? error.message : null };
}

export function subscribeToExchangeRequests(
  conversationId: number,
  onChange: (r: ExchangeRequest) => void
) {
  const channel = supabase
    .channel(`exch-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "exchange_requests", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onChange(payload.new as ExchangeRequest)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
