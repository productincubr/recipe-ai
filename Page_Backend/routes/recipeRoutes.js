import express from 'express';
import { generateRecipe, generateRecipeImage, getRecipeById } from '../controllers/recipeController.js';

const router = express.Router();

/**
 * @route   GET /api/recipes/:id
 * @desc    Fetch a single recipe by its ID
 */
router.get('/:id', getRecipeById);

/**
 * @route   POST /api/recipes/generate
 * @desc    Orchestrates recipe text and image generation, followed by database logging.
 */
router.post('/generate', generateRecipe);

/**
 * @route   POST /api/recipes/generate-image
 * @desc    Generates photorealistic imagery of a dish on-demand.
 */
router.post('/generate-image', generateRecipeImage);

export default router;
