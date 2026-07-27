import express from 'express';
import {
  getHistory,
  getSavedRecipes,
  saveRecipe,
  removeSavedRecipe,
  getMealPlans,
  addMealPlan,
  deleteMealPlan,
  getShoppingList,
  addShoppingListItem,
  toggleShoppingListItem,
  removeShoppingListItem
} from '../controllers/userFeaturesController.js';

const router = express.Router();

// History
router.get('/history', getHistory);

// Saved Recipes
router.get('/saved', getSavedRecipes);
router.post('/saved', saveRecipe);
router.delete('/saved/:recipe_id', removeSavedRecipe);

// Meal Planner
router.get('/meal-plans', getMealPlans);
router.post('/meal-plans', addMealPlan);
router.delete('/meal-plans/:id', deleteMealPlan);

// Shopping List
router.get('/shopping-list', getShoppingList);
router.post('/shopping-list', addShoppingListItem);
router.put('/shopping-list/:id', toggleShoppingListItem);
router.delete('/shopping-list/:id', removeShoppingListItem);

export default router;
