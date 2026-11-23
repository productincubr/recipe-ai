// Ingredient list <-> method consistency.
//
// Generated recipes carry structured references: every step lists
// ingredientsUsed [{ ref, quantity, unit }] pointing at an ingredient's `ref`.
// The checks here add up every use of each ingredient and compare the total to
// the ingredient list, compare the amounts written in each instruction with
// the structured amounts of that step, and look for foods named in the method
// that are not in the ingredient list. Conflicts are reported — quantities are
// never changed to make a check pass.
//
// Recipes saved before structured references existed are checked from the
// instruction text alone (less precise; reported, never auto-corrected).

import { matchIngredient, foodsMentionedIn, convertAmount as convertWithRecord, canonicalUnit, normalizeName, normalizeText, tokensOf, textTokens, getIngredient, familyOf } from './ingredientDb.js';

// Converts between units of one recipe ingredient through its database record
// ("2 tbsp" of curry paste = 30 g uses the paste's own tablespoon weight).
const convertAmount = (ing, amount, from, to) => convertWithRecord(ing?.ingredientId ? getIngredient(ing.ingredientId) : null, amount, from, to);
import { parseQuantity, formatQuantity, findQuantityMentions } from './quantity.js';

// ---------------------------------------------------------------------------
// Ingredient normalisation
// ---------------------------------------------------------------------------

const slug = (s) => normalizeName(s).replace(/\s+/g, '_').slice(0, 40) || 'item';

const FRACTIONS = [[0, ''], [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [1 / 2, '1/2'], [2 / 3, '2/3'], [3 / 4, '3/4'], [1, '']];
/** 1.5 -> "1 1/2", 0.25 -> "1/4", 350 -> "350". */
export const formatAmount = (v, unit = '') => {
  if (v == null) return '';
  const metric = /^(g|kg|ml|l|mg)$/.test(unit);
  if (metric || v >= 20) return String(Math.round(v * (v < 10 ? 10 : 1)) / (v < 10 ? 10 : 1));
  let whole = Math.floor(v + 1e-9);
  const rest = v - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
  if (Math.abs(best[0] - rest) > 0.02) return String(Math.round(v * 100) / 100);
  return [whole || '', best[1]].filter(Boolean).join(' ') || '0';
};

const UNIT_LABEL = { piece: '', floz: 'fl oz' };
const COUNT_PLURAL = { leaf: 'leaves', clove: 'cloves', stalk: 'stalks', sprig: 'sprigs', pod: 'pods', stick: 'sticks', slice: 'slices', cup: 'cups', root: 'roots', bunch: 'bunches' };
export const displayQuantity = (ing) => {
  if (ing.quantity == null) return ing.toTaste ? 'to taste' : (ing.qty || '');
  let unit = UNIT_LABEL[ing.unit] ?? ing.unit ?? '';
  if (ing.quantity > 1 && COUNT_PLURAL[unit]) unit = COUNT_PLURAL[unit];
  const main = `${formatAmount(ing.quantity, unit)}${unit ? ` ${unit}` : ''}`;
  // "household" should be a size ("1 medium"); when the model wrote the whole
  // amount there ("200 g firm tofu (≈½ block)"), keep only its bracketed hint
  // so the amount and the ingredient name aren't shown twice.
  const household = String(ing.household || '').trim();
  let withHousehold = main;
  if (household && !main.includes(household)) {
    if (/\d\s*(g|ml|kg|l)\b/i.test(household)) {
      const hint = household.match(/\(([^)]+)\)/)?.[1];
      withHousehold = hint ? `${main} (${hint})` : main;
    } else {
      withHousehold = `${household} (${main})`;
    }
  }
  return ing.toTaste ? `${withHousehold}, adjust to taste` : withHousehold;
};

/**
 * Gives every ingredient a ref, numeric quantity + unit, database match and a
 * display string. Works for new structured recipes and for older recipes that
 * only have a free-text "qty".
 */
