// Recipe validation orchestrator.
//
// Runs on every generated recipe before it is saved, and again whenever a
// recipe is read, so the page and the PDF always show validated data.
//
//   1. ingredients  normalise lines (ID, quantity, unit), merge duplicates
//   2. usage        ingredient list <-> method (structured ingredientsUsed)
//   3. diet         diet type, dietary labels, allergens, substitutions
//   4. nutrition    calculated from the ingredient database (never the model)
//   5. servings     serving count and portion size
//   6. timing       workflow schedule with parallel waiting
//   7. safety       food-safety guidance and doneness cues
//   8. language     unsupported health claims, nutrient claims, swap numbers
//   9. identity     dish authenticity and title checks, image brief
//  10. quality      weighted score with a hard-failure gate
//
// Each rule records corrections (visible, never silent) and issues. 'hard'
// issues are sent back to the model during generation and fail the quality
// gate; 'warning' issues lower the score.

import { normalizeIngredients, hasStructuredUsage, validateStructuredUsage, validateLegacyUsage } from './ingredientUsage.js';
import { calculateNutrition, describeNutrition } from './nutritionEngine.js';
import { calculateTiming } from './timingEngine.js';
import { applyDietAndAllergens, applySubstitutions, buildFoodSafety } from './dietSafety.js';
import { applyHealthLanguage, quantifySwaps } from './healthClaims.js';
import { scoreRecipe } from './recipeQuality.js';
import { matchIngredient, normalizeName, foodsMentionedIn, familyOf, getIngredient } from './ingredientDb.js';

