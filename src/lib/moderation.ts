import { supabase } from "./supabase";

export async function reportContent(
  reporterId: string,
  targetType: "listing" | "user",
  targetId: string | number,
  reason: string,
  details?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: String(targetId),
    reason,
    details: details || null,
  });
  return { error: error ? error.message : null };
}

export async function blockUser(blockerId: string, blockedId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && !error.message.includes("duplicate")) return { error: error.message };
  return { error: null };
}

export async function fetchBlockedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", userId);
  if (error) { console.error("fetchBlockedIds:", error.message); return []; }
  return (data ?? []).map((r) => r.blocked_id as string);
}
