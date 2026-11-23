// Nutrition calculation from ingredient quantities.
//
//   recipe total = Σ (grams eaten of each ingredient × its nutrients per 100 g)
//   per serving  = recipe total ÷ servings
//
// Values come only from the ingredient database (USDA FoodData Central SR
// Legacy records, or USDA Branded Foods label records). The language model
// never supplies nutrient values. An ingredient that can't be matched or
// weighed is listed as unknown, and the result says which nutrients are
// incomplete because of it — nothing is silently filled in.

import { matchIngredient, toGrams, getIngredient } from './ingredientDb.js';

export const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'satFat', 'fiber', 'sugar', 'sodium'];
export const NUTRIENT_LABELS = { kcal: 'calories', protein: 'protein', carbs: 'carbohydrates', fat: 'fat', satFat: 'saturated fat', fiber: 'fibre', sugar: 'sugar', sodium: 'sodium' };

// Below this many grams an unknown ingredient can't change the result much
// (a pinch of a spice blend), so it does not make the nutrition "partial".
const TRIVIAL_GRAMS = 3;

const round = (v, digits = 1) => (v == null ? null : Math.round(v * 10 ** digits) / 10 ** digits);

/**
 * Resolves an ingredient line to a database record and a weight in grams.
 * Prefers the ingredientId stored on the line (set at generation time).
 */
export const resolveIngredient = (ing) => {
  const stored = ing.ingredientId ? getIngredient(ing.ingredientId) : null;
  const match = stored ? { status: 'matched', ingredient: stored } : matchIngredient(ing.name);
  const record = match.status === 'matched' ? match.ingredient : null;
  const quantity = ing.quantity ?? null;
  const unit = ing.unit ?? '';
  const weight = quantity == null ? { grams: null, method: 'unknown', basis: 'no amount' } : toGrams(record, quantity, unit, ing.name);
  return { record, match, weight };
};

/**
 * Calculates per-serving nutrition and a full audit trail.
 * @param {object} recipe — ingredients with { ref, name, quantity, unit, optional, toTaste, eatenFraction, eatenFractionReason }
 */
