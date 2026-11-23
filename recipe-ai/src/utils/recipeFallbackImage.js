/**
 * Recipes without a generated photo yet (photo generation happens on demand
 * when a recipe is opened) get a neutral placeholder: the dish's own name on a
 * plain branded card. A stock photo of some other dish would misrepresent the
 * recipe (a "Thai" photo of green curry on a red curry, chicken on a tofu
 * dish), so no food photo is shown until the dish's own image exists.
 */

const escapeXml = (s) =>
  String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

// Splits the dish name over up to three centred lines.
function nameLines(name) {
  const words = String(name || 'Your recipe').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 18 && current) {
      lines.push(current);
      current = word;
    } else current = `${current} ${word}`.trim();
  }
  if (current) lines.push(current);
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = `${lines[2].slice(0, 16)}…`;
  }
  return lines;
}

function placeholder(recipe) {
  const lines = nameLines(recipe?.dish_name);
  const startY = 128 - (lines.length - 1) * 13;
  const text = lines
    .map((line, i) => `<text x="200" y="${startY + i * 26}" text-anchor="middle" font-family="Georgia, serif" font-size="21" font-weight="600" fill="#2f3a1c">${escapeXml(line)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
<rect width="400" height="260" fill="#f4efe3"/>
<circle cx="200" cy="62" r="24" fill="#e3e8cf"/>
<path d="M190 72c0-14 9-22 22-22 0 13-8 22-22 22zm0 0c4-6 9-10 15-13" fill="none" stroke="#4d5a2a" stroke-width="2.4" stroke-linecap="round"/>
${text}
<text x="200" y="${startY + lines.length * 26 + 8}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#8a8473">Photo coming soon</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * AI-generated recipe photos are stored as full-resolution files — huge for a
 * 258x168 card. Route them through wsrv.nl's free image proxy to fetch a
 * properly sized, compressed copy instead of the original file.
 */
function resized(url, width = 400) {
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=75&output=webp`;
}

export function getRecipeImage(recipe) {
  if (recipe?.image_url) return resized(recipe.image_url);
  return placeholder(recipe);
}
