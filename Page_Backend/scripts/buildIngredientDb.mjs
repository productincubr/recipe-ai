// Builds data/ingredientDb.json from data/ingredientCatalog.js and the USDA
// FoodData Central SR Legacy CSV download (April 2018 release).
//
//   1. Download https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
//   2. Unzip it anywhere.
//   3. node scripts/buildIngredientDb.mjs <path-to-unzipped-folder>
//
// For each catalog entry with an `fdc` id the nutrients per 100 g and the
// household-measure weights (tsp, tbsp, cup, medium, clove, ...) are read from
// the USDA files, so no nutrition number is typed by hand. Entries with a
// `label` carry USDA Branded Foods values copied from the product record.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CATALOG } from '../data/ingredientCatalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const srDir = process.argv[2];
if (!srDir || !fs.existsSync(path.join(srDir, 'food.csv'))) {
  console.error('Usage: node scripts/buildIngredientDb.mjs <unzipped SR Legacy CSV folder>');
  process.exit(1);
}

const parseCsv = (file) => {
  const text = fs.readFileSync(path.join(srDir, file), 'utf8');
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = false; else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
};

// FoodData Central nutrient ids
const NUTRIENT_IDS = { 1008: 'kcal', 1003: 'protein', 1004: 'fat', 1258: 'satFat', 1005: 'carbs', 1079: 'fiber', 2000: 'sugar', 1093: 'sodium' };
const KEYS = Object.values(NUTRIENT_IDS);

const wanted = new Set(CATALOG.filter((e) => e.fdc).map((e) => String(e.fdc)));
const foods = new Map(parseCsv('food.csv').filter((f) => wanted.has(f.fdc_id)).map((f) => [f.fdc_id, f]));
const nutrients = new Map();
for (const r of parseCsv('food_nutrient.csv')) {
  if (!wanted.has(r.fdc_id) || !NUTRIENT_IDS[r.nutrient_id]) continue;
  if (!nutrients.has(r.fdc_id)) nutrients.set(r.fdc_id, {});
  nutrients.get(r.fdc_id)[NUTRIENT_IDS[r.nutrient_id]] = Number(r.amount);
}
const portionRows = parseCsv('food_portion.csv').filter((p) => wanted.has(p.fdc_id));

// "tbsp chopped" -> tbsp, "medium (2-1/2" dia)" -> medium, "cloves" -> clove ...
const PORTION_UNITS = [
  [/^(cup|cups)\b/, 'cup'], [/^(tbsp|tablespoons?)\b/, 'tbsp'], [/^(tsp|teaspoons?)\b/, 'tsp'], [/^fl oz\b/, 'floz'],
  [/^(medium|med)\b/, 'medium'], [/^large\b/, 'large'], [/^small\b/, 'small'], [/^extra large\b/, 'xlarge'],
  [/^cloves?\b/, 'clove'], [/^(leaf|leaves)\b/, 'leaf'], [/^(stalks?|stalk)\b/, 'stalk'], [/^sprigs?\b/, 'sprig'],
  [/^slices?\b/, 'slice'], [/^(pepper|chili|chile|onion|tomato|carrot|potato|egg|lime|lemon|banana|apple|avocado|fruit|whole|each)\b/, ''],
  [/^(block|cake)\b/, 'block'], [/^bunch\b/, 'bunch'], [/^head\b/, 'head'], [/^(breast|half breast)\b/, 'breast'],
  [/^thigh\b/, 'thigh'], [/^fillet\b/, 'fillet'], [/^stick\b/, 'stick'], [/^pod\b/, 'pod'], [/^can\b/, 'can'], [/^dash\b/, 'dash'],
];
// Prefer the cut a recipe usually means ("cup, chopped" over "cup, sliced").
const PREFERENCE = /chopped|minced|diced|ground|whole|packed|shredded/;

const portionsFor = (fdcId) => {
  const out = {};
  const notes = {};
  for (const p of portionRows.filter((r) => r.fdc_id === fdcId)) {
    const amount = Number(p.amount) || 1;
    const grams = Number(p.gram_weight);
    const text = `${p.portion_description || ''} ${p.modifier || ''}`.trim().toLowerCase();
    if (!grams || !text) continue;
    const hit = PORTION_UNITS.find(([re]) => re.test(text));
    if (!hit) continue;
    const unit = hit[1];
    const perUnit = grams / amount;
    const better = !(unit in out) || (PREFERENCE.test(text) && !PREFERENCE.test(notes[unit] || ''));
    if (better) {
      out[unit] = Math.round(perUnit * 100) / 100;
      notes[unit] = text;
    }
    // "1 lime yields 44 g juice" — the juice yield of the whole fruit.
    if (/yields?/.test(text) && !('yield' in out)) out.yield = Math.round(perUnit * 100) / 100;
  }
  return { portions: out, portionText: notes };
};

