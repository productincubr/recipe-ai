import logger from '../config/logger.js';
import dotenv from 'dotenv';
import { validateGeneratedRecipe, validateDishIdentityModule, validateDietModule } from './recipeValidator.js';
import { understandRecipe } from './recipeUnderstanding.js';
import { retrieveEvidence } from './evidenceRetrieval.js';
import { planOptimizations } from './optimizationPlanner.js';
import { buildRecipeBlueprint } from './recipeArchitect.js';
import { reviewRecipeSteps } from './recipeReviewer.js';

dotenv.config();

const HEALTH_NOTE = "Health Note: These recipes are intended for general wellness and educational purposes. They are not medical advice. If you have a medical condition, are pregnant, or have significant dietary restrictions, consult a qualified healthcare professional before making major dietary changes.";

const MAX_ATTEMPTS = 3;
const MIN_INGREDIENTS = 6;
const MIN_STEPS = 3;
const MIN_TOTAL_INSTRUCTIONS = 8;
const MIN_INSTRUCTIONS_PER_STEP = 1;
const MAX_UNUSED_INGREDIENTS = 2;

const MIN_CALORIES = 80;
const MAX_CALORIES = 1500;

const PLACEHOLDER_PATTERNS = [
  /protein (source|of choice)/i,
  /high-protein (paneer, tofu|source)/i,
  /complex carbs?/i,
  /(mixed|seasonal) (fresh )?(seasonal )?vegetables/i,
  /\bof (your )?choice\b/i,
  /^spices$/i,
  /^seasoning$/i
];
const VAGUE_QUANTITY = /^(some|a few|as needed|as required|handful)$/i;

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
const findCompletenessProblems = (recipe, recipeUnderstanding) => {
  const problems = [];
  const { ingredients, steps } = recipe;

  const requiredText = ['dish_name', 'description', 'healthier_explanation', 'category', 'cuisine', 'diet_type', 'difficulty'];
  const missingFields = requiredText.filter(f => typeof recipe[f] !== 'string' || !recipe[f].trim());
  if (!Number(recipe.servings)) missingFields.push('servings');
  if (missingFields.length > 0) {
    problems.push(`Missing required fields: ${missingFields.join(', ')}. Fill each one for THIS dish.`);
  }
  if (recipe.healthier_explanation && recipe.healthier_explanation.trim() === recipe.description.trim()) {
    problems.push('"healthier_explanation" repeats the description; explain the specific ingredient and method changes made in this recipe.');
  }

  if (ingredients.length < MIN_INGREDIENTS) {
    problems.push(`Only ${ingredients.length} ingredients listed; list every ingredient including spices, oil, salt and garnish.`);
  }
  const missingQty = ingredients.filter(i => !i.qty || VAGUE_QUANTITY.test(i.qty.trim())).map(i => i.name);
  if (missingQty.length > 0) {
    problems.push(`Missing or vague quantities for: ${missingQty.join(', ')}.`);
  }
  const placeholders = ingredients.filter(i => PLACEHOLDER_PATTERNS.some(p => p.test(i.name))).map(i => i.name);
  if (placeholders.length > 0) {
    problems.push(`Replace generic placeholder ingredients with the real ones this dish uses: ${placeholders.join(', ')}.`);
  }
  const totalInstructions = steps.reduce((sum, s) => sum + s.instructions.length, 0);
  if (steps.length < MIN_STEPS || totalInstructions < MIN_TOTAL_INSTRUCTIONS) {
    problems.push(`The method is too short (${steps.length} steps, ${totalInstructions} instructions); write every step from prep to serving with full detail.`);
  }
  const thinSteps = steps.filter(s => s.instructions.length < MIN_INSTRUCTIONS_PER_STEP).map(s => s.title);
  if (thinSteps.length > 0) {
    problems.push(`These steps have no instructions: ${thinSteps.join(', ')}.`);
  }
  const text = stepsText(steps);
  const unused = ingredients.filter(i => !isIngredientUsed(i.name, text)).map(i => i.name);
  if (unused.length > MAX_UNUSED_INGREDIENTS) {
    problems.push(`These ingredients are listed but never used in the method: ${unused.join(', ')}.`);
  }
  const calories = Number(recipe.calories);
  if (!calories || calories < MIN_CALORIES || calories > MAX_CALORIES) {
    problems.push(`Calories per serving (${recipe.calories}) are missing or unrealistic; recalculate from the quantities.`);
  }

  // Ingredients only: steps may mention optional sides ("serve with roti") that aren't part of the dish.
  const tags = recipe.details.dietaryTags.map(t => t.toLowerCase().replace(/-/g, ' '));
  for (const diet of ['Vegan', 'Vegetarian', 'Gluten Free', 'Dairy Free']) {
    if (!tags.includes(diet.toLowerCase())) continue;
    const dietCheck = validateDietModule({ ingredients, steps: [] }, diet);
    if (!dietCheck.isValid) {
      problems.push(`Dietary tag "${diet}" is wrong: ${dietCheck.errors.join('; ')}. Fix the tag or the ingredients.`);
    }
  }
  const dietType = (recipe.diet_type || '').toLowerCase();
  const claimedDiet = /vegan/.test(dietType) ? 'Vegan' : /^vegetarian|lacto|ovo/.test(dietType) ? 'Vegetarian' : null;
  if (claimedDiet) {
    const dietCheck = validateDietModule({ ingredients, steps: [] }, claimedDiet);
    if (!dietCheck.isValid) {
      problems.push(`diet_type "${recipe.diet_type}" contradicts the ingredients: ${dietCheck.errors.join('; ')}.`);
    }
  }

  const primary = recipeUnderstanding?.primaryIngredients || [];
  const identity = validateDishIdentityModule(recipe, primary, recipe.optimization_plan);
  if (primary.length > 0 && identity.missingCount > Math.floor(primary.length / 2)) {
    problems.push(`The recipe no longer resembles "${recipe.dish_name}": most of its defining ingredients (${primary.join(', ')}) are missing.`);
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

const stringList = (value) =>
  (Array.isArray(value) ? value : [])
    .filter(v => typeof v === 'string' && v.trim())
    .map(v => v.trim());

const buildDetails = (bp) => ({
  subtitle: bp.subtitle || '',
  prepTime: bp.prepTime || '',
  cookTime: bp.cookTime || '',
  totalTime: bp.totalTime || '',
  spiceLevel: bp.spiceLevel || '',
  nutrition: {
    carbohydrates: bp.carbohydrates || '',
    sugar: bp.sugar || ''
  },
  equipment: stringList(bp.equipment),
  preparationNotes: stringList(bp.preparationNotes),
  chefTips: stringList(bp.chefTips),
  substitutions: (Array.isArray(bp.substitutions) ? bp.substitutions : [])
    .filter(s => s && s.ingredient && s.substitute)
    .map(s => ({ ingredient: s.ingredient, substitute: s.substitute, note: s.note || '' })),
  variations: stringList(bp.variations),
  servingSuggestions: stringList(bp.servingSuggestions),
  storageInstructions: stringList(bp.storageInstructions),
  reheatingInstructions: stringList(bp.reheatingInstructions),
  allergens: stringList(bp.allergens),
  dietaryTags: stringList(bp.dietaryTags),
  healthBenefits: stringList(bp.healthBenefits),
  proteinBoost: bp.proteinBoost || ''
});

// Every field comes from this one model response; nothing is filled from templates
// or other recipes, so missing fields are caught by findCompletenessProblems instead.
const toDraftRecipe = (bp, goals, optimizationPlan) => {
  return {
    dish_name: (bp.dish_name || '').replace(/^(healthy\s+)+/i, 'Healthy '),
    category: bp.category || '',
    description: bp.description || '',
    calories: bp.calories,
    protein: bp.protein,
    fiber: bp.fiber,
    fats: bp.fats,
    sodium: bp.sodium,
    cooking_time: bp.totalTime || bp.cookTime || '',
    servings: bp.servings,
    difficulty: bp.difficulty || '',
    cuisine: bp.cuisine || '',
    diet_type: bp.diet_type || '',
    meal_type: bp.meal_type || '',
    best_for: goals.join(', '),
    ingredients: (bp.ingredients || [])
      .filter(ing => ing && ing.name)
      .map(ing => ({ name: ing.name, qty: ing.quantity || ing.qty || '', prep: ing.prep || '', group: ing.group || '' })),
    steps: normalizeSteps(bp.steps),
    optimization_plan: optimizationPlan,
    healthier_explanation: bp.healthier_explanation || '',
    details: buildDetails(bp)
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

      const draftRecipe = toDraftRecipe(blueprint, goals, optimizationPlan);
      draftRecipe.token_metrics = { model_used: blueprint.token_metrics?.model_used };

      const completenessProblems = findCompletenessProblems(draftRecipe, recipeUnderstanding);
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
