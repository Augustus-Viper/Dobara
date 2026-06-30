// ─────────────────────────────────────────────────
// DOBARA — design tokens & app-wide constants
// ─────────────────────────────────────────────────

export const C = {
  wine:     "#4E1622",
  wineDeep: "#3A0F19",
  gold:     "#B08A3E",
  goldSoft: "#CBA85E",
  ivory:    "#FBF5EF",
  card:     "#FFFFFF",
  ink:      "#2B1A1C",
  mute:     "#8A6E72",
  line:     "#EADFD6",
  green:    "#1F5A45",
} as const;

export const SWATCHES: Record<string, string> = {
  maroon:      "linear-gradient(135deg,#6E1F31 0%,#3A0F19 100%)",
  emerald:     "linear-gradient(135deg,#1F6B52 0%,#0E3A2C 100%)",
  ivory:       "linear-gradient(135deg,#F3E9DC 0%,#D9C6AE 100%)",
  rose:        "linear-gradient(135deg,#D8A0A8 0%,#A85C68 100%)",
  gold:        "linear-gradient(135deg,#D9B25A 0%,#9A7327 100%)",
  mustard:     "linear-gradient(135deg,#D9A53A 0%,#9A6E18 100%)",
  navy:        "linear-gradient(135deg,#3A4A78 0%,#1A2240 100%)",
  wine:        "linear-gradient(135deg,#7A2A3A 0%,#45121F 100%)",
  placeholder: "linear-gradient(135deg,#EFE6DA 0%,#D6C7B6 100%)",
};

export const OCCASIONS = ["All", "Bridal", "Mehndi", "Nikkah", "Formal", "Party"] as const;
export const CITIES    = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Multan", "Other"] as const;
export const CONDITIONS = ["Worn once", "Worn twice", "Custom"] as const;
export const FIT_TYPES  = ["Stitched", "Semi-stitched", "Unstitched", "Free size"] as const;

export const MEASUREMENT_FIELDS: [string, string][] = [
  ["shoulder", "Shoulder"],
  ["bust",     "Bust"],
  ["waist",    "Waist"],
  ["hips",     "Hips"],
  ["length",   "Length"],
  ["sleeve",   "Sleeve"],
];

export const PKR = (n: number) =>
  "Rs " + Number(n).toLocaleString("en-PK");

// Seed listings — used until real Supabase data loads
export const SEED_LISTINGS = [
  { id: 1,  title: "Zari Work Bridal Lehenga",    occasion: "Bridal",  tone: "maroon",  colour: "Deep maroon & gold", fit: "Stitched",      measurements: { shoulder:15, bust:36, waist:30, hips:38, length:42, sleeve:18 }, can_alter: true,  city: "Lahore",     original_price: 145000, price: 62000, condition: "Worn once",  open_to_exchange: false, fabric: "Raw silk with heavy gold zari",     seller_name: "Mahnoor", seller_rating: 4.9, seller_verified: true  },
  { id: 2,  title: "Emerald Gota Sharara",         occasion: "Mehndi",  tone: "emerald", colour: "Emerald green",      fit: "Stitched",      measurements: { shoulder:14, bust:34, waist:28, hips:36, length:40, sleeve:17 }, can_alter: false, city: "Karachi",    original_price:  48000, price: 19500, condition: "Worn once",  open_to_exchange: true,  fabric: "Organza with gota and mirror",      seller_name: "Hira",    seller_rating: 4.7, seller_verified: true  },
  { id: 3,  title: "Ivory Pearl Embellished Suit", occasion: "Formal",  tone: "ivory",   colour: "Ivory & pearl",      fit: "Semi-stitched", measurements: {},                                                                  can_alter: true,  city: "Islamabad",  original_price:  32000, price: 12000, condition: "Like new",   open_to_exchange: false, fabric: "Chiffon with pearl handwork",       seller_name: "Anaya",   seller_rating: 4.8, seller_verified: false },
  { id: 4,  title: "Dusty Rose Organza Maxi",      occasion: "Party",   tone: "rose",    colour: "Dusty rose",         fit: "Stitched",      measurements: { shoulder:14, bust:35, waist:29, hips:37, length:52, sleeve:16 }, can_alter: false, city: "Lahore",     original_price:  28000, price: 11000, condition: "Worn twice", open_to_exchange: true,  fabric: "Layered organza",                   seller_name: "Fatima",  seller_rating: 4.6, seller_verified: true  },
  { id: 5,  title: "Antique Gold Tissue Suit",     occasion: "Nikkah",  tone: "gold",    colour: "Antique gold",       fit: "Stitched",      measurements: { shoulder:15, bust:36, waist:31, hips:39, length:44, sleeve:18 }, can_alter: true,  city: "Karachi",    original_price:  85000, price: 38000, condition: "Worn once",  open_to_exchange: false, fabric: "Tissue with dabka work",            seller_name: "Zoya",    seller_rating: 5.0, seller_verified: true  },
  { id: 6,  title: "Mustard Mirror-Work Lehenga",  occasion: "Mehndi",  tone: "mustard", colour: "Mustard yellow",     fit: "Free size",     measurements: {},                                                                  can_alter: false, city: "Faisalabad", original_price:  22000, price:  8500, condition: "Worn once",  open_to_exchange: true,  fabric: "Cotton net, mirror work",           seller_name: "Aiman",   seller_rating: 4.5, seller_verified: false },
  { id: 7,  title: "Midnight Velvet Formal",       occasion: "Formal",  tone: "navy",    colour: "Midnight navy",      fit: "Stitched",      measurements: { shoulder:14, bust:34, waist:28, hips:36, length:45, sleeve:22 }, can_alter: true,  city: "Lahore",     original_price:  55000, price: 24000, condition: "Like new",   open_to_exchange: false, fabric: "Velvet with resham embroidery",     seller_name: "Sana",    seller_rating: 4.9, seller_verified: true  },
  { id: 8,  title: "Wine Chiffon Saree",           occasion: "Party",   tone: "wine",    colour: "Wine",               fit: "Free size",     measurements: {},                                                                  can_alter: false, city: "Islamabad",  original_price:  18000, price:  7000, condition: "Worn twice", open_to_exchange: true,  fabric: "Pure chiffon, sequin pallu",        seller_name: "Rabia",   seller_rating: 4.4, seller_verified: false },
];
