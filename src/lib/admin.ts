import { supabase } from "./supabase";
import type { Listing } from "@/types/listing";

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) return false;
  return !!data;
}

export async function fetchBannedIds(): Promise<string[]> {
  const { data, error } = await supabase.from("banned_users").select("user_id");
  if (error) { console.error("fetchBannedIds:", error.message); return []; }
  return (data ?? []).map((r) => r.user_id as string);
}

export async function banUser(userId: string, reason: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("banned_users").insert({ user_id: userId, reason });
  if (error && !error.message.includes("duplicate")) return { error: error.message };
  return { error: null };
}

export async function unbanUser(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("banned_users").delete().eq("user_id", userId);
  return { error: error ? error.message : null };
}

export async function fetchAllListingsForAdmin(): Promise<Listing[]> {
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (error) { console.error("fetchAllListingsForAdmin:", error.message); return []; }
  return (data ?? []) as Listing[];
}

export async function adminDeleteListing(id: number | string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  return { error: error ? error.message : null };
}

export interface Report {
  id: number;
  reporter_id: string;
  target_type: "listing" | "user";
  target_id: string;
  reason: string;
  details: string | null;
  resolved: boolean;
  created_at: string;
}

export async function fetchAllReports(): Promise<Report[]> {
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (error) { console.error("fetchAllReports:", error.message); return []; }
  return (data ?? []) as Report[];
}

export async function resolveReport(id: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reports").update({ resolved: true }).eq("id", id);
  return { error: error ? error.message : null };
}

export interface AdminStats {
  totalUsers: number;
  newUsersThisWeek: number;
  totalListings: number;
  activeListings: number;
  soldListings: number;
  totalConversations: number;
  totalMessages: number;
  openReports: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsers, newUsersThisWeek,
    totalListings, activeListings, soldListings,
    totalConversations, totalMessages, openReports,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("resolved", false),
  ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    newUsersThisWeek: newUsersThisWeek.count ?? 0,
    totalListings: totalListings.count ?? 0,
    activeListings: activeListings.count ?? 0,
    soldListings: soldListings.count ?? 0,
    totalConversations: totalConversations.count ?? 0,
    totalMessages: totalMessages.count ?? 0,
    openReports: openReports.count ?? 0,
  };
}
