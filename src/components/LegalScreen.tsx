"use client";
import { C } from "@/lib/constants";

const CONTACT = "dobara.support@gmail.com";

export default function LegalScreen({ onClose }: { onClose: () => void }) {
  const h: React.CSSProperties = { fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine, margin: "20px 0 6px" };
  const p: React.CSSProperties = { fontFamily: "Jost", fontSize: 13.5, color: C.ink, lineHeight: 1.6, margin: "0 0 10px" };
  const li: React.CSSProperties = { ...p, margin: "0 0 6px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: C.ivory, zIndex: 64, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0, background: C.ivory }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: C.ink }}>←</button>
        <div style={{ fontFamily: "Cormorant Garamond", fontSize: 20, color: C.wine }}>Terms &amp; Privacy</div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 40px" }}>
        <p style={{ ...p, color: C.mute, fontSize: 12.5, marginTop: 14 }}>Last updated: June 2026. Please read these terms before using Dobara.</p>

        <h2 style={h}>About Dobara</h2>
        <p style={p}>Dobara is a marketplace that lets people buy, sell, and exchange preloved formal wear. <b>Dobara is only a platform that connects buyers and sellers.</b> We are not a party to any sale or exchange, and we do not own, inspect, or guarantee any item listed.</p>

        <h2 style={h}>Who can use Dobara</h2>
        <p style={p}>You must be at least <b>13 years old</b> to use Dobara. If you are under 18, you may only use it with the permission and supervision of a parent or guardian, who agrees to these terms on your behalf.</p>

        <h2 style={h}>Your responsibilities</h2>
        <p style={li}>• List only items you own and may legally sell.</p>
        <p style={li}>• Describe items honestly, with real photos.</p>
        <p style={li}>• No counterfeit, stolen, offensive, or prohibited items.</p>
        <p style={li}>• Be respectful in chat. No harassment, abuse, or spam.</p>
        <p style={p}>You arrange payment and delivery directly with the other person. <b>Dobara does not handle payments and is not responsible for any money, items, meetups, or disputes between users.</b> Please take normal safety precautions when meeting or paying anyone.</p>

        <h2 style={h}>Content you post</h2>
        <p style={p}>You keep ownership of your photos and listings, but you give Dobara permission to display them within the app so the marketplace can work. You are responsible for what you post.</p>

        <h2 style={h}>Moderation</h2>
        <p style={p}>Users can report listings or people, and block anyone who makes them uncomfortable. We may remove content or suspend accounts that break these terms or harm the community.</p>

        <h2 style={h}>Privacy — what we collect</h2>
        <p style={li}>• Your email and name (to sign you in).</p>
        <p style={li}>• Your city and the listings, photos, and messages you create.</p>
        <p style={p}>We use this only to run Dobara. Your data is stored securely with our hosting provider (Supabase). <b>We do not sell your personal data.</b> Other users can see your public listings, your display name, and messages you send them.</p>

        <h2 style={h}>Deleting your data</h2>
        <p style={p}>You can ask us to delete your account and personal data at any time by emailing <b>{CONTACT}</b>. We&apos;ll remove your account and listings within a reasonable time.</p>

        <h2 style={h}>Changes</h2>
        <p style={p}>We may update these terms as Dobara grows. Continued use means you accept the latest version.</p>

        <h2 style={h}>Contact</h2>
        <p style={p}>Questions, privacy requests, or safety concerns: <b>{CONTACT}</b></p>

        <p style={{ ...p, color: C.mute, fontSize: 12, marginTop: 18 }}>This is a plain-language summary provided in good faith and is not legal advice.</p>
      </div>
    </div>
  );
}
