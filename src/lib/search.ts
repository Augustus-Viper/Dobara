// Common alternate Roman-Urdu spellings for formal-wear vocabulary,
// so "mehendi" finds "Mehndi" listings and so on.
const ALIASES: [RegExp, string][] = [
  [/\bmehendi\b/g, "mehndi"],
  [/\blehnga\b/g, "lehenga"],
  [/\blehanga\b/g, "lehenga"],
  [/\bdopatta\b/g, "dupatta"],
  [/\bdupata\b/g, "dupatta"],
  [/\bshrara\b/g, "sharara"],
  [/\bnikah\b/g, "nikkah"],
  [/\bqameez\b/g, "kameez"],
  [/\bqamiz\b/g, "kameez"],
];

function normalize(s: string): string {
  let out = s.toLowerCase().trim();
  for (const [pattern, canonical] of ALIASES) out = out.replace(pattern, canonical);
  return out;
}

// Iterative Levenshtein distance, capped — good enough for short words
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

// Does `haystack` plausibly contain `query`, tolerating common spelling
// variants and small typos? Falls back to exact substring matching first.
export function fuzzyIncludes(haystack: string, query: string): boolean {
  if (!query.trim()) return true;
  const h = normalize(haystack);
  const q = normalize(query);
  if (h.includes(q)) return true;

  const hWords = h.split(/\s+/).filter(Boolean);
  const qWords = q.split(/\s+/).filter(Boolean);

  return qWords.every((qw) =>
    hWords.some((hw) => {
      if (hw.includes(qw) || qw.includes(hw)) return true;
      const threshold = qw.length <= 4 ? 1 : qw.length <= 7 ? 2 : 3;
      return editDistance(hw, qw) <= threshold;
    })
  );
}
