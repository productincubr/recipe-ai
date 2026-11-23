// Writes a validated recipe's structured data to the normalised tables from
// migrations/006_recipe_intelligence.sql. recipes.details keeps the full
// recipe (what the website reads); these tables make ingredients, nutrition,
// validation results and quality scores queryable on their own.
//
// If the migration hasn't been run yet, this logs once and does nothing, so
// recipe generation never fails because of it.

import { supabase } from '../config/supabase.js';
import logger from '../config/logger.js';

let tablesMissing = false;
const isMissingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(error.message || ''));

const check = (error, what) => {
  if (!error) return;
  if (isMissingTable(error)) {
    tablesMissing = true;
    throw Object.assign(new Error(`table for ${what} missing`), { missingTable: true });
  }
  throw new Error(`${what}: ${error.message}`);
};

const replaceRows = async (table, recipeId, rows) => {
  check((await supabase.from(table).delete().eq('recipe_id', recipeId)).error, table);
  if (rows.length) check((await supabase.from(table).insert(rows)).error, table);
};

/**
 * Stores the structured parts of a validated recipe.
 * @param {string} recipeId
 * @param {object} recipe — output of validateAndCorrectRecipe
 * @param {'generate'|'read'} mode
 */
export const persistRecipeIntelligence = async (recipeId, recipe, mode = 'generate') => {
  if (tablesMissing || !recipeId || String(recipeId).startsWith('temp-')) return false;
  const d = recipe.details || {};
  try {
    await replaceRows('recipe_ingredients', recipeId, (recipe.ingredients || []).map((ing, position) => ({
      recipe_id: recipeId,
      position,
      ref: ing.ref,
      ingredient_id: ing.ingredientId || null,
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit || null,
      household: ing.household || null,
      display_quantity: ing.qty || null,
      prep: ing.prep || null,
      component: ing.group || null,
      optional: Boolean(ing.optional),
      to_taste: Boolean(ing.toTaste),
      grams: ing.grams ?? null,
      eaten_fraction: ing.eatenFraction ?? null,
      nutrition_source: ing.nutritionSource || null,
      match_status: ing.matchStatus || null,
    })));

    await replaceRows('recipe_steps', recipeId, (recipe.steps || []).map((s, i) => ({
      recipe_id: recipeId,
      step_number: Number(s.stepNumber) || i + 1,
      title: s.title || null,
      technique: s.technique || null,
      heat_level: s.heatLevel || null,
      temperature: s.temperature || null,
      active_minutes: s.activeMinutes ?? null,
      passive_minutes: s.passiveMinutes ?? null,
      passive_label: s.passiveLabel || null,
      depends_on: Array.isArray(s.dependsOn) ? s.dependsOn : [],
      optional: Boolean(s.optional),
      produces: s.produces || null,
      instructions: s.instructions || [],
      visual_cues: s.visualCues || [],
      ingredients_used: s.ingredientsUsed || [],
      chef_tip: s.chefTip || null,
      common_mistakes: s.commonMistakes || null,
    })));

    const meta = d.nutritionMeta || {};
    const p = meta.perServing || {};
    check((await supabase.from('recipe_nutrition').upsert({
      recipe_id: recipeId,
      servings: Number(recipe.servings) || null,
      kcal: p.kcal ?? null,
      protein_g: p.protein ?? null,
      carbs_g: p.carbs ?? null,
      fat_g: p.fat ?? null,
      sat_fat_g: p.satFat ?? null,
      fiber_g: p.fiber ?? null,
      sugar_g: p.sugar ?? null,
      added_sugar_g: p.addedSugar ?? null,
      sodium_mg: p.sodium ?? null,
      grams_per_serving: meta.gramsPerServing ?? null,
      status: meta.status || 'insufficient',
      coverage: meta.coverage ?? null,
      incomplete_nutrients: meta.incompleteNutrients || {},
      note: meta.note || null,
      engine_version: meta.engineVersion || 2,
      calculated_at: new Date().toISOString(),
    })).error, 'recipe_nutrition');

    await replaceRows('recipe_nutrition_sources', recipeId, (meta.sources || []).map((s) => ({
      recipe_id: recipeId,
      ingredient_ref: (recipe.ingredients || []).find((i) => i.name === s.ingredient)?.ref || null,
      ingredient_id: (recipe.ingredients || []).find((i) => i.name === s.ingredient)?.ingredientId || null,
      ingredient_name: s.ingredient,
      grams: s.grams ?? null,
      conversion: s.conversion || null,
      source_type: s.type || null,
      fdc_id: s.fdcId || null,
      record_description: s.record || null,
    })));

    check((await supabase.from('recipe_dietary_info').upsert({
      recipe_id: recipeId,
      diet_type: recipe.diet_type || null,
      dietary_tags: d.dietaryTags || [],
      allergens: d.allergenInfo?.contains || d.allergens || [],
      may_contain: d.allergenInfo?.mayContain || [],
      diet_note: d.dietNote || null,
      food_safety: d.foodSafety || [],
      updated_at: new Date().toISOString(),
    })).error, 'recipe_dietary_info');

    await replaceRows('recipe_substitutions', recipeId, (d.substitutions || []).map((s) => ({
      recipe_id: recipeId,
      ingredient_ref: s.ref || null,
      ingredient: s.ingredient,
      substitute: s.substitute,
      note: s.note || null,
      warning: s.warning || null,
    })));

    const v = d.validation;
    if (v) {
      const { data: validation, error } = await supabase.from('recipe_validations').insert({
        recipe_id: recipeId,
        mode,
        passed: Boolean(v.passed),
        structured: Boolean(v.structured),
        checks: v.checks || {},
        issues: v.issues || [],
        corrections: v.corrections || [],
        engine_version: v.version || 2,
      }).select('id').single();
      check(error, 'recipe_validations');
      const q = d.quality;
      if (q) {
        check((await supabase.from('recipe_quality_scores').insert({
          recipe_id: recipeId,
          validation_id: validation?.id || null,
          score: q.score,
          passed: Boolean(q.passed),
          status: q.status,
          categories: q.categories || {},
          hard_failures: q.hardFailures || [],
        })).error, 'recipe_quality_scores');
      }
    }
    return true;
  } catch (error) {
    if (error.missingTable) {
      logger.warn('Recipe intelligence tables are missing — run migrations/006_recipe_intelligence.sql. Structured rows will not be stored until then (recipes.details still holds everything).');
    } else {
      logger.warn(`Could not store structured recipe data for ${recipeId}: ${error.message}`);
    }
    return false;
  }
};
