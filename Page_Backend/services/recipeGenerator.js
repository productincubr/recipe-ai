import logger from '../config/logger.js';
import dotenv from 'dotenv';
import { validateGeneratedRecipe } from './recipeValidator.js';
import { understandRecipe } from './recipeUnderstanding.js';
import { retrieveEvidence } from './evidenceRetrieval.js';
import { planOptimizations } from './optimizationPlanner.js';
import { buildRecipeBlueprint, PROSE_FIELDS } from './recipeArchitect.js';
import { reviewRecipeSteps } from './recipeReviewer.js';
import { validateAndCorrectRecipe } from './recipeConsistency.js';

dotenv.config();

const HEALTH_NOTE = "Health Note: These recipes are intended for general wellness and educational purposes. They are not medical advice. If you have a medical condition, are pregnant, or have significant dietary restrictions, consult a qualified healthcare professional before making major dietary changes.";

const MAX_ATTEMPTS = 3;
const MIN_INGREDIENTS = 5;
const MAX_FEEDBACK_ITEMS = 14;

const PLACEHOLDER_PATTERNS = [
  /protein (source|of choice)/i,
  /high-protein (paneer, tofu|source)/i,
  /complex carbs?/i,
  /(mixed|seasonal) (fresh )?(seasonal )?vegetables/i,
  /\bof (your )?choice\b/i,
  /^spices$/i,
  /^seasonings?$/i,
  /^healthy (oil|fat)s?$/i,
];

/**
 * Problems the deterministic validator doesn't cover: missing top-level
 * fields and placeholder ingredients. Fed back to the model with the
 * validator's hard issues.
 */
const findCompletenessProblems = (recipe) => {
  const problems = [];
  const requiredText = ['dish_name', 'description', 'healthier_explanation', 'category', 'cuisine', 'difficulty'];
  const missing = requiredText.filter((f) => typeof recipe[f] !== 'string' || !recipe[f].trim());
  if (missing.length) problems.push(`Missing required fields: ${missing.join(', ')}.`);
  if (recipe.healthier_explanation && recipe.description && recipe.healthier_explanation.trim() === recipe.description.trim()) {
    problems.push('"healthier_explanation" repeats the description; explain the specific ingredient and method changes.');
  }
  if ((recipe.ingredients || []).length < MIN_INGREDIENTS) {
    problems.push(`Only ${(recipe.ingredients || []).length} ingredients listed; list every ingredient including spices, oil, salt and garnish.`);
  }
  const placeholders = (recipe.ingredients || []).filter((i) => PLACEHOLDER_PATTERNS.some((p) => p.test(i.name))).map((i) => i.name);
  if (placeholders.length) problems.push(`Replace generic placeholder ingredients with the real ones this dish uses: ${placeholders.join(', ')}.`);
  const noQty = (recipe.ingredients || []).filter((i) => i.quantity == null || i.quantity === '').map((i) => i.name);
  if (noQty.length) problems.push(`Give a numeric quantity for: ${noQty.join(', ')}.`);
  return problems;
};

const stringList = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim());

const toSteps = (steps) =>
  (Array.isArray(steps) ? steps : [])
    .filter((s) => s && typeof s === 'object')
    .map((s, idx) => ({
      stepNumber: Number(s.stepNumber) || idx + 1,
      title: s.title || `Step ${idx + 1}`,
      technique: s.technique || '',
      heatLevel: s.heatLevel || 'None',
      temperature: s.temperature || '',
      activeMinutes: Number.isFinite(Number(s.activeMinutes)) ? Number(s.activeMinutes) : null,
      passiveMinutes: Number.isFinite(Number(s.passiveMinutes)) ? Number(s.passiveMinutes) : 0,
      passiveLabel: s.passiveLabel || '',
      dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.map(Number).filter(Number.isFinite) : idx > 0 ? [idx] : [],
      optional: Boolean(s.optional),
      produces: s.produces || '',
      ingredientsUsed: (Array.isArray(s.ingredientsUsed) ? s.ingredientsUsed : [])
        .filter((u) => u && u.ref)
        .map((u) => ({ ref: String(u.ref), quantity: Number(u.quantity), unit: String(u.unit || '') })),
      instructions: (Array.isArray(s.instructions) ? s.instructions : [s.instructions])
        .filter((i) => typeof i === 'string' && i.trim())
        .map((i) => i.trim()),
      visualCues: stringList(s.visualCues),
      chefTip: s.chefTip || '',
      commonMistakes: s.commonMistakes || '',
    }));

