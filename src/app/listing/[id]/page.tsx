import type { Metadata } from "next";
import ListingRedirect from "@/components/ListingRedirect";

interface ListingMeta {
  title: string;
  price: number;
  city: string;
  occasion: string;
  images: string[] | null;
}

async function getListing(id: string): Promise<ListingMeta | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/listings?id=eq.${id}&select=title,price,city,occasion,images`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

const pkr = (n: number) => "Rs " + Number(n).toLocaleString("en-PK");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const l = await getListing(id);
  if (!l) {
    return { title: "Dobara", description: "Preloved desi formal wear — worn once, loved again." };
  }
  const title = `${l.title} · Dobara`;
  const description = `${l.occasion} · ${l.city} · ${pkr(l.price)} — preloved formal wear on Dobara`;
  const image = l.images && l.images.length > 0 ? l.images[0] : "/icon-512.png";
  return {
    title,
    description,
    openGraph: { title, description, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ListingSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingRedirect id={id} />;
}
