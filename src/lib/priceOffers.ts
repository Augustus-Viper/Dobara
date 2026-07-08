import { supabase } from "./supabase";

export interface PriceOffer {
  id: number;
  created_at: string;
  conversation_id: number;
  listing_id: number | null;
  listing_title: string;
  offerer_id: string;
  offerer_name: string;
  owner_id: string;
  amount: number;
  note: string | null;
  status: "pending" | "accepted" | "declined";
}

export async function createPriceOffer(
  offer: Omit<PriceOffer, "id" | "created_at" | "status">
): Promise<{ offer: PriceOffer | null; error: string | null }> {
  const { data, error } = await supabase.from("price_offers").insert(offer).select().single();
  if (error) return { offer: null, error: error.message };
  return { offer: data as PriceOffer, error: null };
}

export async function fetchPriceOffers(conversationId: number): Promise<PriceOffer[]> {
  const { data, error } = await supabase
    .from("price_offers")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) { console.error("fetchPriceOffers:", error.message); return []; }
  return (data ?? []) as PriceOffer[];
}

export async function setPriceOfferStatus(
  id: number,
  status: "accepted" | "declined"
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("price_offers").update({ status }).eq("id", id);
  return { error: error ? error.message : null };
}

export function subscribeToPriceOffers(
  conversationId: number,
  onChange: (o: PriceOffer) => void
) {
  const channel = supabase
    .channel(`price-offers-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "price_offers", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onChange(payload.new as PriceOffer)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