// Every field comes from this one model response. Nutrition, times, diet
// labels and allergens are then calculated by the validator, never taken
// from the model.
const toDraftRecipe = (bp, goals, optimizationPlan) => ({
  dish_name: (bp.dish_name || '').replace(/^(healthy\s+)+/i, 'Healthy '),
  category: bp.category || '',
  description: bp.description || '',
  servings: Number(bp.servings) || bp.servings,
  difficulty: bp.difficulty || '',
  cuisine: bp.cuisine || '',
  diet_type: bp.diet_type || '',
  meal_type: bp.meal_type || '',
  best_for: goals.join(', '),
  ingredients: (bp.ingredients || [])
    .filter((ing) => ing && ing.name)
    .map((ing) => ({
      ref: ing.ref || '',
      name: String(ing.name).trim(),
      quantity: ing.quantity === '' || ing.quantity == null ? null : Number(ing.quantity),
      unit: ing.unit || '',
      household: ing.household || '',
      prep: ing.prep || '',
      group: ing.group || '',
      optional: Boolean(ing.optional),
      toTaste: Boolean(ing.toTaste),
      ...(ing.eatenFraction != null ? { eatenFraction: Number(ing.eatenFraction), eatenFractionReason: ing.eatenFractionReason || '' } : {}),
    })),
  steps: toSteps(bp.steps),
  optimization_plan: optimizationPlan,
  healthier_explanation: bp.healthier_explanation || '',
  details: {
    subtitle: bp.subtitle || '',
    visualDescription: bp.visualDescription || '',
    spiceLevel: bp.spiceLevel || '',
    equipment: stringList(bp.equipment),
    preparationNotes: stringList(bp.preparationNotes),
    chefTips: stringList(bp.chefTips),
    thingsToAvoid: stringList(bp.thingsToAvoid),
    substitutions: (Array.isArray(bp.substitutions) ? bp.substitutions : [])
      .filter((s) => s && s.ingredient && s.substitute)
      .map((s) => ({ ingredient: s.ingredient, substitute: s.substitute, note: s.note || '' })),
    variations: stringList(bp.variations),
    servingSuggestions: stringList(bp.servingSuggestions),
    storageInstructions: stringList(bp.storageInstructions),
    reheatingInstructions: stringList(bp.reheatingInstructions),
    allergens: stringList(bp.allergens),
    dietaryTags: stringList(bp.dietaryTags),
    healthSwaps: (Array.isArray(bp.healthSwaps) ? bp.healthSwaps : []).filter((s) => s && s.original && s.replacement),
    healthBenefits: stringList(bp.healthBenefits),
    proteinBoost: bp.proteinBoost || '',
  },
});

/** Orders attempts: fewer hard failures first, then higher quality score. */
const better = (a, b) => !b || a.hard < b.hard || (a.hard === b.hard && a.quality.score > b.quality.score);

/**
 * Generates a healthy recipe with Groq in 3 phases:
 * understanding/evidence/optimization, full-recipe generation, and
 * deterministic validation + review. Retries with the validator's exact
 * findings until the recipe passes every hard check.
 */
