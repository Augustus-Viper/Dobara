import type { MetadataRoute } from "next";

const SITE = "https://www.dobara.com.pk";

async function getActiveListingIds(): Promise<{ id: string | number; created_at: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/listings?status=eq.active&select=id,created_at&order=created_at.desc&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await getActiveListingIds();
  return [
    { url: SITE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...listings.map((l) => ({
      url: `${SITE}/listing/${l.id}`,
      lastModified: new Date(l.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
