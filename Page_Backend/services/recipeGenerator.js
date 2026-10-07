import logger from '../config/logger.js';
import dotenv from 'dotenv';
import { validateGeneratedRecipe } from './recipeValidator.js';
import { understandRecipe } from './recipeUnderstanding.js';
import { retrieveEvidence } from './evidenceRetrieval.js';
import { planOptimizations } from './optimizationPlanner.js';
import { buildRecipeBlueprint } from './recipeArchitect.js';
import { reviewRecipeSteps } from './recipeReviewer.js';

dotenv.config();

const HEALTH_NOTE = "Health Note: These recipes are intended for general wellness and educational purposes. They are not medical advice. If you have a medical condition, are pregnant, or have significant dietary restrictions, consult a qualified healthcare professional before making major dietary changes.";

const MAX_ATTEMPTS = 3;
const MIN_INGREDIENTS = 6;
const MIN_STEPS = 5;
const MIN_INSTRUCTIONS_PER_STEP = 2;
const MAX_UNUSED_INGREDIENTS = 2;

const NAME_FILLER_WORDS = new Set(['fresh', 'thick', 'low', 'fat', 'low-fat', 'small', 'medium', 'large', 'chopped', 'powder', 'whole', 'ground', 'optional', 'with']);

const stepsText = (steps) =>
  steps
    .map(s => `${s.title || ''} ${(s.instructions || []).join(' ')}`)
    .join(' ')
    .toLowerCase();

const isIngredientUsed = (ingredientName, text) => {
  const tokens = ingredientName
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(t => t.length > 2 && !NAME_FILLER_WORDS.has(t));
  if (tokens.length === 0) return true;
  return tokens.some(t => text.includes(t) || text.includes(t.replace(/s$/, '')));
};

/**
 * Returns a list of human-readable problems that make the recipe incomplete.
 * The list is fed back to the model on the next attempt.
 */
const findCompletenessProblems = (recipe) => {
  const problems = [];
  const { ingredients, steps } = recipe;

  if (ingredients.length < MIN_INGREDIENTS) {
    problems.push(`Only ${ingredients.length} ingredients listed; list every ingredient including spices, oil, salt and garnish.`);
  }
  const missingQty = ingredients.filter(i => !i.qty).map(i => i.name);
  if (missingQty.length > 0) {
    problems.push(`Missing quantities for: ${missingQty.join(', ')}.`);
  }
  if (steps.length < MIN_STEPS) {
    problems.push(`Only ${steps.length} steps; write 6-10 steps covering prep to serving.`);
  }
  const thinSteps = steps.filter(s => s.instructions.length < MIN_INSTRUCTIONS_PER_STEP).map(s => s.title);
  if (thinSteps.length > 0) {
    problems.push(`These steps need 2-4 detailed instructions each: ${thinSteps.join(', ')}.`);
  }
  const text = stepsText(steps);
  const unused = ingredients.filter(i => !isIngredientUsed(i.name, text)).map(i => i.name);
  if (unused.length > MAX_UNUSED_INGREDIENTS) {
    problems.push(`These ingredients are listed but never used in the method: ${unused.join(', ')}.`);
  }

  return problems;
};

const normalizeSteps = (steps) =>
  (Array.isArray(steps) ? steps : [])
    .filter(s => s && typeof s === 'object')
    .map((s, idx) => ({
      title: s.title || `Step ${idx + 1}`,
      time: s.time || '',
      heatLevel: s.heatLevel || '',
      instructions: (Array.isArray(s.instructions) ? s.instructions : [s.instructions])
        .filter(i => typeof i === 'string' && i.trim())
        .map(i => i.trim()),
      chefTip: s.chefTip || '',
      commonMistakes: s.commonMistakes || ''
    }));

const buildHealthierExplanation = (bp) =>
  [
    bp.healthier_explanation,
    bp.proteinBoost ? `Protein boost: ${bp.proteinBoost}` : '',
    bp.servingSuggestion ? `Serve with: ${bp.servingSuggestion}` : ''
  ]
    .filter(Boolean)
    .join('\n\n');

