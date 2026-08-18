const HISTORY_CACHE_KEY = "recipe-ai:recent-history";

// localStorage (not sessionStorage) so the last-known list survives reloads
// and new tabs too — the carousel can paint instantly from cache while a
// fresh copy is fetched in the background, instead of showing skeletons on
// every single visit.
export function readHistoryCache() {
  try {
    const raw = localStorage.getItem(HISTORY_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeHistoryCache(recipes) {
  try {
    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(recipes));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — safe to skip caching.
  }
}
