import { supabase } from '../config/supabase.js';
import logger from '../config/logger.js';
import fs from 'fs';
import path from 'path';

// Helper function to print a beautiful comparative token matrix in the server logs
const printTokenMatrixLog = (modelUsed = 'unknown', promptTokens = 0, completionTokens = 0) => {
  const pTokens = Number(promptTokens) || 0;
  const cTokens = Number(completionTokens) || 0;
  const totalTokens = pTokens + cTokens;

  // Cost calculations helper (per 1M tokens)
  const calc = (inRate, outRate) => {
    return ((pTokens * inRate + cTokens * outRate) / 1000000).toFixed(6);
  };

  const groqCost = calc(0.59, 0.79);
  const gpt4oCost = calc(2.50, 10.00);
  const gptMiniCost = calc(0.15, 0.60);
  const geminiFlashCost = calc(0.075, 0.30);
  const geminiProCost = calc(1.25, 5.00);

  const asciiArt = `
========================= LLM TOKEN MATRIX =========================
  Model/Engine Used:          ${modelUsed}
  Prompt (Input) Tokens:      ${pTokens.toLocaleString()}
  Completion (Output) Tokens: ${cTokens.toLocaleString()}
  Total Tokens Count:         ${totalTokens.toLocaleString()}
--------------------------------------------------------------------
  COMPARATIVE COST ESTIMATES (Based on actual token counts):
  - Llama 3.3 (Groq):  $${groqCost}  (Input: $0.59/M, Output: $0.79/M)
  - GPT-4o (ChatGPT):  $${gpt4oCost}  (Input: $2.50/M, Output: $10.00/M)
  - GPT-4o-mini:       $${gptMiniCost}  (Input: $0.15/M, Output: $0.60/M)
  - Gemini 1.5 Flash:  $${geminiFlashCost}  (Input: $0.075/M, Output: $0.30/M)
  - Gemini 1.5 Pro:    $${geminiProCost}  (Input: $1.25/M, Output: $5.00/M)
====================================================================
`;
  logger.info(asciiArt);
};

/**
 * Uploads a base64 image string to Supabase Storage bucket 'recipe-images'.
 * Falls back to using raw base64 data if upload fails or bucket is not configured.
 * 
 * @param {string} base64DataUrl - Base64 Image URL.
 * @param {string} dishName - Name of the dish.
 * @returns {Promise<string|null>} - Public image URL or Base64 string.
 */
export const uploadImageToStorage = async (base64DataUrl, dishName) => {
  if (!base64DataUrl) return null;

  try {
    // If it's already a regular URL (not base64), return it directly
    if (!base64DataUrl.startsWith('data:image')) {
      return base64DataUrl;
    }

    // Parse and decode base64
    const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Clean filename
    const cleanDishName = dishName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `recipe-${Date.now()}-${cleanDishName}.png`;

    logger.info(`Uploading generated image for "${dishName}" to Supabase storage...`);
    
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('Images')
      .getPublicUrl(fileName);

    logger.info('Image uploaded to Supabase Storage successfully.');
    return publicUrlData.publicUrl;
  } catch (error) {
    logger.warn('Could not upload image to Supabase Storage. Falling back to inline Base64 data.', { error: error.message });
    return base64DataUrl; // Return raw base64 as fallback
  }
};

/**
 * Saves a generated recipe and its request metadata to the database.
 * 
 * @param {object} recipeData - The recipe details.
 * @param {string} dishQuery - The original user search string.
 * @param {string[]} selectedGoals - Array of selected goals.
 * @param {object} [preferences] - Remaining wizard selections (allergies, dietaryPreference, spiceLevel).
 * @returns {Promise<object>} - Saved recipe record.
 */
