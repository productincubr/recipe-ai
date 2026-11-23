// Internal recipe quality score, computed only from validation results.
//
//   Authenticity 20% · Ingredient accuracy 20% · Instruction quality 15% ·
//   Nutrition reliability 15% · Timing accuracy 10% · Diet & allergens 10% ·
//   Completeness & usability 10%
//
// Any hard validation failure makes the recipe fail the quality gate and caps
// the score at 5.9/10, however complete the recipe looks. Section count only
// feeds the 10% completeness category.

const WEIGHTS = {
  authenticity: 20,
  ingredientAccuracy: 20,
  instructionQuality: 15,
  nutritionReliability: 15,
  timingAccuracy: 10,
  dietAllergen: 10,
  completeness: 10,
};
export const QUALITY_LABELS = {
  authenticity: 'Recipe authenticity',
  ingredientAccuracy: 'Ingredient accuracy',
  instructionQuality: 'Instruction quality',
  nutritionReliability: 'Nutrition reliability',
  timingAccuracy: 'Timing accuracy',
  dietAllergen: 'Diet & allergen validation',
  completeness: 'Completeness & usability',
};
const RULE_CATEGORY = {
  ingredients: 'ingredientAccuracy', quantities: 'ingredientAccuracy', servings: 'ingredientAccuracy',
  title: 'authenticity', authenticity: 'authenticity',
  instructions: 'instructionQuality', 'food-safety': 'instructionQuality',
  nutrition: 'nutritionReliability', 'nutrition-tags': 'nutritionReliability', 'health-claims': 'nutritionReliability',
  timing: 'timingAccuracy',
  diet: 'dietAllergen', allergens: 'dietAllergen', substitutions: 'dietAllergen',
  completeness: 'completeness', image: 'completeness',
};
const PASS_SCORE = 8.0;

const clamp = (v) => Math.max(0, Math.min(100, v));

/**
 * @param {object} recipe — validated recipe
 * @param {object} report — { issues: [{rule, severity, message}], corrections: [{rule, message}] }
 * @param {object} facts — { nutrition, authenticity: {score, notes}, structured }
 */
