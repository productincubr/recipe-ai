// Health language: removes unsupported claims, checks nutrient claims against
// the calculated nutrition, and turns ingredient swaps into numbers.

import { matchIngredient, toGrams } from './ingredientDb.js';

const HEDGE = /\b(may|might|can|could|helps?|supports?|contributes?|part of|associated with)\b/i;
const CLAIM_RULES = [
  { re: /\b(cures?|cured|curing|heals?|healing|reverses?|reversing)\b/i, why: 'promises a medical outcome' },
  { re: /\btreat(s|ing)? (diabetes|hypertension|disease|cancer|inflammation|illness|conditions?|arthritis|pcos)/i, why: 'promises to treat a condition' },
  { re: /\bprevent(s|ing)? (cancer|diabetes|heart disease|disease|illness|alzheimer|dementia|infections?|strokes?)/i, why: 'promises disease prevention' },
  { re: /\bdetox\w*|\bcleans(e|es|ing) (the |your )?(body|liver|blood|system)|\bflush(es|ing)? (out )?toxins/i, why: '"detox" claims are not supported' },
  { re: /\bboost(s|ing)? (your |the )?(immunity|immune system|metabolism|energy)\b/i, why: 'overstated immunity/metabolism/energy claim' },
  { re: /\bburn(s|ing)? (belly )?fat\b|\bfat[- ]burning\b|\bmelts? (away )?fat\b/i, why: 'fat-burning claim' },
  { re: /\bguarantee[sd]?\b|\b(clinically|scientifically) proven\b|\bproven to\b/i, why: 'claims a guaranteed or proven outcome' },
  { re: /\b(mcts?|medium[- ]chain triglycerides?)\b/i, why: 'MCT benefits of coconut are overstated in cooking amounts' },
  { re: /(?=.*\b(coconut|ghee|butter|lard|palm oil|cream)\b)(?=.*(heart[- ]health|good for (your )?heart|healthy fats?|like olive oil|lowers? cholesterol|good cholesterol))/i, why: 'presents a saturated fat as heart-healthy' },
  { re: /\bsuperfoods?\b|\balkalis(e|ing)\b|\balkaliz(e|ing)\b/i, why: 'marketing term with no nutritional definition' },
  { re: /\banti[- ]?inflammatory\b/i, why: 'anti-inflammatory effects of a single meal are not established', unlessHedged: true },
  { re: /\b(rich|packed|loaded|high) (in|with) antioxidants?\b|\bantioxidant[- ](rich|packed|powerhouse)\b/i, why: 'vague antioxidant claim', unlessHedged: true },
  { re: /\bheart[- ]healthy\b|\bsupports? (your )?heart health\b|\bgood for (your )?heart\b/i, why: 'heart-health claim without a specific, supported basis', unlessHedged: true },
  { re: /\b(lowers?|reduces?|regulates?|controls?|stabili[sz]es?|balances?|normali[sz]es?) (your )?(blood pressure|blood sugar|blood glucose|cholesterol|insulin|hormones|inflammation)\b/i, why: 'states a health outcome as certain', unlessHedged: true },
  { re: /\b(lose|losing) weight\b|\bweight[- ]loss\b|\bslimming\b/i, why: 'states weight loss as an outcome', unlessHedged: true },
  { re: /\bimproves? (gut|digestion|immunity|skin|brain|memory|mood)\b/i, why: 'states a health outcome as certain', unlessHedged: true },
];

export const claimProblem = (sentence) => {
  const s = String(sentence || '').replace(/[‐‑‒−]/g, '-');
  return CLAIM_RULES.find((rule) => rule.re.test(s) && !(rule.unlessHedged && HEDGE.test(s))) || null;
};