export const saveRecipe = async (recipeData, dishQuery, selectedGoals, preferences = {}) => {
  try {
    logger.info(`Saving recipe for "${recipeData.dish_name}" to database...`);

    // 1. Handle image upload (Supabase Storage vs Base64 fallback)
    const imageUrl = await uploadImageToStorage(recipeData.image_url, recipeData.dish_name);
    
    // 2. Insert into public.recipes
    const baseRecipeRow = {
      dish_name: recipeData.dish_name,
      category: recipeData.category || 'Comfort Food',
      description: recipeData.description,
      calories: recipeData.calories,
      protein: recipeData.protein,
      fiber: recipeData.fiber,
      fats: recipeData.fats,
      sodium: recipeData.sodium,
      cooking_time: recipeData.cooking_time,
      servings: recipeData.servings || 2,
      difficulty: recipeData.difficulty || 'Easy',
      cuisine: recipeData.cuisine || 'Classic',
      diet_type: recipeData.diet_type || 'Vegetarian',
      meal_type: recipeData.meal_type || 'Lunch, Dinner',
      best_for: recipeData.best_for || 'Healthy eating',
      ingredients: recipeData.ingredients,
      steps: recipeData.steps,
      healthier_explanation: recipeData.healthier_explanation,
      image_url: imageUrl
    };

    let { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({ ...baseRecipeRow, optimization_plan: recipeData.optimization_plan || null })
      .select()
      .single();

    if (recipeError && (recipeError.code === '42703' || recipeError.message.includes('column'))) {
      // Older DB not yet migrated with an optimization_plan column — retry without it.
      logger.warn('optimization_plan column not found in database. Retrying insert without it.');
      ({ data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert(baseRecipeRow)
        .select()
        .single());
    }

    if (recipeError) throw recipeError;

    logger.info(`Successfully stored recipe with ID: ${recipe.id}`);

    // 3. Extract and log token metrics
    const metrics = recipeData.token_metrics || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      model_used: 'unknown'
    };

    // Print the comparative token matrix in server logs
    printTokenMatrixLog(metrics.model_used, metrics.prompt_tokens, metrics.completion_tokens);

    // Log locally to a JSON file
    try {
      const logDir = 'logs';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }
      const logFilePath = path.join(logDir, 'token_metrics.json');
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        dish_query: dishQuery,
        recipe_id: recipe.id,
        ...metrics
      }) + '\n';
      fs.appendFileSync(logFilePath, logEntry);
      logger.info('Token metrics logged successfully to logs/token_metrics.json');
    } catch (err) {
      logger.error('Failed to log token metrics to local file:', { error: err.message });
    }

    // Attempt to log request metadata along with token metrics and the
    // remaining wizard selections (allergies, cooking style, taste & spice)
    // in public.recipe_requests
    const { allergies, dietaryPreference, spiceLevel } = preferences;
    const requestData = {
      dish_query: dishQuery,
      selected_goals: selectedGoals,
      generated_recipe_id: recipe.id,
      prompt_tokens: metrics.prompt_tokens,
      completion_tokens: metrics.completion_tokens,
      total_tokens: metrics.total_tokens,
      model_used: metrics.model_used,
      allergies: allergies || [],
      dietary_preference: dietaryPreference || null,
      spice_level: spiceLevel || null
    };

    let { error: requestError } = await supabase
      .from('recipe_requests')
      .insert(requestData);

    if (requestError) {
      // If error is because columns don't exist (older DB not yet migrated),
      // retry with progressively fewer optional columns.
      if (requestError.code === '42703' || requestError.message.includes('column')) {
        logger.warn('Wizard preference columns not found in database. Retrying insert without them.');
        const { error: noPrefsError } = await supabase
          .from('recipe_requests')
          .insert({
            dish_query: dishQuery,
            selected_goals: selectedGoals,
            generated_recipe_id: recipe.id,
            prompt_tokens: metrics.prompt_tokens,
            completion_tokens: metrics.completion_tokens,
            total_tokens: metrics.total_tokens,
            model_used: metrics.model_used
          });

        if (noPrefsError && (noPrefsError.code === '42703' || noPrefsError.message.includes('column'))) {
          logger.warn('Token metrics columns not found in database. Retrying insert without token metrics.');
          const { error: fallbackError } = await supabase
            .from('recipe_requests')
            .insert({
              dish_query: dishQuery,
              selected_goals: selectedGoals,
              generated_recipe_id: recipe.id
            });
          if (fallbackError) {
            logger.error('Failed to log request metadata in database:', { error: fallbackError.message });
          }
        } else if (noPrefsError) {
          logger.error('Failed to log request metadata in database:', { error: noPrefsError.message });
        }
      } else {
        logger.error('Failed to log request metadata in database:', { error: requestError.message });
      }
    }

    return recipe;
  } catch (error) {
    logger.error('Error saving recipe to database:', { error: error.message });
    throw error;
  }
};
