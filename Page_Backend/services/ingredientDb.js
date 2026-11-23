// Ingredient database: lookup, strict name matching and unit conversion.
//
// Data comes from data/ingredientDb.json (built from USDA FoodData Central by
// scripts/buildIngredientDb.mjs). It is loaded once and cached in memory, so
// matching an ingredient never needs a network or database call.
//
// Matching is deliberately strict. A recipe ingredient matches a record only
// when one of the record's names appears in it as whole words AND every other
// word is a harmless descriptor ("fresh", "chopped", "large"). A word that
// changes the food ("noodles" in "egg noodles", "light" in "light cream
// cheese", "vegan" in "vegan butter") makes it unmatched, and the ingredient is
// flagged for review instead of borrowing an unrelated record's nutrition.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseQuantity, UNIT_TABLE } from './quantity.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DB = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'ingredientDb.json'), 'utf8'));
export const INGREDIENTS = DB.ingredients;
const BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));
export const getIngredient = (id) => BY_ID.get(id) || null;

const FAMILIES = [
  [/^ING_(WW_)?PASTA|^ING_SOBA|NOODLES/, 'pasta-noodles'],
  [/RICE_(DRY|COOKED)$|^ING_ARBORIO/, 'rice'],
  [/_OIL$|^ING_GHEE$|BUTTER$/, 'cooking-fat'],
  [/^ING_CHICKPEAS/, 'chickpeas'], [/LENTILS|_DAL_/, 'lentils'], [/KIDNEY_BEANS/, 'kidney-beans'], [/BLACK_BEANS/, 'black-beans'],
  [/^ING_TOFU/, 'tofu'], [/COCONUT_MILK$/, 'coconut-milk'], [/^ING_(SOY_SAUCE|TAMARI)/, 'soy-sauce'],
  [/^ING_TOMATO/, 'tomato'], [/YOGURT$/, 'yogurt'], [/^ING_(WHOLE_MILK|MILK_|SKIM_MILK)/, 'milk'], [/BELL_PEPPER$/, 'bell-pepper'],
  [/^ING_(RED|GREEN)_CHILI$|^ING_JALAPENO$/, 'fresh-chilli'], [/QUINOA/, 'quinoa'], [/^ING_(CHICKEN|GROUND_CHICKEN)/, 'chicken'],
  [/^ING_GROUND_BEEF/, 'beef'], [/BROTH|STOCK/, 'stock'], [/^ING_(SUGAR|BROWN_SUGAR|PALM_SUGAR|COCONUT_SUGAR|JAGGERY)$/, 'sugar'],
  [/^ING_(LIME|LEMON)_JUICE$/, 'citrus-juice'], [/^ING_SPINACH/, 'spinach'], [/^ING_(MUSHROOM|SHIITAKE|OYSTER_MUSHROOM)$/, 'mushroom'],
];
/** Ingredient family for generic mentions; null when the food has no close relatives. */
export const familyOf = (id) => FAMILIES.find(([re]) => re.test(id || ''))?.[1] || null;

// ---------------------------------------------------------------------------
// Name normalisation
// ---------------------------------------------------------------------------

const singular = (w) =>
  w.length <= 3 ? w
    : w.endsWith('ies') ? `${w.slice(0, -3)}y`
      : /(ches|shes|sses|xes|oes)$/.test(w) ? w.slice(0, -2)
        : w.endsWith('leaves') ? w.replace(/leaves$/, 'leaf')
          : /[^s]s$/.test(w) ? w.slice(0, -1) : w;