export const normalizeIngredients = (recipe, ctx) => {
  const seenRefs = new Set();
  recipe.ingredients = (recipe.ingredients || []).filter((i) => i && i.name).map((raw, idx) => {
    const ing = { ...raw };
    ing.name = String(ing.name).trim();
    // Legacy: quantity only as text ("1 1/2 tbsp", "2 medium (≈240 g)", "to taste").
    if (ing.quantity == null || ing.quantity === '' || Number.isNaN(Number(ing.quantity))) {
      const text = String(ing.qty ?? ing.quantity ?? '');
      const q = parseQuantity(text);
      ing.toTaste = ing.toTaste || /to taste|as needed/i.test(text);
      if (q.value != null) {
        ing.quantity = q.value;
        ing.unit = canonicalUnit(q.unit);
        const household = text.match(/^\s*[\d\s/.½¼¾⅓⅔-]+\s*(small|medium|large|cloves?|stalks?|sprigs?|pieces?|leaves|leaf)\b/i);
        if (household && /\(\s*(?:≈|~|about)?\s*\d/.test(text)) {
          // "2 medium (≈240 g)": the weight in brackets is the precise amount.
          const grams = text.match(/\(\s*(?:≈|~|about|approx\.?)?\s*(\d+(?:\.\d+)?)\s*(g|ml)\s*\)/i);
          if (grams) {
            ing.household = text.split('(')[0].trim();
            ing.quantity = Number(grams[1]);
            ing.unit = grams[2].toLowerCase();
          }
        }
      } else {
        ing.quantity = null;
        ing.unit = '';
      }
    } else {
      ing.quantity = Number(ing.quantity);
      ing.unit = canonicalUnit(ing.unit);
    }
    if (ing.quantity === 0) {
      // "0" means no amount: fine for seasoning to taste, otherwise reported.
      if (!ing.toTaste) ctx?.hard('quantities', `${ing.name} has a quantity of 0; give the amount used.`);
      ing.quantity = null;
      ing.unit = '';
    }
    ing.optional = Boolean(ing.optional) || /\boptional\b/i.test(`${ing.name} ${ing.group || ''} ${ing.prep || ''}`);
    let ref = String(ing.ref || '').trim() || slug(ing.name);
    while (seenRefs.has(ref)) ref = `${ref}_${idx}`;
    seenRefs.add(ref);
    ing.ref = ref;
    const match = matchIngredient(ing.name);
    ing.ingredientId = match.status === 'matched' ? match.ingredient.id : null;
    ing.category = match.status === 'matched' ? match.ingredient.category : (ing.category || null);
    ing.matchStatus = match.status;
    if (match.status !== 'matched') ing.matchNote = match.blocking?.length ? `"${match.blocking.join(' ')}" — no database record for this exact product` : 'no database record';
    ing.qty = displayQuantity(ing);
    return ing;
  });

  // Duplicate lines for the same food in the same role are merged (with the
  // steps re-pointed), so each food has one total in the list.
  const byKey = new Map();
  const merged = [];
  for (const ing of recipe.ingredients) {
    const key = ing.ingredientId ? `${ing.ingredientId}|${ing.optional}` : null;
    const first = key && byKey.get(key);
    if (first && first.quantity != null && ing.quantity != null) {
      const conv = convertAmount({ ...ing }, ing.quantity, ing.unit, first.unit);
      if (conv.value != null) {
        const before = `${first.qty} + ${ing.qty}`;
        first.quantity += conv.value;
        first.qty = displayQuantity(first);
        merged.push({ from: ing.ref, into: first.ref });
        ctx?.correct('ingredients', `"${ing.name}" was listed twice; merged into one line (${before} = ${first.qty}).`);
        continue;
      }
    }
    if (key) byKey.set(key, ing);
  }
  if (merged.length) {
    const drop = new Set(merged.map((m) => m.from));
    const into = Object.fromEntries(merged.map((m) => [m.from, m.into]));
    recipe.ingredients = recipe.ingredients.filter((i) => !drop.has(i.ref));
    for (const step of recipe.steps || []) {
      if (Array.isArray(step.ingredientsUsed)) step.ingredientsUsed = step.ingredientsUsed.map((u) => (into[u.ref] ? { ...u, ref: into[u.ref] } : u));
    }
  }
  return recipe.ingredients;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stepText = (step) => [step.title, ...(step.instructions || [])].join(' ');
const tokens = (s) => tokensOf(s);
// A later step refers to an ingredient in its prepared state ("cooked brown rice",
// "the marinated tofu"); those words don't make it a different ingredient.
const STATE_WORDS = new Set(['cooked', 'uncooked', 'boiled', 'steamed', 'roasted', 'toasted', 'marinated', 'soaked', 'prepared', 'pressed', 'drained', 'fried', 'seared', 'grilled', 'blanched', 'reserved', 'remaining', 'dry', 'raw', 'leftover', 'chopped', 'sliced', 'diced', 'minced', 'grated', 'fresh']);

/** Listed ingredient a food phrase refers to: same database record, or all its words in the name. */
const listedFor = (phrase, record, ingredients) => {
  const p = textTokens(phrase).filter((w) => !STATE_WORDS.has(w));
  return ingredients.find((ing) => (record && ing.ingredientId === record.id))
    || ingredients.find((ing) => {
      const n = tokens(ing.name);
      return p.length && p.every((w) => n.includes(w));
    })
    || ingredients.find((ing) => {
      // Same food in another state: "cooked brown rice" for listed "brown rice".
      const n = tokens(ing.name).filter((w) => !STATE_WORDS.has(w));
      return n.length && p.length && n.every((w) => p.includes(w)) && p.every((w) => n.includes(w));
    })
    || ingredients.find((ing) => {
      // A generic mention of the same kind of food: "the pasta" for listed
      // "whole-grain spaghetti", "the oil" for listed "olive oil".
      const fam = record && familyOf(record.id);
      return fam && familyOf(ing.ingredientId) === fam;
    })
    || null;
};

// Things the method may mention without listing: water for boiling/soaking,
// ice baths, and the cooking medium's generic name.
const EXEMPT_FOODS = new Set(['ING_WATER']);
// Words before a food that mean "more of it than was counted".
const EXTRA_BEFORE = /\b(extra|more|additional|another|a few|few|a handful of|handful of|some|a little|a splash of|splash of|a pinch of|pinch of|a squeeze of|squeeze of|a drizzle of|drizzle of)\s+(?:of\s+)?(?:the\s+)?(?:fresh\s+|chopped\s+|torn\s+)?$/i;
const TO_TASTE = /\b(to taste|if needed|if desired|adjust|as needed|to balance)\b/i;

// Same-unit amounts must match exactly (rounding only); amounts compared
// across units (tsp vs g) go through a typical weight, so allow 20%.
const close = (a, b, exact = true) => Math.abs(a - b) <= Math.max((exact ? 0.03 : 0.2) * Math.max(a, b), 0.02);

const fmt = (ing, value) => `${formatAmount(value, ing.unit)}${ing.unit && ing.unit !== 'piece' ? ` ${ing.unit === 'floz' ? 'fl oz' : ing.unit}` : ''}`;

// ---------------------------------------------------------------------------
// Structured validation
// ---------------------------------------------------------------------------

export const hasStructuredUsage = (recipe) =>
  (recipe.steps || []).length > 0 && (recipe.steps || []).every((s) => s && typeof s === 'object' && Array.isArray(s.ingredientsUsed));

/**
 * Checks a recipe whose steps carry ingredientsUsed.
 * Severity: 'hard' problems block generation and fail the quality gate.
 */
export const validateStructuredUsage = (recipe, ctx) => {
  const ingredients = recipe.ingredients || [];
  const byRef = new Map(ingredients.map((i) => [i.ref, i]));
  const used = new Map(ingredients.map((i) => [i.ref, []]));
  const produced = [];
  const mentionedBefore = new Set();
  const measuredSomewhere = new Set((recipe.steps || []).flatMap((st) => (st.ingredientsUsed || []).map((u) => u.ref)));

  (recipe.steps || []).forEach((step, idx) => {
    const n = step.stepNumber || idx + 1;
    const uses = step.ingredientsUsed || [];

    // 1. Every reference must point at a listed ingredient.
    for (const u of uses) {
      const ing = byRef.get(u.ref);
      if (!ing) {
        ctx.hard('ingredients', `Step ${n} uses "${u.ref}", which is not in the ingredient list. Add it to "ingredients" with its total quantity.`);
        continue;
      }
      used.get(u.ref).push({ step: n, quantity: u.quantity, unit: u.unit, optional: Boolean(step.optional) });
    }

    const text = stepText(step);
    const usesHere = new Set(uses.map((u) => u.ref));

    // 2. Amounts written in the instructions must equal the structured amounts.
    for (const instruction of step.instructions || []) {
      for (const m of findQuantityMentions(instruction)) {
        const mm = matchIngredient(m.phrase);
        const ing = listedFor(m.phrase, mm.status === 'matched' ? mm.ingredient : null, ingredients);
        if (!ing) continue; // unlisted foods are caught by the vocabulary check below
        const structured = uses.filter((u) => u.ref === ing.ref);
        if (!structured.length) {
          if (!TO_TASTE.test(instruction)) {
            ctx.hard('quantities', `Step ${n} says "${m.amountText} ${m.phrase}" but its ingredientsUsed has no entry for ${ing.name}; that amount is not counted in the ingredient total.`);
          }
          continue;
        }
        let exact = true;
        const total = structured.reduce((s, u) => {
          const c = convertAmount({ ...ing }, u.quantity, u.unit, m.unit || ing.unit);
          if (!c.exact) exact = false;
          return s + (c.value ?? NaN);
        }, 0);
        const textAmount = m.qty.value;
        if (Number.isFinite(total) && textAmount != null && !close(total, textAmount, exact) && !structured.some((u) => close(Number(u.quantity), textAmount))) {
          ctx.hard('quantities', `Step ${n}: the instruction says ${m.amountText} ${ing.name}, but the step's ingredientsUsed says ${structured.map((u) => `${formatAmount(Number(u.quantity), u.unit)} ${u.unit}`).join(' + ')}.`);
        }
      }
    }

    // 3. Foods named in the step (with or without an amount).
    const mentions = foodsMentionedIn(text);
    for (const { ingredient: record, phrase, index } of mentions) {
      if (EXEMPT_FOODS.has(record.id)) continue;
      const ing = listedFor(phrase, record, ingredients);
      if (!ing) {
        const madeEarlier = produced.some((p) => tokens(phrase).every((w) => tokens(p).includes(w)));
        if (!madeEarlier) {
          ctx.hard('ingredients', `Step ${n} uses ${phrase}, which is not in the ingredient list${step.optional ? ' (optional sides need their own ingredients too)' : ''}. Add it with its quantity, or remove it from the method.`);
        }
        continue;
      }
      // "a few extra basil leaves" adds more than was measured — even in a
      // step that measured some of it.
      const before = normalizeText(text).split(' ').slice(Math.max(0, index - 5), index).join(' ');
      const extra = EXTRA_BEFORE.test(`${before} `);
      if (usesHere.has(ing.ref) && !extra) continue;
      // Mentioned here without an amount: fine if it was measured out earlier
      // ("add the marinated tofu").
      // Handled here without an amount: fine when some step measures it — earlier
      // ("add the marinated tofu") or later (a prep step chopping the coriander that
      // the garnish step measures). The list total check covers the amount.
      const earlier = mentionedBefore.has(ing.ref) || measuredSomewhere.has(ing.ref);
      if (extra) {
        if (TO_TASTE.test(text)) ctx.warn('quantities', `Step ${n} suggests adding more ${ing.name} to taste; that extra amount is not included in the ingredient list or nutrition.`);
        else ctx.hard('quantities', `Step ${n} adds extra ${ing.name} ("${before.split(' ').slice(-3).join(' ')} ${phrase}") that is not counted in ingredientsUsed or in the listed quantity.`);
      } else if (!earlier && !TO_TASTE.test(text)) {
        ctx.hard('quantities', `Step ${n} uses ${ing.name} but does not say how much, and no step's ingredientsUsed measures it.`);
      }
    }
    for (const r of usesHere) mentionedBefore.add(r);
    if (step.produces) produced.push(String(step.produces));
  });

  // 4. Totals: the listed quantity must equal the sum of all uses.
  for (const ing of ingredients) {
    const uses = used.get(ing.ref) || [];
    if (!uses.length) {
      ctx.hard('ingredients', `${ing.name} is in the ingredient list but no step uses it. Use it in a step (with its amount) or remove it.`);
      continue;
    }
    if (ing.quantity == null) {
      if (!ing.toTaste) ctx.hard('quantities', `${ing.name} has no quantity in the ingredient list.`);
      continue;
    }
    let total = 0;
    let convertible = true;
    let exact = true;
    for (const u of uses) {
      const c = convertAmount({ ...ing }, Number(u.quantity), u.unit, ing.unit);
      if (c.value == null) { convertible = false; break; }
      if (!c.exact) exact = false;
      total += c.value;
    }
    if (!convertible) {
      ctx.hard('quantities', `${ing.name}: the steps measure it in ${[...new Set(uses.map((u) => u.unit))].join(', ')} but the list uses ${ing.unit}; use one unit so the amounts can be added up.`);
      continue;
    }
    if (!close(total, ing.quantity, exact)) {
      const parts = uses.map((u) => `${formatAmount(Number(u.quantity), u.unit)} ${u.unit} (step ${u.step})`).join(' + ');
      const verdict = total > ing.quantity ? 'more than' : 'less than';
      ctx.hard('quantities', `${ing.name}: the method uses ${parts} = ${fmt(ing, total)}, ${verdict} the ${ing.qty} listed. The listed quantity must equal the total used.`);
    }
    // 5. Optional ingredients.
    const onlyOptional = uses.every((u) => u.optional);
    if (onlyOptional && !ing.optional) {
      ctx.hard('ingredients', `${ing.name} is only used in an optional step, so it must be marked optional in the ingredient list.`);
    } else if (!onlyOptional && ing.optional) {
      ctx.hard('ingredients', `${ing.name} is marked optional but a required step uses it.`);
    }
  }

  // 6. Something made in a step must not also be bought ready-made.
  for (const p of produced) {
    const dup = ingredients.find((ing) => /\bhomemade\b/i.test(ing.name) && tokens(p).some((w) => tokens(ing.name).includes(w)) && tokens(ing.name).filter((w) => w !== 'homemade').every((w) => tokens(p).includes(w)));
    if (dup) ctx.hard('ingredients', `"${dup.name}" is listed as an ingredient but a step makes it ("${p}") from other listed ingredients, so it would be counted twice.`);
  }
};

// ---------------------------------------------------------------------------
// Legacy validation (no structured references): text only, report-only
// ---------------------------------------------------------------------------

export const validateLegacyUsage = (recipe, ctx) => {
  const ingredients = recipe.ingredients || [];
  const sums = new Map();
  const allText = [];
  (recipe.steps || []).forEach((step, idx) => {
    const n = idx + 1;
    const instructions = typeof step === 'string' ? [step] : step.instructions || [];
    for (const instruction of instructions) {
      allText.push(instruction);
      for (const m of findQuantityMentions(instruction)) {
        const mm = matchIngredient(m.phrase);
        const ing = listedFor(m.phrase, mm.status === 'matched' ? mm.ingredient : null, ingredients);
        if (!ing || ing.quantity == null) continue;
        if (/\b(remaining|rest of|reserved)\b/i.test(instruction) && (sums.get(ing.ref) || []).length) continue;
        const c = convertAmount({ ...ing }, m.qty.value, m.unit, ing.unit);
        if (c.value == null) continue;
        if (!sums.has(ing.ref)) sums.set(ing.ref, []);
        sums.get(ing.ref).push({ n, text: m.amountText, value: c.value });
      }
    }
    const text = typeof step === 'string' ? step : stepText(step);
    for (const { ingredient: record, phrase } of foodsMentionedIn(text)) {
      if (EXEMPT_FOODS.has(record.id)) continue;
      if (!listedFor(phrase, record, ingredients)) {
        ctx.warn('ingredients', `Step ${n} uses ${phrase}, which is not in the ingredient list.`);
      }
    }
  });
  for (const ing of ingredients) {
    const uses = sums.get(ing.ref) || [];
    if (uses.length < 2 && !(uses.length === 1 && uses[0].value > ing.quantity * 1.05)) continue;
    const total = uses.reduce((s, u) => s + u.value, 0);
    if (!close(total, ing.quantity) && total > ing.quantity) {
      ctx.warn('quantities', `${ing.name}: the method uses ${uses.map((u) => `${u.text} (step ${u.n})`).join(' + ')} = ${fmt(ing, total)}, but ${ing.qty} is listed.`);
    }
  }
  const text = textTokens(allText.join(' ')).join(' ');
  for (const ing of ingredients) {
    const words = tokens(ing.name).filter((w) => w.length > 2 && !['fresh', 'low', 'sodium', 'light', 'chopped', 'the', 'and', 'for'].includes(w));
    if (words.length && !words.some((w) => text.includes(w))) ctx.warn('ingredients', `${ing.name} is listed but never mentioned in the method.`);
  }
};

export { formatQuantity };
