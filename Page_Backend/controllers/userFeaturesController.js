import { supabase } from '../config/supabase.js';
import logger from '../config/logger.js';

// ==========================================
// HISTORY (Recently generated recipes)
// ==========================================
export const getHistory = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching history:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
};

// ==========================================
// SAVED RECIPES
// ==========================================
export const getSavedRecipes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*, recipes(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data: data.map(d => d.recipes) });
  } catch (error) {
    logger.error('Error fetching saved recipes:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch saved recipes' });
  }
};

export const saveRecipe = async (req, res) => {
  const { recipe_id } = req.body;
  if (!recipe_id) return res.status(400).json({ success: false, error: 'recipe_id is required' });

  try {
    const { data, error } = await supabase
      .from('saved_recipes')
      .insert([{ recipe_id }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    // Check if duplicate
    if (error.code === '23505') {
       return res.status(200).json({ success: true, message: 'Already saved' });
    }
    logger.error('Error saving recipe:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to save recipe' });
  }
};

export const removeSavedRecipe = async (req, res) => {
  const { recipe_id } = req.params;
  try {
    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('recipe_id', recipe_id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Recipe removed from saved' });
  } catch (error) {
    logger.error('Error removing saved recipe:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to remove saved recipe' });
  }
};

// ==========================================
// MEAL PLANNER
// ==========================================
export const getMealPlans = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*, recipes(*)')
      .order('plan_date', { ascending: true });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching meal plans:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch meal plans' });
  }
};

export const addMealPlan = async (req, res) => {
  const { plan_date, meal_type, recipe_id } = req.body;
  if (!plan_date || !meal_type || !recipe_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert([{ plan_date, meal_type, recipe_id }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    logger.error('Error adding meal plan:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add meal plan' });
  }
};

export const deleteMealPlan = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Meal plan removed' });
  } catch (error) {
    logger.error('Error removing meal plan:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to remove meal plan' });
  }
};

// ==========================================
// SHOPPING LIST
// ==========================================
export const getShoppingList = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching shopping list:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch shopping list' });
  }
};

export const addShoppingListItem = async (req, res) => {
  const { ingredient_name, quantity } = req.body;
  if (!ingredient_name) {
    return res.status(400).json({ success: false, error: 'Ingredient name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('shopping_list')
      .insert([{ ingredient_name, quantity }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    logger.error('Error adding to shopping list:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add to shopping list' });
  }
};

export const toggleShoppingListItem = async (req, res) => {
  const { id } = req.params;
  const { is_checked } = req.body;
  try {
    const { data, error } = await supabase
      .from('shopping_list')
      .update({ is_checked })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ success: true, data: data[0] });
  } catch (error) {
    logger.error('Error toggling shopping list item:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
};

export const removeShoppingListItem = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('shopping_list')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Item removed' });
  } catch (error) {
    logger.error('Error removing shopping list item:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to remove item' });
  }
};
