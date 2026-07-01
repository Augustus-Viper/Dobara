// ─────────────────────────────────────────────────
// DOBARA — shared TypeScript types
// ─────────────────────────────────────────────────

export type Occasion = "Bridal" | "Mehndi" | "Nikkah" | "Formal" | "Party";
export type FitType = "Stitched" | "Semi-stitched" | "Unstitched" | "Free size";
export type Condition = "Worn once" | "Worn twice" | string;

export interface Measurements {
  shoulder?: number;
  bust?: number;
  waist?: number;
  hips?: number;
  length?: number;
  sleeve?: number;
}

export interface Listing {
  id: number | string;
  title: string;
  occasion: Occasion;
  tone: string;          // colour swatch key
  colour: string;        // human-readable colour label
  fit: FitType;
  measurements: Measurements;
  can_alter: boolean;
  city: string;
  original_price: number;
  price: number;
  condition: Condition;
  open_to_exchange: boolean;
  fabric: string;
  seller_name: string;
  seller_rating: number;
  seller_verified: boolean;
  images?: string[];     // public URLs of uploaded photos
  status?: "active" | "sold" | string;
  whatsapp?: string | null;   // optional WhatsApp number for direct contact
  // Added when pulling from Supabase:
  created_at?: string;
  seller_id?: string;
}
