const KEY = "dobara_recent_searches";
const MAX = 6;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string) {
  if (typeof window === "undefined") return;
  const q = term.trim();
  if (!q) return;
  try {
    const existing = getRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
    const next = [q, ...existing].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore (private browsing, storage full, etc.) */
  }
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
