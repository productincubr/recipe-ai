const HISTORY_CACHE_KEY = "recipe-ai:recent-history";

export function readHistoryCache() {
  try {
    const raw = sessionStorage.getItem(HISTORY_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeHistoryCache(recipes) {
  try {
    sessionStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(recipes));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — safe to skip caching.
  }
}