const plain = (name) => String(name).replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
const sentences = (text) => String(text || '').match(/[^.!?]+[.!?]*\s*/g) || [];
const r1 = (v) => (Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

/**
 * Nutrient-content rules (per serving for a meal unless stated):
 *  Low-sodium   ≤ 140 mg per 100 g of food (US FDA meal rule)
 *  Low-fat      ≤ 3 g fat per 100 g and ≤ 30% of calories from fat
 *  Low-sugar    ≤ 5 g sugar per 100 g (EU rule)
 *  No added sugar  no sweetener ingredients
 *  High-protein ≥ 20 g protein per serving
 *  High-fibre   ≥ 5 g fibre per serving
 *  Low-carb     ≤ 20 g carbohydrate per serving
 *  Low-calorie  ≤ 120 kcal per 100 g
 */
const nutrientRules = (n) => {
  const p = n.perServing;
  const g = n.gramsPerServing || 0;
  const per100 = (v) => (g ? (v / g) * 100 : Infinity);
  const fatShare = p.kcal ? (9 * p.fat) / p.kcal : 0;
  const complete = (k) => !n.incompleteNutrients?.[k];
  return [
    { re: /^low[- ]?(sodium|salt)$/, ok: complete('sodium') && per100(p.sodium) <= 140, why: `${Math.round(per100(p.sodium))} mg sodium per 100 g (needs 140 mg or less)`, phrase: /\blow[- ](sodium|salt)\b/i },
    { re: /^low[- ]?fat$/, ok: complete('fat') && per100(p.fat) <= 3 && fatShare <= 0.3, why: `${r1(per100(p.fat))} g fat per 100 g, ${Math.round(fatShare * 100)}% of calories (needs ≤3 g and ≤30%)`, phrase: /\blow[- ]fat\b/i },
    { re: /^low[- ]?sugar$/, ok: complete('sugar') && per100(p.sugar) <= 5, why: `${r1(per100(p.sugar))} g sugar per 100 g (needs 5 g or less)`, phrase: /\blow[- ]sugar\b/i },
    { re: /^(no|zero)[- ]added[- ]sugars?$|^refined[- ]sugar[- ]free$/, ok: (n.addedSugarPerServing || 0) === 0, why: `${r1(n.addedSugarPerServing || 0)} g added sugar per serving from sweeteners`, phrase: /\bno added sugar\b/i },
    { re: /^sugar[- ]?free$/, ok: complete('sugar') && p.sugar < 0.5, why: `${r1(p.sugar)} g sugar per serving`, phrase: /\bsugar[- ]free\b/i },
    { re: /^high[- ]?protein$|^protein[- ]rich$/, ok: p.protein >= 20, why: `${r1(p.protein)} g protein per serving (needs 20 g or more)`, phrase: /\b(high[- ]protein|protein[- ](rich|packed))\b/i },
    { re: /^high[- ]?fib(er|re)$|^fib(er|re)[- ]rich$/, ok: complete('fiber') && p.fiber >= 5, why: `${r1(p.fiber)} g fibre per serving (needs 5 g or more)`, phrase: /\b(high[- ]fib(er|re)|fib(er|re)[- ](rich|packed))\b/i },
    { re: /^low[- ]?carb$/, ok: p.carbs <= 20, why: `${r1(p.carbs)} g carbohydrate per serving (needs 20 g or less)`, phrase: /\blow[- ]carb\b/i },
    { re: /^low[- ]?(calorie|cal)s?$/, ok: per100(p.kcal) <= 120, why: `${Math.round(per100(p.kcal))} kcal per 100 g (needs 120 or less)`, phrase: /\blow[- ]cal(orie)?s?\b/i },
  ];
};

/** Removes unsupported claims and checks nutrient claims. Mutates recipe.details / text fields. */
export const applyHealthLanguage = (recipe, ctx, nutrition, { mode = 'generate' } = {}) => {
  const details = (recipe.details = recipe.details || {});
  const rules = nutrition?.perServing && nutrition.status !== 'insufficient' ? nutrientRules(nutrition) : [];
  const falseClaim = (text) => rules.find((r) => !r.ok && r.phrase.test(text));

  const cleanProse = (holder, field, label) => {
    if (!holder[field]) return;
    const kept = [];
    for (const s of sentences(holder[field])) {
      const rule = claimProblem(s);
      const nut = falseClaim(s);
      if (rule) ctx.correct('health-claims', `Removed from ${label} (${rule.why}): "${s.trim()}"`);
      else if (nut) ctx.correct('health-claims', `Removed from ${label} (calculated ${nut.why}): "${s.trim()}"`);
      else kept.push(s);
    }
    holder[field] = kept.join('').trim();
  };
  cleanProse(recipe, 'description', 'the description');
  cleanProse(recipe, 'healthier_explanation', '"Why it\'s healthier"');
  cleanProse(details, 'subtitle', 'the subtitle');
  cleanProse(details, 'proteinBoost', 'the protein boost');
  for (const field of ['healthBenefits', 'chefTips', 'servingSuggestions', 'variations']) {
    if (!Array.isArray(details[field])) continue;
    details[field] = details[field].filter((item) => {
      const rule = claimProblem(item);
      const nut = falseClaim(item);
      if (rule || nut) ctx.correct('health-claims', `Removed from ${field} (${rule ? rule.why : `calculated ${nut.why}`}): "${item}"`);
      return !rule && !nut;
    });
  }

  // Nutrient tags must match the calculation; unverifiable ones are dropped.
  if (Array.isArray(details.dietaryTags)) {
    details.dietaryTags = details.dietaryTags.filter((tag) => {
      const t = String(tag).toLowerCase().replace(/[‐‑‒−]/g, '-').trim();
      const claim = claimProblem(tag) || (/heart|immun|detox|anti[- ]?inflam|superfood|weight[- ]loss|diabet/i.test(t) ? { why: 'a health claim, not a verifiable dietary label' } : null);
      if (claim) {
        ctx.correct('health-claims', `Removed the "${tag}" label (${claim.why}).`);
        return false;
      }
      const rule = nutrientRules(nutrition?.perServing ? nutrition : { perServing: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }, gramsPerServing: 0, incompleteNutrients: {} })
        .find((r) => r.re.test(t));
      if (!rule) return true;
      if (!rules.length) {
        ctx.correct('nutrition-tags', `Removed the "${tag}" label: nutrition could not be calculated reliably enough to verify it.`);
        return false;
      }
      const live = rules.find((r) => r.re.test(t));
      if (!live) return true;
      if (live.ok) return true;
      ctx.correct('nutrition-tags', `Removed the "${tag}" label: calculated ${live.why}.`);
      return false;
    });
  }

  if (!String(recipe.healthier_explanation || '').trim()) {
    const msg = '"Why it\'s healthier" is empty or only contained unsupported claims; it must describe the concrete ingredient and method changes.';
    if (mode === 'generate') ctx.hard('health-claims', msg);
    else ctx.warn('health-claims', msg);
  }
};