export const calculateNutrition = (recipe) => {
  const servings = Number(recipe.servings);
  const totals = Object.fromEntries(NUTRIENTS.map((k) => [k, 0]));
  const missingFor = Object.fromEntries(NUTRIENTS.map((k) => [k, []]));
  const lines = [];
  const unknown = [];
  const excluded = [];
  const proxies = [];
  const labelBased = [];
  const variability = [];
  const lossEstimates = [];
  let addedSugar = 0;
  let matchedGrams = 0;
  let unknownGrams = 0;
  let edibleGrams = 0;

  for (const ing of recipe.ingredients || []) {
    if (ing.optional) {
      excluded.push({ name: ing.name, reason: 'optional' });
      continue;
    }
    const { record, match, weight } = resolveIngredient(ing);
    if (record?.negligible) {
      excluded.push({ name: ing.name, reason: 'negligible amount (whole leaves / water)' });
      lines.push({ ref: ing.ref, name: ing.name, ingredientId: record.id, grams: weight.grams, source: 'negligible' });
      continue;
    }
    if (ing.quantity == null && ing.toTaste) {
      excluded.push({ name: ing.name, reason: 'to taste (no amount given)' });
      if (record) for (const k of NUTRIENTS) if ((record.per100g?.[k] || 0) > 0) missingFor[k].push(`${ing.name} (to taste)`);
      continue;
    }
    if (!record || weight.grams == null) {
      const why = !record
        ? `no matching database record${match.blocking?.length ? ` ("${match.blocking.join(' ')}" changes the food)` : ''}`
        : `no weight for "${ing.quantity} ${ing.unit}"`;
      unknown.push({ name: ing.name, reason: why, grams: weight.grams });
      if (weight.grams != null) unknownGrams += weight.grams;
      else if (/^(g|kg|ml|l)$/.test(String(ing.unit).toLowerCase())) unknownGrams += Number(ing.quantity) * (/k|^l$/.test(ing.unit) ? 1000 : 1);
      for (const k of NUTRIENTS) missingFor[k].push(ing.name);
      lines.push({ ref: ing.ref, name: ing.name, ingredientId: record?.id || null, grams: weight.grams, source: 'unknown', reason: why });
      continue;
    }

    // Share actually eaten: marinade or frying oil left in the pan, whey drained
    // off, whole aromatics removed. Stated per ingredient with its reason.
    const ef = Number(ing.eatenFraction);
    const eatenFraction = Number.isFinite(ef) && ef >= 0 && ef <= 1 ? ef : 1;
    if (eatenFraction < 1) lossEstimates.push(`${ing.name}: about ${Math.round(eatenFraction * 100)}% eaten${ing.eatenFractionReason ? ` (${ing.eatenFractionReason})` : ''}`);
    const grams = weight.grams;
    const eaten = grams * eatenFraction;
    matchedGrams += grams;
    edibleGrams += eaten;

    const line = {
      ref: ing.ref,
      name: ing.name,
      ingredientId: record.id,
      databaseName: record.name,
      grams: round(grams, 1),
      eatenGrams: round(eaten, 1),
      conversion: weight.method,
      conversionBasis: weight.basis,
      source: record.source?.dataset?.includes('Branded') ? 'label' : 'usda',
      fdcId: record.source?.fdcId || null,
      sourceDescription: record.source?.description || null,
    };
    for (const k of NUTRIENTS) {
      const per = record.per100g?.[k];
      if (per == null) {
        missingFor[k].push(record.name);
        line[k] = null;
        continue;
      }
      const v = (eaten / 100) * per;
      totals[k] += v;
      line[k] = round(v, 2);
    }
    if (record.category === 'sweetener' && record.per100g?.sugar != null) addedSugar += (eaten / 100) * record.per100g.sugar;
    if (record.proxy) proxies.push(`${ing.name} uses ${record.proxy.of}`);
    if (line.source === 'label') labelBased.push(`${ing.name} (${record.source.description}, FDC ${record.source.fdcId})`);
    if (record.variability) variability.push(record.variability);
    if (weight.method === 'estimated-density') line.conversionNote = 'weight estimated from a typical density';
    lines.push(line);
  }

  // How much of the recipe (by weight) has known nutrition.
  const significantUnknown = unknown.filter((u) => u.grams == null || u.grams > TRIVIAL_GRAMS);
  const coverage = matchedGrams + unknownGrams > 0 ? matchedGrams / (matchedGrams + unknownGrams) : 0;
  const status = !servings || !matchedGrams
    ? 'insufficient'
    : significantUnknown.some((u) => u.grams == null) || coverage < 0.9
      ? (coverage < 0.75 ? 'insufficient' : 'partial')
      : significantUnknown.length ? 'partial' : 'complete';

  const perServing = servings ? Object.fromEntries(NUTRIENTS.map((k) => [k, totals[k] / servings])) : null;
  const usdaCount = lines.filter((l) => l.source === 'usda').length;
  const labelCount = lines.filter((l) => l.source === 'label').length;
  const estimatedConversions = lines.filter((l) => l.conversion === 'estimated-density').map((l) => l.name);

  return {
    status,
    servings,
    perServing,
    perServingRounded: perServing && {
      kcal: Math.round(perServing.kcal),
      protein: round(perServing.protein),
      carbs: round(perServing.carbs),
      fat: round(perServing.fat),
      satFat: round(perServing.satFat),
      fiber: round(perServing.fiber),
      sugar: round(perServing.sugar),
      addedSugar: round(addedSugar / servings),
      sodium: Math.round(perServing.sodium),
    },
    totals: Object.fromEntries(NUTRIENTS.map((k) => [k, round(totals[k], 1)])),
    addedSugarPerServing: servings ? addedSugar / servings : null,
    gramsPerServing: servings ? edibleGrams / servings : null,
    coverage,
    lines,
    unknown,
    excluded,
    proxies,
    labelBased,
    variability: [...new Set(variability)],
    lossEstimates,
    estimatedConversions,
    incompleteNutrients: Object.fromEntries(Object.entries(missingFor).filter(([, v]) => v.length)),
    counts: { usda: usdaCount, label: labelCount, unknown: unknown.length },
  };
};

/** One plain-language sentence describing how the numbers were obtained. */
export const describeNutrition = (n) => {
  if (!n || !n.perServing) return 'Nutrition could not be calculated (servings or ingredient amounts are missing).';
  const parts = [];
  const sources = [
    n.counts.usda ? `USDA FoodData Central records for ${n.counts.usda} ingredient${n.counts.usda === 1 ? '' : 's'}` : '',
    n.counts.label ? `product labels for ${n.counts.label}` : '',
  ].filter(Boolean).join(' and ');
  parts.push(`Calculated from the ingredient weights using ${sources || 'no reference data'}, divided by ${n.servings} servings (about ${Math.round(n.gramsPerServing)} g per serving).`);
  parts.push('These are estimates, not laboratory values; brands and exact cuts vary.');
  if (n.unknown.length) parts.push(`Not included (no reliable data): ${n.unknown.map((u) => u.name).join(', ')}.`);
  const partialNutrients = Object.entries(n.incompleteNutrients)
    .filter(([, names]) => names.some((x) => !n.unknown.some((u) => u.name === x)))
    .map(([k, names]) => `${NUTRIENT_LABELS[k]} excludes ${[...new Set(names)].filter((x) => !n.unknown.some((u) => u.name === x)).join(', ')}`);
  if (partialNutrients.length) parts.push(`No USDA value for: ${partialNutrients.join('; ')}.`);
  if (n.excluded.some((e) => e.reason.startsWith('to taste'))) parts.push(`Salt or seasoning added "to taste" is not counted.`);
  if (n.lossEstimates.length) parts.push(`Allows for food not eaten: ${n.lossEstimates.join('; ')}.`);
  if (n.proxies.length) parts.push(`Approximations: ${n.proxies.join('; ')}.`);
  if (n.variability.length) parts.push(n.variability.join(' '));
  return parts.join(' ');
};
