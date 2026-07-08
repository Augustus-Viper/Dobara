import { supabase } from "./supabase";
import type { Listing } from "@/types/listing";
import { Conversation, sendMessage, fetchConversationsForListing } from "./chat";

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) return false;
  return !!data;
}

async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | number,
  reason?: string | null
) {
  await supabase.from("admin_actions").insert({
    admin_id: adminId, action, target_type: targetType, target_id: String(targetId), reason: reason ?? null,
  });
}

export async function fetchBannedIds(): Promise<string[]> {
  const { data, error } = await supabase.from("banned_users").select("user_id");
  if (error) { console.error("fetchBannedIds:", error.message); return []; }
  return (data ?? []).map((r) => r.user_id as string);
}

export async function banUser(userId: string, reason: string, adminId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("banned_users").insert({ user_id: userId, reason });
  if (error && !error.message.includes("duplicate")) return { error: error.message };
  await logAdminAction(adminId, "ban_user", "user", userId, reason);
  return { error: null };
}

export async function unbanUser(userId: string, adminId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("banned_users").delete().eq("user_id", userId);
  if (!error) await logAdminAction(adminId, "unban_user", "user", userId);
  return { error: error ? error.message : null };
}

export async function fetchAllListingsForAdmin(): Promise<Listing[]> {
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (error) { console.error("fetchAllListingsForAdmin:", error.message); return []; }
  return (data ?? []) as Listing[];
}

// Deletes a listing, tells anyone chatting about it, and logs the action
export async function adminDeleteListing(
  id: number | string,
  adminId: string,
  reason?: string | null
): Promise<{ error: string | null }> {
  const { data: listing } = await supabase.from("listings").select("id,title").eq("id", id).maybeSingle();
  const convos = listing ? await fetchConversationsForListing(id) : [];

  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) return { error: error.message };

  const title = listing?.title ?? "A listing";
  await Promise.all(
    convos.map((c: Conversation) =>
      sendMessage(c.id, adminId, `🛡️ "${title}" was removed by Dobara${reason ? `: ${reason}` : "."}`)
    )
  );
  await logAdminAction(adminId, "delete_listing", "listing", id, reason ?? null);
  return { error: null };
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

export async function resolveReport(id: number, adminId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reports").update({ resolved: true }).eq("id", id);
  if (!error) await logAdminAction(adminId, "resolve_report", "report", id);
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

export interface AdminProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export async function fetchAllProfiles(): Promise<AdminProfile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) { console.error("fetchAllProfiles:", error.message); return []; }
  return (data ?? []) as AdminProfile[];
}

export async function fetchConversationsForUser(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchConversationsForUser:", error.message); return []; }
  return (data ?? []) as Conversation[];
}

export interface AdminAction {
  id: number;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  created_at: string;
}

export async function fetchAuditLog(): Promise<AdminAction[]> {
  const { data, error } = await supabase.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) { console.error("fetchAuditLog:", error.message); return []; }
  return (data ?? []) as AdminAction[];
}