export const scoreRecipe = (recipe, report, facts = {}) => {
  const cat = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, { score: 100, notes: [] }]));
  const hit = (k, points, note) => {
    cat[k].score -= points;
    if (note) cat[k].notes.push(note);
  };

  for (const issue of report.issues) {
    const k = RULE_CATEGORY[issue.rule] || 'completeness';
    hit(k, issue.severity === 'hard' ? 45 : 12, `${issue.severity === 'hard' ? 'Failed' : 'Warning'}: ${issue.message}`);
  }
  // A correction means the generated recipe was wrong in that respect, even
  // though the published version was fixed.
  for (const c of report.corrections) {
    const k = RULE_CATEGORY[c.rule] || 'completeness';
    hit(k, c.rule === 'health-claims' ? 3 : 6, `Corrected: ${c.message}`);
  }

  // Authenticity: defining ingredients and flavourings of the requested dish.
  if (facts.authenticity) {
    cat.authenticity.score = Math.min(cat.authenticity.score, facts.authenticity.score);
    cat.authenticity.notes.push(...facts.authenticity.notes);
  } else {
    cat.authenticity.score = Math.min(cat.authenticity.score, 70);
    cat.authenticity.notes.push('No dish profile was recorded for this recipe, so authenticity could only be checked from its title.');
  }

  // Nutrition reliability: how much of the recipe has verified data.
  const n = facts.nutrition;
  if (!n || !n.perServing) hit('nutritionReliability', 80, 'Nutrition could not be calculated.');
  else {
    if (n.status === 'insufficient') hit('nutritionReliability', 60, `Only ${Math.round(n.coverage * 100)}% of the recipe weight has nutrition data.`);
    else if (n.status === 'partial') hit('nutritionReliability', 25, `Nutrition excludes ${n.unknown.map((u) => u.name).join(', ')}.`);
    if (n.proxies.length) hit('nutritionReliability', 4 * n.proxies.length, `Approximated: ${n.proxies.join('; ')}.`);
    if (n.estimatedConversions.length) hit('nutritionReliability', 5 * n.estimatedConversions.length, `Weights estimated from typical density: ${n.estimatedConversions.join(', ')}.`);
    const incomplete = Object.keys(n.incompleteNutrients || {}).length;
    if (incomplete) hit('nutritionReliability', 2 * incomplete, `${incomplete} nutrient total(s) miss at least one ingredient's value.`);
  }

  // Instruction quality: what each step tells the cook.
  const steps = (recipe.steps || []).filter((s) => typeof s === 'object');
  if (steps.length) {
    const heatSteps = steps.filter((s) => s.heatLevel && !/^none$/i.test(s.heatLevel));
    const share = (pred, arr = steps) => (arr.length ? arr.filter(pred).length / arr.length : 1);
    const cues = share((s) => (s.visualCues || []).length > 0 || /\buntil\b/i.test((s.instructions || []).join(' ')), heatSteps.length ? heatSteps : steps);
    const timed = share((s) => (s.instructions || []).some((t) => /\d+\s*(min|sec|hour|hr)/i.test(t)) || Number(s.activeMinutes) + Number(s.passiveMinutes) > 0);
    const structured = share((s) => Array.isArray(s.ingredientsUsed));
    if (cues < 0.8) hit('instructionQuality', Math.round((0.8 - cues) * 50), `${Math.round(cues * 100)}% of cooking steps describe what the food should look like when done.`);
    if (timed < 0.9) hit('instructionQuality', Math.round((0.9 - timed) * 40), 'Some steps have no duration.');
    if (structured < 1) hit('instructionQuality', 20, 'Steps do not record which ingredient amounts they use.');
    if (steps.some((s) => (s.instructions || []).length === 0)) hit('instructionQuality', 30, 'A step has no instructions.');
  } else hit('instructionQuality', 100, 'No method.');

  // Completeness: fields a cook expects. Capped influence (10%).
  const d = recipe.details || {};
  const fields = [
    ['description', recipe.description], ['cuisine', recipe.cuisine], ['category', recipe.category], ['meal type', recipe.meal_type],
    ['difficulty', recipe.difficulty], ['spice level', d.spiceLevel], ['equipment', d.equipment?.length], ['substitutions', d.substitutions?.length],
    ['variations', d.variations?.length], ['serving suggestions', d.servingSuggestions?.length], ['storage', d.storageInstructions?.length],
    ['reheating', d.reheatingInstructions?.length], ['chef tips', d.chefTips?.length], ['things to avoid', d.thingsToAvoid?.length],
    ['why it is healthier', recipe.healthier_explanation], ['visual description', d.visualDescription],
  ];
  const missing = fields.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) hit('completeness', missing.length * 6, `Missing: ${missing.join(', ')}.`);

  const categories = Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, {
    label: QUALITY_LABELS[k],
    weight: WEIGHTS[k],
    score: Math.round(clamp(v.score)),
    notes: v.notes.slice(0, 8),
  }]));
  const weighted = Object.entries(categories).reduce((s, [k, v]) => s + (v.score * WEIGHTS[k]) / 100, 0);
  const hardFailures = report.issues.filter((i) => i.severity === 'hard').map((i) => i.message);
  let score = Math.round(weighted) / 10; // 0–10
  if (hardFailures.length) score = Math.min(score, 5.9);
  const passed = hardFailures.length === 0 && score >= PASS_SCORE;
  return {
    version: 1,
    score,
    outOf: 10,
    passed,
    passMark: PASS_SCORE,
    status: hardFailures.length ? 'failed' : passed ? 'passed' : 'below-threshold',
    hardFailures,
    categories,
    scoredAt: new Date().toISOString(),
  };
};