export const normalizeName = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // jalapeño -> jalapeno
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\([^)]*\)/g, ' ') // "(optional)", "(or tamari)"
    .replace(/[,;:].*$/, '') // ", finely chopped"
    .replace(/\b(for (garnish|serving|the [a-z]+|frying|tempering|marinade|sauce|paste))\b.*$/, ' ')
    .replace(/\bto taste\b|\bas needed\b|\boptional\b/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9%' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Normalises running text (instructions) without cutting at commas or brackets. */
export const normalizeText = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9%' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const tokensOf = (text) => normalizeName(text).split(' ').filter(Boolean).map(singular);
export const textTokens = (text) => normalizeText(text).split(' ').filter(Boolean).map(singular);

// Words that describe how an ingredient is cut, sized or handled without
// changing what it is nutritionally.
const DESCRIPTORS = new Set([
  'fresh', 'freshly', 'chopped', 'finely', 'roughly', 'coarsely', 'thinly', 'thickly', 'sliced', 'slice', 'diced', 'minced',
  'grated', 'crushed', 'cubed', 'julienned', 'shredded', 'torn', 'halved', 'quartered', 'peeled', 'deseeded', 'seeded',
  'trimmed', 'rinsed', 'washed', 'pressed', 'patted', 'dried', 'large', 'medium', 'small', 'big', 'baby', 'ripe', 'firm',
  'organic', 'packed', 'heaped', 'level', 'warm', 'cold', 'hot', 'room', 'temperature', 'good', 'quality', 'cut', 'into',
  'piece', 'chunk', 'cube', 'strip', 'wedge', 'ring', 'round', 'floret', 'and', 'or', 'a', 'of', 'the', 'few', 'handful',
  'homemade', 'home', 'made', 'store', 'bought', 'frozen', 'thawed', 'boneless', 'skinless', 'white', 'part', 'stem',
  'loosely', 'lightly', 'well', 'beaten', 'whisked', 'softened', 'melted', 'separated', 'bruised', 'smashed', 'pounded',
  'roasted', 'toasted', 'soaked', 'blanched', 'steamed', 'mashed', 'pureed', 'leaf', 'leave', 'extra', 'additional',
  'garnish', 'serving', 'fine', 'thin', 'thick', 'long', 'short', 'inch', 'cm', 'block', 'stalk', 'sprig', 'clove',
  'hand', 'torn', 'picked', 'zested', 'juiced', 'squeezed', 'plus', 'more', 'some', 'side', 'pure', 'mild',
]);
// Plant-based labels are harmless only on plant foods ("vegan red curry paste");
// on an animal product they mean a different food ("vegan butter").
const PLANT_LABELS = new Set(['vegan', 'vegetarian', 'plant', 'based', 'gluten', 'free', 'gf', 'shrimp', 'paste', 'no', 'without', 'fish', 'sauce', 'msg']);

const ALIAS_INDEX = INGREDIENTS.flatMap((ing) =>
  [ing.name, ...ing.aliases].map((alias) => ({ ing, tokens: tokensOf(alias) })).filter((a) => a.tokens.length)
).sort((a, b) => b.tokens.length - a.tokens.length || b.tokens.join(' ').length - a.tokens.join(' ').length);

const findSpan = (hay, needle) => {
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((t, j) => hay[i + j] === t)) return i;
  }
  return -1;
};

/**
 * Matches a recipe ingredient name to a database record.
 * Returns { status: 'matched', ingredient, alias, ignored } or
 *         { status: 'unmatched', candidate, blocking: [words] }.
 */
export const matchIngredient = (name) => {
  const tokens = tokensOf(name);
  if (!tokens.length) return { status: 'unmatched', candidate: null, blocking: [] };
  let best = null;
  for (const alias of ALIAS_INDEX) {
    const at = findSpan(tokens, alias.tokens);
    if (at < 0) continue;
    const rest = [...tokens.slice(0, at), ...tokens.slice(at + alias.tokens.length)];
    const plantOk = !alias.ing.animal;
    const blocking = rest.filter((t) => !DESCRIPTORS.has(t) && !(plantOk && PLANT_LABELS.has(t)) && !/^\d+%?$/.test(t));
    if (!blocking.length) return { status: 'matched', ingredient: alias.ing, alias: alias.tokens.join(' '), ignored: rest };
    if (!best || blocking.length < best.blocking.length) best = { candidate: alias.ing, blocking };
  }
  return { status: 'unmatched', candidate: best?.candidate || null, blocking: best?.blocking || tokens };
};

