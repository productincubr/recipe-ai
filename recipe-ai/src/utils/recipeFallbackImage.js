/**
 * Recipes generated from history often have no `image_url` yet (photo
 * generation only happens on-demand when a recipe is opened). Rather than
 * showing one identical stock photo on every card regardless of dish,
 * pick a fallback that at least matches the recipe's cuisine.
 */
const CUISINE_IMAGES = {
  italian: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop",
  indian: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop",
  thai: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop",
  japanese: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop",
  american: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop",
  mexican: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=600&auto=format&fit=crop",
  chinese: "https://images.unsplash.com/photo-1512003867696-6d5ce6835040?w=600&auto=format&fit=crop",
  mediterranean: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop",
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&auto=format&fit=crop";

/**
 * AI-generated recipe photos are stored as full-resolution PNGs (often
 * 1-2MB) — huge for a 258x168 card. Route them through wsrv.nl's free
 * image proxy to fetch a properly sized, compressed copy instead of the
 * original file; the Unsplash fallbacks above are already served resized
 * so they're returned as-is.
 */
function resized(url, width = 400) {
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=75&output=webp`;
}

export function getRecipeImage(recipe) {
  if (recipe.image_url) return resized(recipe.image_url);

  const haystack = `${recipe.cuisine || ""} ${recipe.category || ""} ${recipe.dish_name || ""}`.toLowerCase();
  const match = Object.keys(CUISINE_IMAGES).find((key) => haystack.includes(key));
  return match ? CUISINE_IMAGES[match] : DEFAULT_IMAGE;
}
