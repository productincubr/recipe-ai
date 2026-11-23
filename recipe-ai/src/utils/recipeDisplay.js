/**
 * Shared formatting of validated recipe data for the recipe page and the PDF,
 * so both always show exactly the same numbers. Nothing here recalculates a
 * quantity or nutrient — it only formats what the backend validated.
 */

const FRACTIONS = [[0, ''], [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [1 / 2, '1/2'], [2 / 3, '2/3'], [3 / 4, '3/4'], [1, '']];
const PLURAL = { leaf: 'leaves', clove: 'cloves', stalk: 'stalks', sprig: 'sprigs', pod: 'pods', stick: 'sticks', slice: 'slices', cup: 'cups', root: 'roots' };

export function formatAmount(value, unit = '') {
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  if (/^(g|kg|ml|l|mg)$/.test(unit) || v >= 20) return String(Math.round(v * (v < 10 ? 10 : 1)) / (v < 10 ? 10 : 1));
  let whole = Math.floor(v + 1e-9);
  const rest = v - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
  if (Math.abs(best[0] - rest) > 0.02) return String(Math.round(v * 100) / 100);
  return [whole || '', best[1]].filter(Boolean).join(' ') || '0';
}

const unitLabel = (unit, value) => {
  const u = unit === 'piece' ? '' : unit === 'floz' ? 'fl oz' : unit || '';
  return Number(value) > 1 && PLURAL[u] ? PLURAL[u] : u;
};

/** "1/2 tbsp lime juice", "400 g firm tofu" for each ingredient a step uses. */
export function stepIngredientUses(recipe, step) {
  if (!step || typeof step !== 'object' || !Array.isArray(step.ingredientsUsed)) return [];
  const byRef = new Map((recipe.ingredients || []).map((i) => [i.ref, i]));
  return step.ingredientsUsed
    .map((u) => {
      const ing = byRef.get(u.ref);
      if (!ing) return null;
      const unit = unitLabel(u.unit, u.quantity);
      return `${formatAmount(u.quantity, u.unit)}${unit ? ` ${unit}` : ''} ${ing.name.replace(/\s*\([^)]*\)/g, '').toLowerCase()}`;
    })
    .filter(Boolean);
}

/** Quality badge text, only for recipes that passed every hard check. */
export function qualityBadge(details) {
  const q = details?.quality;
  if (!q || !q.passed) return null;
  return { score: q.score, label: `Validated · quality ${Number(q.score).toFixed(1)}/10` };
}

/**
 * Problems to show the reader: hard failures first (the recipe did not pass),
 * then warnings that affect what they cook or eat.
 */
const WARNING_RULES = new Set(['ingredients', 'quantities', 'diet', 'allergens', 'nutrition', 'servings', 'food-safety', 'timing']);
export function validationNotes(details) {
  const v = details?.validation;
  if (!v) return { failed: false, items: [] };
  if (Array.isArray(v.unresolved) && v.unresolved.length) return { failed: true, items: v.unresolved };
  const hard = (v.issues || []).filter((i) => i.severity === 'hard' || i.severity === 'blocking').map((i) => i.message);
  const warnings = (v.issues || []).filter((i) => i.severity === 'warning' && WARNING_RULES.has(i.rule)).map((i) => i.message);
  return { failed: hard.length > 0, items: [...hard, ...warnings].slice(0, 8) };
}

/** One-line nutrition status shown next to the nutrition heading. */
export function nutritionStatus(details) {
  const meta = details?.nutritionMeta;
  if (!meta || meta.method !== 'calculated') return 'AI estimate — not verified';
  if (meta.status === 'complete') return 'calculated from USDA data, estimated';
  if (meta.status === 'partial') return 'calculated, estimated — some ingredients not included';
  return 'incomplete — could not be calculated reliably';
}
