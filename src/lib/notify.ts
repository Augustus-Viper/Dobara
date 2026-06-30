// Lightweight client-side alerts: sound, vibration, and browser notifications.

let audioCtx: AudioContext | null = null;

// A short, pleasant "ding" using the Web Audio API (no asset needed)
export function playPing() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    const ctx = audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    o.start();
    o.stop(ctx.currentTime + 0.32);
  } catch {
    /* ignore */
  }
}

// Vibrate the phone (Android; iOS Safari ignores this)
export function buzz(pattern: number | number[] = 180) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export function notifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

export function showNotification(title: string, body: string) {
  try {
    if (!notifySupported() || Notification.permission !== "granted") return;
    new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png" });
  } catch {
    /* ignore */
  }
}
