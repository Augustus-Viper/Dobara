import { supabase } from "./supabase";
import { fetchMyListings, deleteListing } from "./listings";

export async function updateDisplayName(userId: string, name: string): Promise<{ error: string | null }> {
  const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (authError) return { error: authError.message };
  const { error: profileError } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
  if (profileError) return { error: profileError.message };
  return { error: null };
}

// Deactivates the account (blocks future logins via the existing ban mechanism)
// and removes the seller's own listings. Does not erase the underlying login
// record — full erasure would need a backend service key we don't have wired up.
export async function deactivateOwnAccount(userId: string): Promise<{ error: string | null }> {
  const myListings = await fetchMyListings(userId);
  await Promise.all(myListings.map((l) => deleteListing(l.id)));

  const { error } = await supabase.from("banned_users").insert({ user_id: userId, reason: "Account deleted by user" });
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  return { error: null };
}
