import logger from '../config/logger.js';
import { generateHealthyRecipeText } from '../services/recipeGenerator.js';
import { generateDishImage } from '../services/stability.js';
import { saveRecipe, uploadImageToStorage } from '../services/recipeService.js';
import { validateInputs, checkPreContradictions } from '../services/recipeValidator.js';
import { scanMealImage } from '../services/mealScanner.js';

/**
 * Handles HTTP requests for E2E healthy recipe generation.
 * Generates custom recipe content, fetches matching dish imagery, and saves records.
 * 
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
export const generateRecipe = async (req, res) => {
  // Validate request inputs format
  const inputValidation = validateInputs(req.body);
  if (!inputValidation.isValid) {
    logger.warn('Recipe generation rejected: Invalid request payload structure.', { error: inputValidation.error });
    return res.status(400).json({ error: inputValidation.error });
  }

  const { dish, goals, allergies, dietaryPreferences, spiceLevel } = req.body;

  // Run Pre-generation Contradiction Check
  const preCheck = checkPreContradictions(req.body);
  if (preCheck.hasErrors) {
    logger.warn('Recipe generation rejected: Pre-generation contradictions found.', { errors: preCheck.errors });
    return res.status(422).json({
      success: false,
      error: 'Pre-generation contradiction check failed.',
      errors: preCheck.errors,
      warnings: preCheck.warnings,
      safety_review: {
        confidence: 0,
        checks: {
          allergies: false,
          medicalRestrictions: false,
          nutritionGoals: false,
          dietaryPreference: false,
          ingredientAvailability: false
        },
        errors: preCheck.errors,
        warnings: preCheck.warnings
      }
    });
  }

  try {
    logger.info(`Initiating E2E recipe generation workflow for: "${dish}"`);

    // Step 1: Query Groq LLM with full context & safety validators
    const result = await generateHealthyRecipeText(req.body);
    
    if (!result.success) {
      logger.warn(`Recipe generation failed safety threshold: ${result.error}`);
      return res.status(422).json(result);
    }

    const { recipe, safety_review, health_note } = result;

    // Skip initial image generation (user can generate on-demand)
    recipe.image_url = null;

    // Step 3: Save generated recipe and request history to Supabase (Database & Storage)
    let savedRecord;
    try {
      savedRecord = await saveRecipe(recipe, dish, goals, {
        allergies,
        dietaryPreference: dietaryPreferences,
        spiceLevel
      });
      logger.info(`Recipe generation successfully saved to database with ID: ${savedRecord.id}`);
    } catch (dbError) {
      logger.warn('Failed to save generated recipe to database. Proceeding with in-memory payload.', { error: dbError.message });
      savedRecord = {
        id: `temp-${Date.now()}`,
        ...recipe
      };
    }
    
    // Add warnings from pre-check to safety review
    if (preCheck.warnings && preCheck.warnings.length > 0) {
      safety_review.warnings = [...(safety_review.warnings || []), ...preCheck.warnings];
    }

    // Return saved record along with safety review, health note, and optimization plan for explainability
    return res.status(200).json({
      ...savedRecord,
      optimization_plan: recipe.optimization_plan,
      safety_review,
      health_note,
      token_metrics: recipe.token_metrics
    });
  } catch (error) {
    logger.error('Failed to complete recipe generation workflow:', { error: error.message });
    return res.status(500).json({ error: 'Failed to generate recipe. Please review server log logs for details.' });
  }
};

/**
 * Handles generating an image for a recipe on-demand.
 */
export const generateRecipeImage = async (req, res) => {
  const { recipeId, dishName } = req.body;

  if (!dishName) {
    return res.status(400).json({ error: 'dishName is required to generate an image.' });
  }

  try {
    logger.info(`Generating on-demand image for dish: "${dishName}", recipe ID: ${recipeId}`);

    // 0. Pull the actual recipe content so the image reflects what was really cooked,
    // instead of guessing from the dish name alone.
    let details = {};
    if (recipeId && !recipeId.startsWith('temp-')) {
      const { supabase } = await import('../config/supabase.js');
      const { data } = await supabase
        .from('recipes')
        .select('description, ingredients, cuisine')
        .eq('id', recipeId)
        .single();
      if (data) details = data;
    }

    // 1. Fetch photorealistic imagery from Stability AI
    const base64Image = await generateDishImage(dishName, details);
    
    if (!base64Image) {
      return res.status(500).json({ error: 'Failed to generate image from Stability AI.' });
    }

    // 2. Upload image to Supabase Storage if configured
    const imageUrl = await uploadImageToStorage(base64Image, dishName);

    // 3. Update the database record if it's a real recipe ID
    if (recipeId && !recipeId.startsWith('temp-')) {
      const { supabase } = await import('../config/supabase.js');
      const { error } = await supabase
        .from('recipes')
        .update({ image_url: imageUrl })
        .eq('id', recipeId);

      if (error) {
        logger.warn(`Failed to update recipe image URL in DB: ${error.message}`);
      } else {
        logger.info(`Successfully updated recipe ID ${recipeId} image URL in database.`);
      }
    }

    return res.status(200).json({ image_url: imageUrl });
  } catch (error) {
    logger.error('Failed to generate recipe image:', { error: error.message });
    return res.status(500).json({ error: 'Failed to generate image.' });
  }
};

/**
 * Fetch a single recipe by its ID
 */
export const getRecipeById = async (req, res) => {
  const { id } = req.params;
  try {
    const { supabase } = await import('../config/supabase.js');
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error(`Error fetching recipe by id ${id}:`, { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch recipe' });
  }
};

/**
 * Scans a meal photo and returns the detected dish, nutrition, and ingredients.
 */
export const scanMeal = async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, error: 'image (base64) is required.' });
  }

  try {
    logger.info('Analyzing uploaded meal photo via Gemini Vision...');
    const result = await scanMealImage(image, mimeType || 'image/jpeg');
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Meal scan failed:', { error: error.message });
    return res.status(500).json({ success: false, error: error.message || 'Failed to analyze the photo.' });
  }
};