/** Every database name that appears in a free text, longest first, without overlaps. */
export const foodsMentionedIn = (text) => {
  const tokens = textTokens(text);
  const used = new Array(tokens.length).fill(false);
  const found = [];
  for (const alias of ALIAS_INDEX) {
    for (let i = 0; i + alias.tokens.length <= tokens.length; i++) {
      if (alias.tokens.every((t, j) => tokens[i + j] === t) && !used.slice(i, i + alias.tokens.length).some(Boolean)) {
        for (let j = i; j < i + alias.tokens.length; j++) used[j] = true;
        found.push({ ingredient: alias.ing, phrase: alias.tokens.join(' '), index: i });
      }
    }
  }
  return found.sort((a, b) => a.index - b.index);
};

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

const VOLUME_KEY = { tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', tbsp: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', cup: 'cup', cups: 'cup', 'fl oz': 'floz' };
const COUNT_KEY = {
  '': '', piece: '', pieces: '', whole: '', each: '', unit: '', medium: 'medium', large: 'large', small: 'small', clove: 'clove', cloves: 'clove',
  leaf: 'leaf', leaves: 'leaf', stalk: 'stalk', stalks: 'stalk', sprig: 'sprig', sprigs: 'sprig', slice: 'slice', slices: 'slice',
  bunch: 'bunch', bunches: 'bunch', block: 'block', blocks: 'block', head: 'head', heads: 'head', inch: 'inch', inches: 'inch', cm: 'cm',
  pod: 'pod', pods: 'pod', stick: 'stick', sticks: 'stick', fillet: 'fillet', fillets: 'fillet', breast: 'breast', breasts: 'breast',
  thigh: 'thigh', thighs: 'thigh', root: 'root', roots: 'root', can: 'can', cans: 'can',
};
const ML = { tsp: 4.929, tbsp: 14.787, cup: 236.59, floz: 29.574 };

// Fallback grams-per-ml for an ingredient with no USDA or catalog weight.
const CATEGORY_DENSITY = { fat: 0.92, liquid: 1.0, sauce: 1.1, condiment: 1.05, dairy: 1.03, spice: 0.5, seed: 0.55, nut: 0.55, herb: 0.15, vegetable: 0.6, fruit: 0.6, grain: 0.75, legume: 0.75, sweetener: 0.9, coconut: 1.0 };