const toDraftRecipe = (bp, dishName, goals, recipeUnderstanding, optimizationPlan) => {
  const rawDishName = bp.dish_name || `Healthy ${dishName}`;
  return {
    dish_name: rawDishName.replace(/^(healthy\s+)+/i, 'Healthy '),
    category: bp.category || 'Nutritious Twist',
    description: bp.description || '',
    calories: bp.calories,
    protein: bp.protein,
    fiber: bp.fiber,
    fats: bp.fats,
    sodium: bp.sodium,
    cooking_time: bp.totalTime || bp.cookTime || '',
    servings: bp.servings || 2,
    difficulty: bp.difficulty || 'Easy',
    cuisine: bp.cuisine || recipeUnderstanding.cuisine,
    diet_type: bp.diet_type || '',
    meal_type: bp.meal_type || '',
    best_for: goals.join(', '),
    ingredients: (bp.ingredients || [])
      .filter(ing => ing && ing.name)
      .map(ing => ({ name: ing.name, qty: ing.quantity || ing.qty || '', prep: ing.prep || '' })),
    steps: normalizeSteps(bp.steps),
    optimization_plan: optimizationPlan,
    healthier_explanation: buildHealthierExplanation(bp)
  };
};

/**
 * Generates a healthy recipe with Groq in 3 phases:
 * understanding/evidence/optimization, full-recipe generation, and validation/review.
 * Retries with targeted feedback until the recipe is complete and safe.
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

  let feedback = '';
  let best = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`Phase 2: Generating full recipe (attempt ${attempt}/${MAX_ATTEMPTS})`);
      const blueprint = await buildRecipeBlueprint(dishName, inputs, optimizationPlan, evidence.summary, recipeUnderstanding, feedback);
      if (!blueprint) {
        logger.warn(`Attempt ${attempt}: recipe model returned nothing.`);
        continue;
      }
      addTokens(blueprint.token_metrics);

      const draftRecipe = toDraftRecipe(blueprint, dishName, goals, recipeUnderstanding, optimizationPlan);
      draftRecipe.token_metrics = { model_used: blueprint.token_metrics?.model_used };

      const completenessProblems = findCompletenessProblems(draftRecipe);
      if (completenessProblems.length > 0) {
        logger.warn(`Attempt ${attempt}: recipe incomplete: ${completenessProblems.join(' | ')}`);
        feedback = completenessProblems.join(' ');
        continue;
      }

      logger.info('Phase 3: Reviewing recipe steps and running rule-based validators');
      const reviewerFeedback = await reviewRecipeSteps(dishName, draftRecipe.steps, inputs, optimizationPlan, evidence.summary);
      addTokens(reviewerFeedback?.token_metrics);

      const validatedResult = validateGeneratedRecipe(draftRecipe, inputs, evidence.summary, recipeUnderstanding);
      validatedResult.confidence = Math.round(validatedResult.confidence * 0.7 + (reviewerFeedback.safetyConfidence ?? 90) * 0.3);
      validatedResult.reviewer_problems = reviewerFeedback.problems || [];

      if (!validatedResult.isValid) {
        logger.warn(`Attempt ${attempt}: failed safety checks: ${validatedResult.errors.join(', ')}`);
        feedback = `Safety violations: ${validatedResult.errors.join('; ')}.`;
        continue;
      }

      if (!best || validatedResult.confidence > best.safety_review.confidence) {
        best = { recipe: draftRecipe, safety_review: validatedResult };
      }
      if (validatedResult.confidence >= 80) {
        logger.info(`Recipe validated on attempt ${attempt}. Confidence: ${validatedResult.confidence}%`);
        break;
      }
      feedback = (validatedResult.warnings || []).join(' ');
    } catch (error) {
      logger.error(`Attempt ${attempt} failed in recipe pipeline: ${error.message}`);
    }
  }

  if (!best) {
    logger.error(`Recipe generation failed for "${dishName}" after ${MAX_ATTEMPTS} attempts.`);
    return {
      success: false,
      error: 'We could not generate a complete recipe right now. Please try again in a moment.'
    };
  }

  best.recipe.token_metrics = {
    prompt_tokens: totalPromptTokens,
    completion_tokens: totalCompletionTokens,
    total_tokens: totalPromptTokens + totalCompletionTokens,
    model_used: best.recipe.token_metrics?.model_used
  };

  return {
    success: true,
    recipe: best.recipe,
    safety_review: best.safety_review,
    health_note: HEALTH_NOTE
  };
};
