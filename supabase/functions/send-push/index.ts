// Supabase Edge Function: send-push
//
// Triggered by a Database Webhook on INSERT into `messages`. Looks up the
// OTHER participant in the conversation (not the sender), finds their saved
// push subscriptions, and sends them a Web Push notification.
//
// Deploy via the Supabase Dashboard's Edge Functions editor (paste this file),
// or with the CLI: `supabase functions deploy send-push`.
// Then set these two function secrets (Dashboard → Edge Functions → send-push → Secrets):
//   VAPID_PUBLIC_KEY  = the public key from the .env.local NEXT_PUBLIC_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY = the matching private key (never put this in the app itself)
//
// This function must have "Enforce JWT verification" turned OFF (Dashboard →
// Edge Functions → send-push → Settings), since Database Webhooks call it
// as a trusted server-to-server request, not as a logged-in user.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails("mailto:dobara.support@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const message = payload.record;
    if (!message) return new Response("no record", { status: 200 });

    const { data: convo } = await supabase
      .from("conversations")
      .select("buyer_id, seller_id, listing_title")
      .eq("id", message.conversation_id)
      .maybeSingle();
    if (!convo) return new Response("conversation not found", { status: 200 });

    const recipientId = message.sender_id === convo.buyer_id ? convo.seller_id : convo.buyer_id;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipientId);
    if (!subs || subs.length === 0) return new Response("no subscriptions", { status: 200 });

    const body = message.media_type === "image" ? "📷 Sent a photo"
      : message.media_type === "voice" ? "🎤 Sent a voice message"
      : (message.body ?? "New message");

    const payloadStr = JSON.stringify({
      title: `Dobara — ${convo.listing_title}`,
      body,
      url: "/",
    });

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payloadStr
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
      })
    );

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 200 });
  }
});
