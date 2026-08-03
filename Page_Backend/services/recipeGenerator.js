import logger from '../config/logger.js';
import dotenv from 'dotenv';
import { validateGeneratedRecipe } from './recipeValidator.js';
import { understandRecipe } from './recipeUnderstanding.js';
import { retrieveEvidence } from './evidenceRetrieval.js';
import { planOptimizations } from './optimizationPlanner.js';
import { buildRecipeBlueprint } from './recipeArchitect.js';
import { reviewRecipeSteps } from './recipeReviewer.js';

dotenv.config();

/**
 * Local fallback recipe generator (runs if Groq API is missing or fails).
 */
const getFallbackRecipe = (dishName, goals) => {
  const normalizedDish = dishName.trim().toLowerCase();

  const defaultRecipe = {
    dish_name: `Healthy ${dishName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
    category: 'Nutritious Twist',
    description: `A wholesome, calorie-conscious remake of traditional ${dishName}, optimized to fit your goals: ${goals.join(', ')}.`,
    calories: 380,
    protein: '22g',
    fiber: '8g',
    fats: '9g',
    sodium: '480mg',
    cooking_time: '30 mins',
    servings: 2,
    difficulty: 'Easy',
    cuisine: 'Healthy Cuisine',
    diet_type: 'Vegetarian',
    meal_type: 'Lunch, Dinner',
    best_for: goals.join(', ') || 'Healthy eating',
    ingredients: [
      { name: 'High-protein Paneer, Tofu, or Lentils', qty: '200g' },
      { name: 'Complex carbs (Quinoa, Brown Rice, or Oats)', qty: '1 cup' },
      { name: 'Mixed fresh seasonal vegetables', qty: '1.5 cups' },
      { name: 'Cold-pressed Olive or Avocado Oil', qty: '1 tbsp' },
      { name: 'Low sodium seasoning / herbs', qty: 'to taste' },
      { name: 'Garlic & Ginger paste', qty: '1 tsp' }
    ],
    steps: [
      {
        title: "Prepare Ingredients",
        time: "10 mins",
        heatLevel: "None",
        ingredients: [
          { name: "High-protein Paneer, Tofu, or Lentils", qty: "200g" }
        ],
        instructions: [
          "Clean and slice the protein source into bite-size cubes.",
          "Steam or lightly blanch the fresh seasonal vegetables and set aside."
        ],
        techniques: ["Prepping ingredients", "Blanching veggies"],
        visualCues: {
          time: "10 minutes",
          heat: "None",
          texture: "Firm cubes, vibrant vegetables",
          aroma: "Fresh and clean",
          goal: "Ready elements for fast cooking"
        },
        chefTip: "Keeping vegetable slices uniform ensures they cook evenly.",
        commonMistakes: "Do not over-boil the vegetables, which destroys water-soluble vitamins."
      },
      {
        title: "Cook Grains",
        time: "15 mins",
        heatLevel: "Medium",
        ingredients: [
          { name: "Complex carbs (Quinoa, Brown Rice, or Oats)", qty: "1 cup" }
        ],
        instructions: [
          "Rinse the grains under cold water to remove surface starches.",
          "Simmer in 2 cups of low-sodium broth or water for 15 minutes until fluffy."
        ],
        techniques: ["Simmering", "Fluffing grains"],
        visualCues: {
          time: "15 minutes",
          heat: "Medium",
          texture: "Light and fluffy grains",
          aroma: "Toasty and nutty",
          goal: "Cook grains as your base layer"
        },
        chefTip: "Let the grains stand covered for 5 minutes after cooking for maximum fluffiness.",
        commonMistakes: "Stirring the grains during cooking makes them mushy."
      },
      {
        title: "Combine and Finish",
        time: "5 mins",
        heatLevel: "Medium-Low",
        ingredients: [
          { name: "Cold-pressed Olive or Avocado Oil", qty: "1 tbsp" },
          { name: "Low sodium seasoning / herbs", qty: "to taste" }
        ],
        instructions: [
          "Heat cold-pressed oil in a sauté pan over medium-low heat.",
          "Toss the prepared protein cubes and blanched vegetables together, dusting with herbs and low-sodium seasoning."
        ],
        techniques: ["Sautéing", "Infusing herbs"],
        visualCues: {
          time: "5 minutes",
          heat: "Medium-Low",
          texture: "Lightly glazed and heated through",
          aroma: "Savory herbs and toasted oil",
          goal: "Assemble the balanced meal layers"
        },
        chefTip: "Serve hot over the warm whole grains.",
        commonMistakes: "Do not overheat cold-pressed oil, which breaks down healthy fats."
      }
    ],
    healthier_explanation: `We updated this recipe by replacing refined carbohydrates with high-fiber whole grains, cooking with cold-pressed oils instead of butter/ghee, lowering sodium levels, and maximizing fresh vegetables to increase density.`
  };
  return defaultRecipe;
};

/**
 * Dynamically generates a healthy recipe payload using Groq's LLM APIs.
 * Runs in 3 Phases: Understanding, Grounded Generation (Architect + Writer loop), and Validation/Review (Reviewer).
 * 
 * @param {object} inputs - User inputs containing health goals & clinical restrictions
 * @returns {Promise<object>} - Result containing success status, recipe, safety review, and health note
 */
export const generateHealthyRecipeText = async (inputs) => {
  const {
    dish: dishName,
    goals = [],
    medicalConditions = [],
    allergies = [],
    dietaryPreferences = 'No Preference',
    dislikedIngredients = [],
    cookingLevel = 'Intermediate',
    cookingTime = '30 mins',
    budget = '$$',
    cuisine = 'Healthy',
    kitchenEquipment = [],
    servings = 2
  } = inputs;

  const apiKey = process.env.GROQ_API_KEY;

  // -------------------------------------------------------------
  // PHASE 1: UNDERSTANDING & RETRIEVAL
  // -------------------------------------------------------------
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  logger.info(`Phase 1: Starting recipe understanding for: "${dishName}"`);
  const recipeUnderstanding = await understandRecipe(dishName);
  if (recipeUnderstanding && recipeUnderstanding.token_metrics) {
    totalPromptTokens += recipeUnderstanding.token_metrics.prompt_tokens || 0;
    totalCompletionTokens += recipeUnderstanding.token_metrics.completion_tokens || 0;
  }

  logger.info(`Phase 1: Starting evidence retrieval for health profile`);
  const evidence = await retrieveEvidence(inputs);

  logger.info(`Phase 1: Planning recipe optimizations & ingredient swaps`);
  const optimizationPlan = await planOptimizations(recipeUnderstanding, inputs, evidence.summary);
  if (optimizationPlan && optimizationPlan.token_metrics) {
    totalPromptTokens += optimizationPlan.token_metrics.prompt_tokens || 0;
    totalCompletionTokens += optimizationPlan.token_metrics.completion_tokens || 0;
  }

  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Falling back to local recipe generation.');
    const fallbackRecipe = getFallbackRecipe(dishName, goals);
    fallbackRecipe.optimization_plan = optimizationPlan;
    const safety_review = validateGeneratedRecipe(fallbackRecipe, inputs, evidence.summary, recipeUnderstanding);

    return {
      success: true,
      recipe: fallbackRecipe,
      safety_review,
      health_note: "Health Note: These recipes are intended for general wellness and educational purposes. They are not medical advice. If you have a medical condition, are pregnant, or have significant dietary restrictions, consult a qualified healthcare professional before making major dietary changes."
    };
  }

  let attempt = 0;
  let finalRecipe = null;
  let validatedResult = null;
  let safetyReviewerFeedback = null;

  while (attempt < 3) {
    try {
      // -------------------------------------------------------------
      // PHASE 2: MULTI-AGENT GENERATION
      // -------------------------------------------------------------
      
      // Agent 1: Combined Recipe Generation (Blueprint & Steps)
      logger.info(`Phase 2: Invoking Combined Recipe Generation (Blueprint & Steps)`);
      const combinedRecipe = await buildRecipeBlueprint(dishName, inputs, optimizationPlan, evidence.summary, recipeUnderstanding);
      if (combinedRecipe && combinedRecipe.token_metrics) {
        totalPromptTokens += combinedRecipe.token_metrics.prompt_tokens || 0;
        totalCompletionTokens += combinedRecipe.token_metrics.completion_tokens || 0;
      }

      // Assemble draft recipe object for review
      const draftRecipe = {
        dish_name: combinedRecipe.dish_name || `Healthy ${dishName}`,
        category: combinedRecipe.category || 'Nutritious Twist',
        description: combinedRecipe.description || 'A healthy remake optimized for your dietary goals.',
        calories: combinedRecipe.calories || 380,
        protein: combinedRecipe.protein || '20g',
        fiber: combinedRecipe.fiber || '8g',
        fats: combinedRecipe.fats || '10g',
        sodium: combinedRecipe.sodium || '400mg',
        cooking_time: combinedRecipe.cookTime || combinedRecipe.cooking_time || '30 mins',
        servings: combinedRecipe.servings || 2,
        difficulty: combinedRecipe.difficulty || 'Easy',
        cuisine: combinedRecipe.cuisine || recipeUnderstanding.cuisine,
        diet_type: combinedRecipe.diet_type || 'Vegetarian',
        meal_type: combinedRecipe.meal_type || 'Dinner',
        best_for: goals.join(', '),
        ingredients: (combinedRecipe.ingredients || []).map(ing => ({ name: ing.name, qty: ing.quantity || ing.qty })),
        steps: combinedRecipe.steps || [],
        optimization_plan: optimizationPlan,
        healthier_explanation: combinedRecipe.description
      };

      logger.info(`Phase 3: Invoking Agent 3 (Recipe Reviewer) for editorial critique`);
      safetyReviewerFeedback = await reviewRecipeSteps(dishName, draftRecipe.steps, inputs, optimizationPlan, evidence.summary);
      if (safetyReviewerFeedback && safetyReviewerFeedback.token_metrics) {
        totalPromptTokens += safetyReviewerFeedback.token_metrics.prompt_tokens || 0;
        totalCompletionTokens += safetyReviewerFeedback.token_metrics.completion_tokens || 0;
      }

      logger.info(`Phase 3: Running Rule-Based Validators on draft recipe`);
      validatedResult = validateGeneratedRecipe(draftRecipe, inputs, evidence.summary, recipeUnderstanding);

      // Calculate combined safety confidence (weighted average)
      const ruleConfidence = validatedResult.confidence;
      const peerConfidence = safetyReviewerFeedback.safetyConfidence;
      const combinedConfidence = Math.round((ruleConfidence * 0.7) + (peerConfidence * 0.3));

      validatedResult.confidence = combinedConfidence;
      validatedResult.reviewer_problems = safetyReviewerFeedback.problems;

      if (validatedResult.isValid && combinedConfidence >= 80) {
        logger.info(`Recipe successfully validated on attempt ${attempt + 1}. Combined Confidence: ${combinedConfidence}%`);
        draftRecipe.token_metrics = {
          prompt_tokens: totalPromptTokens,
          completion_tokens: totalCompletionTokens,
          total_tokens: totalPromptTokens + totalCompletionTokens,
          model_used: 'llama-3.1-8b-instant'
        };
        finalRecipe = draftRecipe;
        break;
      } else {
        logger.warn(`Attempt ${attempt + 1} failed checks or has low confidence (${combinedConfidence}%). Errors: ${validatedResult.errors.join(', ')}`);
        attempt++;
      }
    } catch (error) {
      logger.error(`Attempt ${attempt + 1} failed in E2E agent pipeline: ${error.message}`);
      attempt++;
    }
  }

  // Final check
  if (finalRecipe && validatedResult) {
    return {
      success: true,
      recipe: finalRecipe,
      safety_review: validatedResult,
      health_note: "Health Note: These recipes are intended for general wellness and educational purposes. They are not medical advice. If you have a medical condition, are pregnant, or have significant dietary restrictions, consult a qualified healthcare professional before making major dietary changes."
    };
  }

  // Fallback
  logger.warn('Multi-Agent recipe generation failed. Falling back to local recipe.');
  const fallbackRecipe = getFallbackRecipe(dishName, goals);
  fallbackRecipe.optimization_plan = optimizationPlan;
  fallbackRecipe.token_metrics = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    model_used: 'local_fallback'
  };
  const safety_review = validateGeneratedRecipe(fallbackRecipe, inputs, evidence.summary, recipeUnderstanding);

  return {
    success: true,
    recipe: fallbackRecipe,
    safety_review,
    health_note: "Health Note: These recipes are intended for general wellness and educational purposes. They are not medical advice. If you have a medical condition, are pregnant, or have significant dietary restrictions, consult a qualified healthcare professional before making major dietary changes."
  };
};