/** Canonical unit for display and storage: g, ml, tsp, tbsp, cup, or a count unit. */
export const canonicalUnit = (unit) => {
  const u = String(unit || '').toLowerCase().trim().replace(/\.$/, '');
  if (UNIT_TABLE[u]) {
    const [type] = UNIT_TABLE[u];
    if (VOLUME_KEY[u]) return VOLUME_KEY[u];
    if (type === 'mass') return { g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g', kg: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg', mg: 'mg', oz: 'oz', ounce: 'oz', ounces: 'oz', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb' }[u] || u;
    if (type === 'volume') return { ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml', l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l', pinch: 'pinch', pinches: 'pinch', dash: 'dash', dashes: 'dash' }[u] || u;
  }
  if (u === 'fl oz') return 'floz';
  if (u in COUNT_KEY) return COUNT_KEY[u] || 'piece';
  return u;
};

/**
 * Converts an amount of an ingredient to grams, using (in order) the stated
 * mass, USDA household weights for that food, its density, or a category
 * default. Returns { grams, method, basis } — grams is null when no honest
 * conversion exists (e.g. "2 pieces" of something with no unit weight).
 */
export const toGrams = (ingredient, amount, unit, nameHint = '') => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return { grams: null, method: 'unknown', basis: 'no numeric amount' };
  const u = String(unit || '').toLowerCase().trim();
  const parsed = parseQuantity(`${value} ${u}`.trim());
  if (parsed.type === 'mass') return { grams: parsed.base, method: 'mass', basis: `${value} ${u}` };

  const portions = ingredient?.portions || {};
  const source = ingredient?.portionSource || {};
  if (parsed.type === 'volume') {
    const key = VOLUME_KEY[u] || (u === 'fl oz' ? 'floz' : null);
    if (key && portions[key] != null) {
      return { grams: value * portions[key], method: source[key]?.startsWith('USDA') ? 'usda-portion' : 'catalog-portion', basis: `1 ${key} = ${portions[key]} g (${source[key] || 'catalog'})` };
    }
    // Another spoon/cup weight of the same food gives its density.
    const known = Object.keys(ML).find((k) => portions[k] != null);
    const density = ingredient?.density ?? (known ? portions[known] / ML[known] : null);
    if (density != null) {
      const usda = ingredient?.density == null ? Boolean(known && source[known]?.startsWith('USDA')) : ingredient?.densitySource === 'USDA household measure';
      return { grams: parsed.base * density, method: usda ? 'usda-portion' : 'catalog-portion', basis: `${Math.round(density * 1000) / 1000} g/ml (${usda ? 'from USDA household measures' : ingredient?.densitySource || 'catalog'})` };
    }
    const fallback = CATEGORY_DENSITY[ingredient?.category];
    if (fallback != null) return { grams: parsed.base * fallback, method: 'estimated-density', basis: `typical ${ingredient.category} density ${fallback} g/ml` };
    return { grams: null, method: 'unknown', basis: 'no weight for this volume' };
  }
  if (parsed.type === 'count') {
    const key = COUNT_KEY[parsed.unit] ?? COUNT_KEY[u] ?? parsed.unit;
    const order = key === '' ? ['', 'medium', 'piece'] : key === 'medium' ? ['medium', ''] : [key];
    if (key === '' || key === 'piece') {
      // "3 garlic cloves", "2 lemongrass stalks": the count word is in the name.
      const named = Object.keys(COUNT_KEY).find((w) => w && new RegExp(`\\b${w}\\b`, 'i').test(nameHint) && portions[COUNT_KEY[w]] != null);
      if (named) order.push(COUNT_KEY[named]);
      const countPortions = Object.keys(portions).filter((k) => !['tsp', 'tbsp', 'cup', 'floz', 'yield', 'dash'].includes(k));
      if (countPortions.length === 1) order.push(countPortions[0]);
    }
    for (const k of order) {
      if (portions[k] != null) {
        return { grams: value * portions[k], method: source[k]?.startsWith('USDA') ? 'usda-portion' : 'catalog-portion', basis: `1 ${k || 'whole'} = ${portions[k]} g (${source[k] || 'catalog'})` };
      }
    }
    return { grams: null, method: 'unknown', basis: `no weight for "${u || 'piece'}"` };
  }
  return { grams: null, method: 'unknown', basis: 'unparseable amount' };
};

/** Amount in the unit of `target`, via grams when units differ. */
export const convertAmount = (ingredient, amount, fromUnit, toUnit) => {
  const from = canonicalUnit(fromUnit);
  const to = canonicalUnit(toUnit);
  if (from === to) return { value: Number(amount), exact: true };
  const a = parseQuantity(`${amount} ${fromUnit}`.trim());
  const b = parseQuantity(`1 ${toUnit}`.trim());
  if (a.base != null && b.base != null && a.type === b.type && a.type !== 'count') return { value: a.base / b.base, exact: true };
  const g = toGrams(ingredient, amount, fromUnit).grams;
  const perTarget = toGrams(ingredient, 1, toUnit).grams;
  if (g == null || !perTarget) return { value: null, exact: false };
  return { value: g / perTarget, exact: false };
};
