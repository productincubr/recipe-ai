// Upserts data/ingredientDb.json into the public.ingredients table
// (created by migrations/006_recipe_intelligence.sql).
//
//   node scripts/syncIngredientsToSupabase.mjs
//
// The backend reads ingredient data from the JSON file (cached in memory);
// this copy in Supabase makes the reference data queryable and gives
// recipe_ingredients.ingredient_id a foreign key to point at.

import { supabase } from '../config/supabase.js';
import { INGREDIENTS } from '../services/ingredientDb.js';

const rows = INGREDIENTS.map((i) => ({
  id: i.id,
  name: i.name,
  aliases: i.aliases,
  category: i.category,
  state: i.state,
  animal: i.animal,
  allergens: i.allergens,
  may_contain: i.mayContain,
  gluten: String(i.gluten),
  negligible: i.negligible,
  per_100g: i.per100g,
  density_g_per_ml: i.density,
  portions: i.portions,
  source_dataset: i.source?.dataset || 'unknown',
  source_fdc_id: i.source?.fdcId || null,
  source_description: i.source?.description || i.source?.note || null,
  proxy_note: i.proxy ? `${i.proxy.of} (${i.proxy.confidence})` : null,
  variability: i.variability,
  updated_at: new Date().toISOString(),
}));

for (let i = 0; i < rows.length; i += 100) {
  const { error } = await supabase.from('ingredients').upsert(rows.slice(i, i + 100));
  if (error) {
    console.error(`Upsert failed: ${error.message}`);
    process.exit(1);
  }
}
console.log(`Synced ${rows.length} ingredients to public.ingredients.`);
process.exit(0);
