import dotenv from 'dotenv';
import { understandRecipe } from './services/recipeUnderstanding.js';
import { retrieveEvidence } from './services/evidenceRetrieval.js';
import { planOptimizations } from './services/optimizationPlanner.js';
import { buildRecipeBlueprint } from './services/recipeArchitect.js';
import { reviewRecipeSteps } from './services/recipeReviewer.js';
import { validateGeneratedRecipe } from './services/recipeValidator.js';

dotenv.config();

const test = async () => {
  const inputs = {
    dish: 'Daal',
    goals: ['High Protein', 'Lower Calories'],
    medicalConditions: ['None'],
    allergies: ['None'],
    dietaryPreferences: 'Vegetarian',
    dislikedIngredients: [],
    cookingLevel: 'Intermediate',
    cookingTime: '30 mins',
    budget: '$$',
    cuisine: 'Indian',
    kitchenEquipment: ['Gas Stove'],
    servings: 2
  };

  console.log("Running recipe generation test with inputs:", inputs);
  console.log("\n--- PHASE 1 ---");
  const recipeUnderstanding = await understandRecipe(inputs.dish);
  console.log("recipeUnderstanding:", JSON.stringify(recipeUnderstanding, null, 2));

  const evidence = await retrieveEvidence(inputs);
  console.log("evidence summary length:", evidence.summary.length);

  const optimizationPlan = await planOptimizations(recipeUnderstanding, inputs, evidence.summary);
  console.log("optimizationPlan:", JSON.stringify(optimizationPlan, null, 2));

  console.log("\n--- PHASE 2 ---");
  const combinedRecipe = await buildRecipeBlueprint(inputs.dish, inputs, optimizationPlan, evidence.summary);
  console.log("combinedRecipe (first 500 chars):", JSON.stringify(combinedRecipe, null, 2).slice(0, 500) + "...");
  console.log("combinedRecipe token_metrics:", combinedRecipe.token_metrics);

  const draftRecipe = {
    dish_name: combinedRecipe.dish_name || `Healthy ${inputs.dish}`,
    category: combinedRecipe.category || 'Nutritious Twist',
    description: combinedRecipe.description || 'A healthy remake.',
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
    best_for: inputs.goals.join(', '),
    ingredients: (combinedRecipe.ingredients || []).map(ing => ({ name: ing.name, qty: ing.quantity || ing.qty })),
    steps: combinedRecipe.steps || [],
    optimization_plan: optimizationPlan,
    healthier_explanation: combinedRecipe.description
  };

  console.log("\n--- PHASE 3 ---");
  const safetyReviewerFeedback = await reviewRecipeSteps(inputs.dish, draftRecipe.steps, inputs, optimizationPlan, evidence.summary);
  console.log("safetyReviewerFeedback:", JSON.stringify(safetyReviewerFeedback, null, 2));

  const validatedResult = validateGeneratedRecipe(draftRecipe, inputs, evidence.summary);
  console.log("validatedResult:", JSON.stringify(validatedResult, null, 2));

  const combinedConfidence = Math.round((validatedResult.confidence * 0.7) + (safetyReviewerFeedback.safetyConfidence * 0.3));
  console.log("combinedConfidence:", combinedConfidence);
};

test().catch(console.error);