const round = (v) => (v == null || Number.isNaN(v) ? null : Math.round(v * 1000) / 1000);
const problems = [];
const entries = [];

for (const e of CATALOG) {
  let per100g;
  let source;
  let usdaPortions = {};
  let portionText = {};
  if (e.fdc) {
    const id = String(e.fdc);
    const food = foods.get(id);
    if (!food) { problems.push(`${e.id}: FDC ${id} not found in SR Legacy`); continue; }
    const n = nutrients.get(id) || {};
    per100g = Object.fromEntries(KEYS.map((k) => [k, k in n ? round(n[k]) : null]));
    source = { dataset: 'USDA FoodData Central — SR Legacy (2018-04)', fdcId: Number(id), description: food.description };
    ({ portions: usdaPortions, portionText } = portionsFor(id));
  } else if (e.label) {
    per100g = Object.fromEntries(KEYS.map((k) => [k, e.label.per100g[k] ?? null]));
    source = { dataset: 'USDA FoodData Central — Branded Foods (product label)', fdcId: e.label.fdcId, description: e.label.brand, note: e.label.note };
  } else if (e.negligible) {
    per100g = null;
    source = { dataset: 'none', note: e.portionNote || 'Used in amounts too small to matter nutritionally.' };
  } else {
    problems.push(`${e.id}: no fdc, label or negligible flag`);
    continue;
  }

  // Plausibility: energy should roughly match 4/4/9 kcal per g protein/carbs/fat
  // (fibre-rich spices and rounded labels deviate, so only flag big gaps).
  if (per100g && per100g.kcal != null) {
    const atwater = 4 * (per100g.protein || 0) + 4 * (per100g.carbs || 0) + 9 * (per100g.fat || 0);
    if (atwater > 30 && Math.abs(per100g.kcal - atwater) > 0.35 * atwater) problems.push(`${e.id}: ${per100g.kcal} kcal vs ${Math.round(atwater)} from macros — check source`);
  }

  // Grams per millilitre from the USDA cup/tbsp/tsp weights (cup = 236.6 ml).
  const ml = { cup: 236.59, tbsp: 14.79, tsp: 4.93, floz: 29.57 };
  const densities = Object.entries(ml).filter(([u]) => usdaPortions[u]).map(([u, v]) => usdaPortions[u] / v);
  const density = e.density ?? (densities.length ? Math.round((densities[0]) * 1000) / 1000 : null);

  entries.push({
    id: e.id,
    name: e.name,
    aliases: e.aliases,
    category: e.cat,
    state: e.state || (e.cat === 'vegetable' || e.cat === 'fruit' || e.cat === 'herb' || e.cat === 'meat' || e.cat === 'poultry' || e.cat === 'fish' || e.cat === 'shellfish' ? 'raw' : 'as sold'),
    animal: e.animal || null,
    allergens: e.allergens || [],
    mayContain: e.mayContain || [],
    gluten: e.gluten ?? false,
    rennet: Boolean(e.rennet),
    safety: e.safety || null,
    negligible: Boolean(e.negligible),
    proxy: e.proxy || null,
    variability: e.variability || null,
    per100g,
    density,
    densitySource: e.density != null ? `Catalog: ${e.portionNote || 'label'}` : densities.length ? 'USDA household measure' : null,
    portions: { ...usdaPortions, ...(e.portions || {}) },
    portionSource: {
      ...Object.fromEntries(Object.keys(usdaPortions).map((u) => [u, `USDA: ${portionText[u] || u}`])),
      ...Object.fromEntries(Object.keys(e.portions || {}).map((u) => [u, `Catalog: ${e.portionNote || 'typical kitchen measure'}`])),
    },
    source,
  });
}

const outFile = path.join(here, '..', 'data', 'ingredientDb.json');
fs.writeFileSync(outFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), count: entries.length, ingredients: entries }, null, 1)}\n`);
console.log(`Wrote ${entries.length} ingredients to ${path.relative(process.cwd(), outFile)}`);
if (problems.length) {
  console.log(`\n${problems.length} entries to review:`);
  for (const p of problems) console.log(`  - ${p}`);
}
