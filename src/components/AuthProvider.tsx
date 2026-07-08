"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  recovering: boolean;
  bannedMessage: string | null;
  clearBannedMessage: () => void;
  signUp: (email: string, password: string, name: string, captchaToken?: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string, captchaToken?: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [bannedMessage, setBannedMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkBan = async (u: User | null) => {
      if (!u) return;
      const { data } = await supabase.from("banned_users").select("reason").eq("user_id", u.id).maybeSingle();
      if (active && data) {
        setBannedMessage(data.reason || "Your account has been suspended. Contact dobara.support@gmail.com if you think this is a mistake.");
        await supabase.auth.signOut();
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      checkBan(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Arrived from a "reset password" email link
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_IN") checkBan(session?.user ?? null);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, name: string, captchaToken?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, captchaToken },
    });
    if (error) return { error: error.message, needsConfirm: false };
    // If no session is returned, Supabase is waiting for email confirmation
    const needsConfirm = !data.session;
    return { error: null, needsConfirm };
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    return { error: error ? error.message : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const sendPasswordReset = async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      captchaToken,
    });
    return { error: error ? error.message : null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovering(false);
    return { error: error ? error.message : null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, recovering, bannedMessage, clearBannedMessage: () => setBannedMessage(null), signUp, signIn, signInWithGoogle, signOut, sendPasswordReset, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