export const generateHealthyRecipeText = async (inputs) => {
  const { dish: dishName, goals = [] } = inputs;

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  const addTokens = (usage) => {
    if (!usage) return;
    totalPromptTokens += usage.prompt_tokens || 0;
    totalCompletionTokens += usage.completion_tokens || 0;
  };

  logger.info(`Phase 1: Starting recipe understanding for: "${dishName}"`);
  const recipeUnderstanding = await understandRecipe(dishName);
  addTokens(recipeUnderstanding?.token_metrics);

  logger.info('Phase 1: Starting evidence retrieval for health profile');
  const evidence = await retrieveEvidence(inputs);

  logger.info('Phase 1: Planning recipe optimizations & ingredient swaps');
  const optimizationPlan = await planOptimizations(recipeUnderstanding, inputs, evidence.summary);
  addTokens(optimizationPlan?.token_metrics);

  // What the dish must contain to still be itself; stored with the recipe so
  // authenticity can be re-checked later.
  const dishProfile = {
    dish: dishName,
    cuisine: recipeUnderstanding?.cuisine || '',
    primaryIngredients: recipeUnderstanding?.primaryIngredients || [],
    signatureFlavorings: recipeUnderstanding?.signatureFlavorings || [],
    swaps: (optimizationPlan?.swaps || []).map((s) => ({ original: s.originalIngredient, replacement: s.substitutedWith, reason: s.reason })),
  };

  let feedback = '';
  let best = null;
  const attempts = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`Phase 2: Generating full recipe (attempt ${attempt}/${MAX_ATTEMPTS})`);
      let blueprint = await buildRecipeBlueprint(dishName, inputs, optimizationPlan, evidence.summary, recipeUnderstanding, feedback, best?.draft || null);
      if (!blueprint && best?.draft) {
        logger.warn(`Attempt ${attempt}: repair request failed; generating a fresh draft with the feedback instead.`);
        blueprint = await buildRecipeBlueprint(dishName, inputs, optimizationPlan, evidence.summary, recipeUnderstanding, feedback, null);
      } else if (blueprint && best?.draft) {
        // Fields left out of the repair prompt come back from the draft.
        for (const k of PROSE_FIELDS) if (blueprint[k] == null && best.draft[k] != null) blueprint[k] = best.draft[k];
        (blueprint.steps || []).forEach((s) => {
          const old = (best.draft.steps || []).find((o) => Number(o.stepNumber) === Number(s.stepNumber));
          if (old) {
            if (s.chefTip == null) s.chefTip = old.chefTip;
            if (s.commonMistakes == null) s.commonMistakes = old.commonMistakes;
          }
        });
      }
      if (!blueprint) {
        logger.warn(`Attempt ${attempt}: recipe model returned nothing.`);
        continue;
      }
      addTokens(blueprint.token_metrics);

      const { recipe: draft, report, quality } = validateAndCorrectRecipe(
        toDraftRecipe(blueprint, goals, optimizationPlan),
        { inputs, mode: 'generate', dishProfile }
      );
      draft.token_metrics = { model_used: blueprint.token_metrics?.model_used };

      const extra = findCompletenessProblems(draft);
      const safety = validateGeneratedRecipe(draft, inputs, evidence.summary, recipeUnderstanding);
      const hardIssues = [
        ...report.issues.filter((i) => i.severity === 'hard').map((i) => i.message),
        ...extra,
        ...(safety.isValid ? [] : safety.errors.map((e) => `Safety: ${e}`)),
      ];
      const { token_metrics: _tm, ...rawDraft } = blueprint;
      const candidate = { recipe: draft, draft: rawDraft, safety_review: safety, report, quality, hard: hardIssues.length, hardIssues };
      attempts.push({ attempt, hard: hardIssues.length, score: quality.score, corrections: report.corrections.length });
      logger.info(`Attempt ${attempt}: ${hardIssues.length} hard issue(s), quality ${quality.score}/10, ${report.corrections.length} correction(s).`);
      if (better(candidate, best)) best = candidate;

      if (hardIssues.length === 0) {
        logger.info('Phase 3: Reviewing recipe steps');
        const review = await reviewRecipeSteps(dishName, draft.steps, inputs, optimizationPlan, evidence.summary);
        addTokens(review?.token_metrics);
        safety.confidence = Math.round(safety.confidence * 0.7 + (review.safetyConfidence ?? 90) * 0.3);
        safety.reviewer_problems = review.problems || [];
        if (quality.passed) {
          logger.info(`Recipe passed validation on attempt ${attempt} with quality ${quality.score}/10.`);
          break;
        }
        // No hard failures but below the quality bar: ask for the weakest areas.
        const weak = Object.values(quality.categories).filter((c) => c.score < 80).flatMap((c) => c.notes.filter((n) => !n.startsWith('Corrected')).slice(0, 3));
        feedback = weak.slice(0, MAX_FEEDBACK_ITEMS).join(' ');
        if (!feedback) break;
        continue;
      }
      logger.warn(`Attempt ${attempt} failed validation: ${hardIssues.join(' | ')}`);
      feedback = best.hardIssues.slice(0, MAX_FEEDBACK_ITEMS).map((m, i) => `${i + 1}. ${m}`).join('\n');
    } catch (error) {
      logger.error(`Attempt ${attempt} failed in recipe pipeline: ${error.message}`);
    }
  }

  if (!best) {
    logger.error(`Recipe generation failed for "${dishName}" after ${MAX_ATTEMPTS} attempts.`);
    return { success: false, error: 'We could not generate a complete recipe right now. Please try again in a moment.' };
  }
  if (!best.safety_review.isValid) {
    logger.error(`Every attempt for "${dishName}" failed the safety checks: ${best.safety_review.errors.join('; ')}`);
    return { success: false, error: 'We could not generate a recipe that meets your allergy and diet requirements. Please adjust your selections and try again.', errors: best.safety_review.errors };
  }
  if (best.hard > 0) {
    logger.warn(`Recipe for "${dishName}" still has ${best.hard} unresolved hard issue(s) after ${attempts.length} attempt(s); returning it marked as not validated.`);
  }

  best.recipe.details.generation = { attempts, model: best.recipe.token_metrics?.model_used || null };
  best.recipe.token_metrics = {
    prompt_tokens: totalPromptTokens,
    completion_tokens: totalCompletionTokens,
    total_tokens: totalPromptTokens + totalCompletionTokens,
    model_used: best.recipe.token_metrics?.model_used,
  };

  return {
    success: true,
    recipe: best.recipe,
    safety_review: best.safety_review,
    quality: best.quality,
    health_note: HEALTH_NOTE,
  };
};