/**
 * Quantified ingredient swaps. For each swap the model describes
 * ({ original, replacement, quantity, unit }), the same amount of both foods is
 * looked up in the database and the difference per serving is calculated.
 * Swaps that can't be looked up are kept as text, marked unquantified.
 */
export const quantifySwaps = (recipe, ctx) => {
  const details = (recipe.details = recipe.details || {});
  const servings = Number(recipe.servings) || 1;
  const swaps = Array.isArray(details.healthSwaps) ? details.healthSwaps : [];
  const out = [];
  for (const swap of swaps) {
    if (!swap || !swap.original || !swap.replacement) continue;
    const a = matchIngredient(swap.original);
    const b = matchIngredient(swap.replacement);
    const used = (recipe.ingredients || []).find((i) => i.ingredientId && b.ingredient && i.ingredientId === b.ingredient.id);
    const qty = Number(swap.quantity ?? used?.quantity);
    const unit = swap.unit ?? used?.unit ?? 'g';
    const entry = { original: swap.original, replacement: swap.replacement, reason: swap.reason || '', quantified: false };
    if (!used && b.status === 'matched') {
      ctx.warn('health-claims', `The swap "${swap.original} → ${swap.replacement}" is described, but ${swap.replacement} is not in the final ingredient list.`);
    }
    if (a.status === 'matched' && b.status === 'matched' && Number.isFinite(qty) && qty > 0) {
      const ga = toGrams(a.ingredient, qty, unit).grams;
      const gb = toGrams(b.ingredient, qty, unit).grams;
      if (ga && gb) {
        const delta = {};
        for (const k of ['kcal', 'fat', 'satFat', 'sodium', 'sugar', 'protein', 'fiber']) {
          const va = a.ingredient.per100g?.[k];
          const vb = b.ingredient.per100g?.[k];
          if (va == null || vb == null) continue;
          delta[k] = ((gb / 100) * vb - (ga / 100) * va) / servings;
        }
        const parts = [];
        const say = (k, label, unitText) => {
          if (delta[k] == null || Math.abs(delta[k]) < (k === 'sodium' ? 20 : k === 'kcal' ? 10 : 0.5)) return;
          parts.push(`${delta[k] < 0 ? '−' : '+'}${r1(Math.abs(delta[k]))}${unitText} ${label}`);
        };
        say('kcal', 'kcal', ''); say('satFat', 'saturated fat', ' g'); say('fat', 'fat', ' g'); say('sodium', 'sodium', ' mg'); say('sugar', 'sugar', ' g'); say('protein', 'protein', ' g'); say('fiber', 'fibre', ' g');
        Object.assign(entry, {
          quantified: true,
          amount: `${qty} ${unit}`,
          perServing: Object.fromEntries(Object.entries(delta).map(([k, v]) => [k, r1(v)])),
          summary: parts.length
            ? `Using ${qty} ${unit} ${plain(swap.replacement)} instead of ${plain(swap.original)}: ${parts.join(', ')} per serving.`
            : `Using ${plain(swap.replacement)} instead of ${plain(swap.original)} makes little nutritional difference at this amount.`,
          sources: [a.ingredient.source?.fdcId, b.ingredient.source?.fdcId].filter(Boolean),
        });
      }
    }
    // "to lower saturated fat" must not describe a swap that adds it.
    if (entry.quantified) {
      const said = `${swap.reason || ''} ${recipe.healthier_explanation || ''}`.toLowerCase();
      const CLAIMS = [['satFat', /(lower|reduc|cut|less|decreas)\w*[^.]{0,40}saturated fat/, 0.5, 'g saturated fat'], ['sodium', /(lower|reduc|cut|less|decreas)\w*[^.]{0,40}(sodium|salt)/, 20, 'mg sodium'], ['kcal', /(lower|reduc|cut|fewer|less|decreas)\w*[^.]{0,40}calories/, 10, 'kcal'], ['sugar', /(lower|reduc|cut|less|decreas)\w*[^.]{0,40}sugar/, 0.5, 'g sugar']];
      const mentions = (re) => re.test(String(swap.reason || '').toLowerCase()) || new RegExp(`${plain(swap.replacement).split(' ')[0]}[^.]*${re.source}|${re.source}[^.]*${plain(swap.replacement).split(' ')[0]}`).test(said);
      for (const [k, re, min, unitText] of CLAIMS) {
        if (entry.perServing?.[k] != null && entry.perServing[k] > min && mentions(re)) {
          ctx.hard('health-claims', `The recipe says using ${plain(swap.replacement)} instead of ${plain(swap.original)} lowers ${unitText.split(' ').slice(1).join(' ')}, but at this amount it adds about ${entry.perServing[k]} ${unitText} per serving.`);
        }
      }
    }
    out.push(entry);
  }
  details.healthComparisons = out;
};