const r1 = (v) => (v == null ? null : v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

/**
 * Removes what an ingredient name says it is NOT: "(no shrimp paste)",
 * "without fish sauce", "egg-free". With plantLabels, a plant-based label also
 * covers the animal word it qualifies ("vegan fish sauce"); not applied to
 * gluten, since "vegan soy sauce" still has wheat. (Used by recipeValidator.)
 */
export const withoutExclusions = (text, plantLabels = true) => {
  let s = String(text || '')
    .toLowerCase()
    .replace(/[‐‑‒−]/g, '-')
    .replace(/\([^)]*\b(alternative|substitute|replacement|replacer|swap|instead of)\b[^)]*\)/g, ' ')
    .replace(/\b(no|without|free of|free from|minus|omit(?:ting)?|skip(?:ping)?|instead of)\s+[a-z' -]+?(?=[),;:.]|\bor\b|\band\b|$)/g, ' ')
    .replace(/\b[a-z]+-free\b/g, ' ');
  if (plantLabels) {
    s = s.replace(/\b(vegan|vegetarian|plant[- ]based|mushroom[- ]based|soy[- ]based|seaweed[- ]based|mock|imitation|faux|meatless)\b[a-z' -]*/g, ' ');
    if (/\b(mushroom|soy|seaweed|plant)[- ]based\b/.test(String(text).toLowerCase())) s = s.replace(/\b(shrimp paste|fish sauce|oyster sauce)\b/g, ' ');
  }
  return s;
};

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const normalizeSteps = (recipe) => {
  recipe.steps = (recipe.steps || []).filter(Boolean).map((s, i) => {
    if (typeof s === 'string') return { stepNumber: i + 1, title: `Step ${i + 1}`, instructions: [s] };
    const step = { ...s };
    step.stepNumber = Number(step.stepNumber) || i + 1;
    step.instructions = (Array.isArray(step.instructions) ? step.instructions : [step.instructions]).filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim());
    if (Array.isArray(step.ingredientsUsed)) {
      step.ingredientsUsed = step.ingredientsUsed.filter((u) => u && u.ref).map((u) => ({ ref: String(u.ref), quantity: Number(u.quantity), unit: String(u.unit || '').toLowerCase() }));
    }
    step.visualCues = Array.isArray(step.visualCues) ? step.visualCues.filter(Boolean) : step.visualCues ? [step.visualCues] : [];
    return step;
  });
};

const checkInstructions = (recipe, ctx, mode) => {
  const steps = recipe.steps || [];
  if (steps.length < 3) ctx.hard('instructions', `The method has only ${steps.length} step(s); write every step from preparation to serving.`);
  for (const step of steps) {
    if (!step.instructions?.length) ctx.hard('instructions', `Step ${step.stepNumber} ("${step.title}") has no instructions.`);
    const heat = step.heatLevel && !/^none$/i.test(step.heatLevel);
    const text = (step.instructions || []).join(' ');
    if (heat && !/\b(low|medium|high|simmer|boil|°|degrees|gas mark)\b/i.test(`${text} ${step.heatLevel}`)) {
      ctx.warn('instructions', `Step ${step.stepNumber} cooks over heat but doesn't say how hot.`);
    }
    if (heat && mode === 'generate' && !(step.visualCues || []).length && !/\buntil\b/i.test(text)) {
      ctx.warn('instructions', `Step ${step.stepNumber} ("${step.title}") doesn't say how to tell when it's done.`);
    }
  }
};

// ---------------------------------------------------------------------------
// Servings & portion size
// ---------------------------------------------------------------------------

const checkServings = (recipe, ctx, nutrition, mode) => {
  const s = Number(recipe.servings);
  if (!Number.isInteger(s) || s < 1 || s > 12) {
    ctx.hard('servings', `Servings must be a whole number from 1 to 12 (got "${recipe.servings}").`);
    return;
  }
  if (!nutrition?.perServing || nutrition.status === 'insufficient') return;
  const isMeal = /main|entr[ée]e|dinner|lunch|curry|bowl|meal|breakfast|pasta|rice/i.test(`${recipe.category} ${recipe.meal_type}`);
  if (!isMeal) return;
  const g = nutrition.gramsPerServing;
  const kcal = nutrition.perServing.kcal;
  const problems = [];
  if (g < 150) problems.push(`only about ${Math.round(g)} g of food per serving`);
  if (g > 900) problems.push(`about ${Math.round(g)} g of food per serving`);
  if (kcal < 150) problems.push(`only ${Math.round(kcal)} kcal per serving`);
  if (kcal > 1100) problems.push(`${Math.round(kcal)} kcal per serving`);
  if (problems.length) {
    const msg = `The quantities don't fit ${s} servings of a main meal: ${problems.join(', ')}. Scale the ingredients to the servings.`;
    if (mode === 'generate') ctx.hard('servings', msg);
    else ctx.warn('servings', msg);
  }
};

// ---------------------------------------------------------------------------
// Dish identity
// ---------------------------------------------------------------------------

const TITLE_INGREDIENTS = ['chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'prawn', 'shrimp', 'paneer', 'tofu', 'tempeh', 'egg', 'chickpea', 'rajma', 'lentil', 'mushroom', 'spinach', 'palak', 'potato', 'aloo', 'cauliflower', 'gobi', 'eggplant', 'quinoa', 'oat', 'coconut', 'pasta', 'rice', 'noodle'];
const CURRY_COLOR = /\b(red|green|yellow|massaman|panang)\b/;

const checkTitle = (recipe, ctx, mode) => {
  const name = String(recipe.dish_name || '').toLowerCase();
  const ingText = (recipe.ingredients || []).filter((i) => !i.optional).map((i) => i.name.toLowerCase()).join(' | ');
  const makesIt = /\b(homemade|home-made|from scratch)\b/.test(name);
  const SYN = { palak: 'spinach|palak', aloo: 'potato|aloo', gobi: 'cauliflower|gobi', noodle: 'noodle|zoodle|zucchini noodle', pasta: 'pasta|spaghetti|penne|fusilli|linguine|rigatoni|macaroni|farfalle|tagliatelle|zucchini noodle', rice: 'rice' };
  for (const word of makesIt ? [] : TITLE_INGREDIENTS) {
    const inTitle = new RegExp(`\\b${word}`).test(name.replace(/\beggplant/g, 'aubergine'));
    if (!inTitle) continue;
    const re = new RegExp(`\\b(${SYN[word] || word})`);
    if (!re.test(word === 'egg' ? ingText.replace(/\beggplant/g, '') : ingText)) {
      const msg = `The dish name mentions "${word}" but no ingredient is ${word}.`;
      if (mode === 'generate') ctx.hard('title', msg);
      else ctx.warn('title', msg);
    }
  }
  const color = name.includes('curry') ? name.match(CURRY_COLOR)?.[1] : null;
  if (color) {
    const other = (recipe.ingredients || []).find((i) => /paste/i.test(i.name) && (i.name.toLowerCase().match(CURRY_COLOR)?.[1] || color) !== color);
    if (other) ctx.hard('title', `"${recipe.dish_name}" is a ${color} curry but uses "${other.name}".`);
  }
};

/**
 * Compares the recipe with the dish's defining ingredients and flavourings
 * (from the dish profile recorded at generation time). Ingredients replaced
 * by an approved swap or required by the user's diet count as present.
 */
const checkAuthenticity = (recipe, ctx, profile, mode) => {
  if (!profile || !(profile.primaryIngredients || []).length) return null;
  const ids = new Set((recipe.ingredients || []).map((i) => i.ingredientId).filter(Boolean));
  const names = (recipe.ingredients || []).map((i) => normalizeName(i.name)).join(' | ');
  const swappedAway = (profile.swaps || []).map((s) => normalizeName(s.original || s.from || ''));
  const families = new Set([...ids].map(familyOf).filter(Boolean));
  const categories = new Set([...ids].map((id) => getIngredient(id)?.category).filter(Boolean));
  // Generic words in a dish profile ("vegetables", "spices") are satisfied by
  // any ingredient of that kind.
  const GENERIC = { vegetable: 'vegetable', vegetables: 'vegetable', veggies: 'vegetable', greens: 'vegetable', herbs: 'herb', herb: 'herb', spices: 'spice', 'spice blend': 'spice', protein: null };
  const present = (item) => {
    const key = normalizeName(item);
    if (key in GENERIC) return GENERIC[key] ? categories.has(GENERIC[key]) : [...categories].some((c) => ['soy', 'legume', 'meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg'].includes(c));
    const m = matchIngredient(item);
    if (m.status === 'matched' && ids.has(m.ingredient.id)) return true;
    // Same kind of food: "pasta" for whole-grain spaghetti, "tomato sauce" for tomato purée.
    const records = m.status === 'matched' ? [m.ingredient] : foodsMentionedIn(item).map((f) => f.ingredient);
    if (records.some((r) => familyOf(r.id) && families.has(familyOf(r.id)))) return true;
    const words = normalizeName(item).split(' ').filter((w) => w.length > 2);
    if (words.length && words.every((w) => names.includes(w.replace(/s$/, '')))) return true;
    return swappedAway.some((s) => s && (s.includes(normalizeName(item)) || normalizeName(item).includes(s)));
  };
  const primary = profile.primaryIngredients;
  const signature = profile.signatureFlavorings || [];
  const missingPrimary = primary.filter((p) => !present(p));
  const missingSignature = signature.filter((p) => !present(p));
  const notes = [];
  if (missingPrimary.length) notes.push(`Defining ingredients missing: ${missingPrimary.join(', ')}.`);
  if (missingSignature.length) notes.push(`Signature flavourings missing: ${missingSignature.join(', ')}.`);
  const pScore = primary.length ? (primary.length - missingPrimary.length) / primary.length : 1;
  const sScore = signature.length ? (signature.length - missingSignature.length) / signature.length : 1;
  if (missingPrimary.length > Math.floor(primary.length / 2)) {
    const msg = `The recipe no longer resembles "${recipe.dish_name}": most of its defining ingredients (${missingPrimary.join(', ')}) are missing.`;
    if (mode === 'generate') ctx.hard('authenticity', msg);
    else ctx.warn('authenticity', msg);
  } else if (missingPrimary.length) {
    ctx.warn('authenticity', `Defining ingredient${missingPrimary.length > 1 ? 's' : ''} of ${recipe.dish_name} not used: ${missingPrimary.join(', ')} (and not replaced by an approved swap).`);
  }
  return { score: Math.round(100 * (0.7 * pScore + 0.3 * sScore)), notes: notes.length ? notes : ['All defining ingredients and signature flavourings are present.'] };
};

// What the dish photo must show, derived from the validated recipe.
const PANTRY = /\b(water|salt|pepper|oil|ghee|sugar|stock|broth|sauce|vinegar|juice|powder|seeds?|leaves|leaf|paste|zest)\b/i;
const COLORS = ['red', 'green', 'yellow', 'white', 'golden', 'brown', 'orange', 'black', 'purple'];
const buildImageBrief = (recipe, ctx) => {
  const details = recipe.details;
  const name = String(recipe.dish_name || '');
  const lower = name.toLowerCase();
  // What you can see on the plate: the heaviest ingredients, leaving out
  // seasonings, oils and liquids (by database category, so "spinach leaves"
  // stays in and "bay leaves" stays out).
  const HIDDEN = new Set(['spice', 'fat', 'liquid', 'condiment', 'sweetener']);
  const visible = (i) => {
    const cat = i.ingredientId ? getIngredient(i.ingredientId)?.category : null;
    if (cat) return !HIDDEN.has(cat) && !(cat === 'herb' && (Number(i.grams) || 0) < 5) || /curry paste|coconut milk/i.test(i.name);
    return !PANTRY.test(i.name);
  };
  const main = (recipe.ingredients || [])
    .filter((i) => !i.optional && visible(i))
    .sort((a, b) => (Number(b.grams) || 0) - (Number(a.grams) || 0))
    .slice(0, 6)
    .map((i) => i.name.replace(/\s*\([^)]*\)/g, ''));
  const colors = COLORS.filter((c) => new RegExp(`\\b${c}\\b`).test(lower));
  const avoid = [];
  if (/curry/.test(lower) && colors.length) for (const c of ['red', 'green', 'yellow']) if (!colors.includes(c)) avoid.push(`${c} curry`);
  // Whole value only: "Non-Vegetarian" contains the word "Vegetarian".
  if (/^(vegetarian|vegan)$/i.test(String(recipe.diet_type || '').trim())) avoid.push('meat', 'chicken', 'fish', 'shrimp');
  if (/\btofu\b/.test(lower)) avoid.push('chicken', 'paneer');
  if (/\bpaneer\b/.test(lower)) avoid.push('tofu', 'chicken');
  const visual = String(details.visualDescription || '').trim();
  if (!visual) ctx.warn('image', 'No visual description of the finished dish; the photo prompt uses the dish name and main ingredients only.');
  details.imageBrief = { dishName: name, cuisine: recipe.cuisine || '', mainIngredients: main, colors, visualDescription: visual, avoid: [...new Set(avoid)] };
};

// "yields 300 g" -> "yields about 300 g": transformations never give an exact yield.
const YIELD_RE = /\b(yields?|makes?|produces?|gives?|you(?:'ll| will) (?:get|have))\s+(?!about|approximately|around|roughly|approx|~|up to)(\d+(?:\.\d+)?(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(?:g|grams|kg|ml|l|cups?)\b)/gi;
const softenYields = (recipe, ctx) => {
  const soften = (text, where) => String(text || '').replace(YIELD_RE, (match, verb, amount) => {
    ctx.correct('instructions', `${where}: "${match}" changed to "${verb} about ${amount}" (yields vary).`);
    return `${verb} about ${amount}`;
  });
  recipe.description = soften(recipe.description, 'Description');
  for (const step of recipe.steps) step.instructions = step.instructions.map((t) => soften(t, `Step ${step.stepNumber}`));
};

// ---------------------------------------------------------------------------
// Nutrition onto the recipe fields the UI and PDF read
// ---------------------------------------------------------------------------

const applyNutrition = (recipe, ctx, n, mode) => {
  const d = recipe.details;
  if (!n.perServing) {
    ctx.hard('nutrition', 'Nutrition could not be calculated: servings are missing or invalid.');
    return;
  }
  const p = n.perServingRounded;
  const claimedKcal = Number(recipe.calories);
  if (mode === 'read' && claimedKcal && Math.abs(claimedKcal - p.kcal) > Math.max(25, 0.15 * p.kcal) && !d.nutritionMeta?.engineVersion) {
    ctx.correct('nutrition', `Calories recalculated from the ingredients: ${claimedKcal} → ${p.kcal} kcal per serving.`);
  }
  recipe.calories = p.kcal;
  recipe.protein = `${r1(p.protein)}g`;
  recipe.fats = `${r1(p.fat)}g`;
  recipe.fiber = `${r1(p.fiber)}g`;
  recipe.sodium = `${p.sodium}mg`;
  d.nutrition = {
    carbohydrates: `${r1(p.carbs)}g`,
    sugar: `${r1(p.sugar)}g`,
    addedSugar: `${r1(p.addedSugar)}g`,
    saturatedFat: `${r1(p.satFat)}g`,
  };
  d.nutritionMeta = {
    engineVersion: 2,
    method: 'calculated',
    estimated: true,
    status: n.status,
    verified: n.status === 'complete',
    coverage: Math.round(n.coverage * 100) / 100,
    gramsPerServing: Math.round(n.gramsPerServing || 0),
    perServing: p,
    unknownIngredients: n.unknown.map((u) => ({ name: u.name, reason: u.reason })),
    incompleteNutrients: n.incompleteNutrients,
    proxies: n.proxies,
    labelBased: n.labelBased,
    lossEstimates: n.lossEstimates,
    variability: n.variability,
    sources: n.lines.filter((l) => l.fdcId).map((l) => ({ ingredient: l.name, record: l.sourceDescription, fdcId: l.fdcId, grams: l.grams, conversion: l.conversionBasis, type: l.source })),
    note: describeNutrition(n),
  };
  // Per-ingredient weight and source, shown next to each ingredient.
  const byRef = new Map(n.lines.map((l) => [l.ref, l]));
  for (const ing of recipe.ingredients) {
    const l = byRef.get(ing.ref);
    ing.grams = l?.grams ?? null;
    ing.nutritionSource = l ? l.source : ing.optional ? 'optional (not counted)' : 'unknown';
    // AI per-100 g values from older recipes are never used; drop them.
    delete ing.nutritionPer100g;
    delete ing.retainedFraction;
  }
  if (n.status === 'insufficient') {
    ctx.hard('nutrition', `Nutrition can't be calculated reliably: only ${Math.round(n.coverage * 100)}% of the recipe has nutrition data (missing: ${n.unknown.map((u) => `${u.name} — ${u.reason}`).join('; ')}).`);
  } else if (n.status === 'partial') {
    ctx.warn('nutrition', `Nutrition excludes ${n.unknown.map((u) => `${u.name} (${u.reason})`).join('; ')}.`);
  }
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

const RULES = ['ingredients', 'quantities', 'instructions', 'servings', 'nutrition', 'nutrition-tags', 'timing', 'diet', 'allergens', 'substitutions', 'food-safety', 'health-claims', 'title', 'authenticity', 'image'];

/**
 * Validates (and visibly corrects) a recipe. Works on a copy.
 * @param {object} input — recipe
 * @param {{ inputs?: object, mode?: 'generate'|'read', dishProfile?: object }} options
 *   mode 'generate': hard issues are returned for the model to fix.
 *   mode 'read':     the stored recipe is checked again before display/PDF.
 * @returns {{ recipe, report, quality, nutrition }}
 */
export const validateAndCorrectRecipe = (input, { inputs = {}, mode = 'generate', dishProfile = null } = {}) => {
  const recipe = JSON.parse(JSON.stringify(input || {}));
  recipe.details = recipe.details && typeof recipe.details === 'object' ? recipe.details : {};
  const profile = dishProfile || recipe.details.dishProfile || null;
  if (profile) recipe.details.dishProfile = profile;

  const corrections = [];
  const issues = [];
  const ctx = {
    correct: (rule, message) => corrections.push({ rule, message }),
    warn: (rule, message) => issues.push({ rule, severity: 'warning', message }),
    hard: (rule, message) => issues.push({ rule, severity: 'hard', message }),
  };
  const run = (rule, fn) => {
    try {
      return fn();
    } catch (error) {
      issues.push({ rule, severity: 'warning', message: `Check could not run: ${error.message}` });
      return null;
    }
  };

  normalizeSteps(recipe);
  run('ingredients', () => normalizeIngredients(recipe, ctx));
  const structured = hasStructuredUsage(recipe);
  if (structured) run('quantities', () => validateStructuredUsage(recipe, ctx));
  else {
    run('quantities', () => validateLegacyUsage(recipe, ctx));
    if (mode === 'generate') ctx.hard('quantities', 'Every step must list ingredientsUsed (ref, quantity, unit) so ingredient totals can be checked.');
  }
  run('instructions', () => checkInstructions(recipe, ctx, mode));
  run('instructions', () => softenYields(recipe, ctx));

  const diet = run('diet', () => applyDietAndAllergens(recipe, ctx, { inputs, mode }));
  if (diet) run('substitutions', () => applySubstitutions(recipe, ctx, diet, { inputs }));

  const nutrition = run('nutrition', () => calculateNutrition(recipe));
  if (nutrition) run('nutrition', () => applyNutrition(recipe, ctx, nutrition, mode));
  run('servings', () => checkServings(recipe, ctx, nutrition, mode));

  const timing = run('timing', () => calculateTiming(recipe, ctx, { structured }));
  if (timing) {
    Object.assign(recipe.details, timing.display, { timingMinutes: timing.minutes, schedule: timing.schedule });
    recipe.cooking_time = timing.display.totalTime;
    for (const step of recipe.steps) {
      const active = Number(step.activeMinutes) || 0;
      const passive = Number(step.passiveMinutes) || 0;
      if (structured && active + passive > 0) step.time = `${active + passive} min${passive ? ` (${passive} min ${step.passiveLabel || 'hands-off'})` : ''}`;
    }
  }

  run('food-safety', () => buildFoodSafety(recipe, ctx, { mode }));
  run('health-claims', () => applyHealthLanguage(recipe, ctx, nutrition, { mode }));
  run('health-claims', () => quantifySwaps(recipe, ctx));
  run('title', () => checkTitle(recipe, ctx, mode));
  const authenticity = run('authenticity', () => checkAuthenticity(recipe, ctx, profile, mode));
  run('image', () => buildImageBrief(recipe, ctx));

  // The same finding can be reached from two instructions of one step.
  const seen = new Set();
  for (let i = issues.length - 1; i >= 0; i--) {
    const key = `${issues[i].severity}|${issues[i].message}`;
    if (seen.has(key)) issues.splice(i, 1);
    else seen.add(key);
  }

  const checks = Object.fromEntries(RULES.map((rule) => {
    const ruleIssues = issues.filter((i) => i.rule === rule);
    const status = ruleIssues.some((i) => i.severity === 'hard') ? 'failed'
      : ruleIssues.length ? 'warning'
        : corrections.some((c) => c.rule === rule) ? 'corrected' : 'passed';
    return [rule, status];
  }));
  const hard = issues.filter((i) => i.severity === 'hard');
  const report = {
    version: 2,
    mode,
    structured,
    checkedAt: new Date().toISOString(),
    passed: hard.length === 0,
    checks,
    corrections,
    issues,
  };
  const quality = scoreRecipe(recipe, report, { nutrition, authenticity, structured });
  recipe.details.validation = report;
  recipe.details.quality = quality;
  return { recipe, report, quality, nutrition };
};
