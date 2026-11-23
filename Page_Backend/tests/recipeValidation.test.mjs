// Validation engine tests. Run with: npm test
//
// Each test starts from a fully consistent recipe (fixtures.mjs), breaks one
// thing, and checks that the validator reports it instead of accepting it.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateAndCorrectRecipe } from '../services/recipeConsistency.js';
import { matchIngredient, toGrams, getIngredient } from '../services/ingredientDb.js';
import { calculateNutrition } from '../services/nutritionEngine.js';
import { validTofuCurry, tofuCurryProfile } from './fixtures.mjs';

const validate = (recipe, inputs = {}, mode = 'generate') =>
  validateAndCorrectRecipe(recipe, { inputs, mode, dishProfile: tofuCurryProfile });
const hard = (result, rule) => result.report.issues.filter((i) => i.severity === 'hard' && (!rule || i.rule === rule)).map((i) => i.message);
const step = (recipe, n) => recipe.steps.find((s) => s.stepNumber === n);
const ing = (recipe, ref) => recipe.ingredients.find((i) => i.ref === ref);

describe('baseline', () => {
  test('a consistent recipe passes every hard check and the quality gate', () => {
    const r = validate(validTofuCurry(), { dietaryPreferences: 'Vegan' });
    assert.deepEqual(hard(r), []);
    assert.equal(r.report.passed, true);
    assert.equal(r.quality.passed, true);
    assert.ok(r.quality.score >= 9, `score ${r.quality.score}`);
  });
});

describe('ingredient ↔ instruction consistency', () => {
  test('split uses that add up to more than the listed quantity are a hard failure (lime juice ½ + 1 ≠ 1 tbsp)', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'lime_juice').quantity = 1;
    const r = validate(recipe);
    const msgs = hard(r, 'quantities');
    assert.ok(msgs.some((m) => /Lime juice: the method uses 1\/2 tbsp \(step 1\) \+ 1 tbsp \(step 5\) = 1 1\/2 tbsp, more than the 1 tbsp listed/.test(m)), msgs.join('\n'));
    assert.equal(r.quality.passed, false);
    assert.ok(r.quality.score <= 5.9);
  });

  test('the listed quantity is not silently changed to make the check pass', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'lime_juice').quantity = 1;
    const r = validate(recipe);
    assert.equal(ing(r.recipe, 'lime_juice').quantity, 1);
  });

  test('listed quantity larger than what the method uses is a hard failure', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'tofu').quantity = 500;
    assert.ok(hard(validate(recipe), 'quantities').some((m) => /Firm tofu: the method uses 400 g .* less than the 500 g listed/.test(m)));
  });

  test('instruction text that disagrees with the structured amount is a hard failure', () => {
    const recipe = validTofuCurry();
    step(recipe, 5).instructions[0] = 'Stir in 2 tbsp low-sodium tamari, 1 tbsp lime juice and 1 tsp palm sugar over low heat until the sugar dissolves.';
    assert.ok(hard(validate(recipe), 'quantities').some((m) => /Step 5: the instruction says 2 tbsp Low-sodium tamari, but the step's ingredientsUsed says 1 tbsp/.test(m)));
  });

  test('an ingredient used in the method but missing from the list is a hard failure (optional side included)', () => {
    const recipe = validTofuCurry();
    recipe.steps.push({
      stepNumber: 6, title: 'Optional side', heatLevel: 'Medium', activeMinutes: 4, passiveMinutes: 0, dependsOn: [], optional: true,
      ingredientsUsed: [], instructions: ['Steam the cauliflower rice for 4 minutes until tender.'], visualCues: ['tender'],
    });
    assert.ok(hard(validate(recipe), 'ingredients').some((m) => /Step 6 uses cauliflower rice, which is not in the ingredient list \(optional sides need their own ingredients too\)/.test(m)));
  });

  test('a step reference to an unlisted ref is a hard failure', () => {
    const recipe = validTofuCurry();
    step(recipe, 5).ingredientsUsed.push({ ref: 'fish_sauce', quantity: 1, unit: 'tsp' });
    assert.ok(hard(validate(recipe), 'ingredients').some((m) => /Step 5 uses "fish_sauce", which is not in the ingredient list/.test(m)));
  });

  test('an ingredient listed but never used is a hard failure', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.push({ ref: 'carrot', name: 'Carrot', quantity: 80, unit: 'g' });
    assert.ok(hard(validate(recipe), 'ingredients').some((m) => /Carrot is in the ingredient list but no step uses it/.test(m)));
  });

  test('an uncounted garnish ("a few extra basil leaves") is a hard failure', () => {
    const recipe = validTofuCurry();
    step(recipe, 5).instructions.push('Garnish each bowl with a few extra Thai basil leaves.');
    assert.ok(hard(validate(recipe), 'quantities').some((m) => /Step 5 adds extra Thai basil leaves/.test(m)));
  });

  test('a prep step may handle an ingredient that a later step measures', () => {
    const recipe = validTofuCurry();
    recipe.steps[1].instructions.push('Pick the Thai basil leaves from the stems.');
    assert.deepEqual(hard(validate(recipe), 'quantities'), []);
  });

  test('duplicate lines for the same food are merged into one total, with steps re-pointed', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.push({ ref: 'lime_juice_2', name: 'Fresh lime juice', quantity: 1, unit: 'tbsp' });
    ing(recipe, 'lime_juice').quantity = 0.5;
    step(recipe, 5).ingredientsUsed = step(recipe, 5).ingredientsUsed.map((u) => (u.ref === 'lime_juice' ? { ...u, ref: 'lime_juice_2' } : u));
    const r = validate(recipe);
    assert.equal(r.recipe.ingredients.filter((i) => i.ingredientId === 'ING_LIME_JUICE').length, 1);
    assert.equal(ing(r.recipe, 'lime_juice').quantity, 1.5);
    assert.ok(r.report.corrections.some((c) => /listed twice; merged/.test(c.message)));
    assert.deepEqual(hard(r, 'quantities'), []);
  });

  test('a homemade component listed as a bought ingredient is a double count', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'curry_paste').name = 'Homemade red curry paste';
    step(recipe, 2).produces = 'red curry paste';
    assert.ok(hard(validate(recipe), 'ingredients').some((m) => /would be counted twice/.test(m)));
  });

  test('an ingredient used only in an optional step must be marked optional', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.push({ ref: 'cauli', name: 'Cauliflower rice', quantity: 300, unit: 'g' });
    recipe.steps.push({
      stepNumber: 6, title: 'Optional cauliflower rice', heatLevel: 'Medium', activeMinutes: 4, passiveMinutes: 0, dependsOn: [], optional: true,
      ingredientsUsed: [{ ref: 'cauli', quantity: 300, unit: 'g' }], instructions: ['Steam 300 g cauliflower rice for 4 minutes until tender.'], visualCues: [],
    });
    assert.ok(hard(validate(recipe), 'ingredients').some((m) => /only used in an optional step, so it must be marked optional/.test(m)));
  });
});

describe('diet and allergens', () => {
  test('vegetarian recipe containing fish sauce is a hard failure', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.push({ ref: 'fish_sauce', name: 'Fish sauce', quantity: 1, unit: 'tsp' });
    step(recipe, 5).ingredientsUsed.push({ ref: 'fish_sauce', quantity: 1, unit: 'tsp' });
    step(recipe, 5).instructions[0] += ' Add 1 tsp fish sauce.';
    const r = validate(recipe, { dietaryPreferences: 'Vegetarian' });
    assert.ok(hard(r, 'diet').some((m) => /You asked for a Vegetarian recipe, but it contains: Fish sauce/.test(m)));
    assert.equal(r.recipe.diet_type, 'Pescatarian');
    assert.ok(!r.recipe.details.dietaryTags.includes('Vegan'));
    assert.ok(r.recipe.details.allergens.includes('Fish'));
  });

  test('vegan recipe containing yogurt is a hard failure', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.push({ ref: 'yogurt', name: 'Plain yogurt', quantity: 60, unit: 'g' });
    step(recipe, 5).ingredientsUsed.push({ ref: 'yogurt', quantity: 60, unit: 'g' });
    step(recipe, 5).instructions[1] += ' Swirl in 60 g plain yogurt.';
    const r = validate(recipe, { dietaryPreferences: 'Vegan' });
    assert.ok(hard(r, 'diet').some((m) => /You asked for a Vegan recipe, but it contains: Plain yogurt/.test(m)));
    assert.ok(r.recipe.details.allergens.includes('Milk'));
  });

  test('an unqualified commercial curry paste is never assumed vegetarian', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'curry_paste').name = 'Red curry paste';
    const r = validate(recipe, { dietaryPreferences: 'Vegetarian' });
    assert.ok(hard(r, 'diet').some((m) => /many commercial versions contain shrimp paste or fish sauce/.test(m)));
    assert.ok(r.recipe.details.allergenInfo.mayContain.includes('Fish'));
    assert.ok(!r.recipe.details.dietaryTags.includes('Vegetarian'));
  });

  test('a gluten-free label with wheat-based soy sauce is removed, and wheat is added to allergens', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'tamari').name = 'Low-sodium soy sauce';
    for (const s of recipe.steps) s.instructions = s.instructions.map((t) => t.replace(/low-sodium tamari/g, 'low-sodium soy sauce'));
    const r = validate(recipe);
    assert.ok(!r.recipe.details.dietaryTags.includes('Gluten-Free'));
    assert.ok(r.report.corrections.some((c) => /Removed the "Gluten-Free" label/.test(c.message)));
    assert.ok(r.recipe.details.allergens.includes('Wheat (gluten)'));
  });

  test("the user's allergy must be absent", () => {
    const recipe = validTofuCurry();
    const r = validate(recipe, { allergies: ['Soy'] });
    assert.ok(hard(r, 'allergens').some((m) => /soy allergy, but the recipe contains Firm tofu, Low-sodium tamari/i.test(m)));
  });

  test('a substitution that adds an allergen the user is allergic to is removed', () => {
    const recipe = validTofuCurry();
    recipe.details.substitutions.push({ ingredient: 'Light coconut milk', substitute: 'Unsweetened almond milk, 400 ml', note: '' });
    const r = validate(recipe, { allergies: ['Nuts'] });
    assert.ok(r.report.corrections.some((c) => /Removed "Light coconut milk → Unsweetened almond milk.*contains tree nuts/.test(c.message)));
    assert.ok(!r.recipe.details.substitutions.some((s) => /almond/i.test(s.substitute)));
  });

  test('a substitution for an ingredient the recipe does not use is removed', () => {
    const recipe = validTofuCurry();
    recipe.details.substitutions.push({ ingredient: 'Canned bamboo shoots', substitute: 'Fresh bamboo shoots', note: '' });
    ing(recipe, 'bamboo').name = 'Fresh bamboo shoots';
    const r = validate(recipe);
    assert.ok(r.report.corrections.some((c) => /Removed the substitution for "Canned bamboo shoots": the recipe doesn't use it/.test(c.message)));
  });

  test('poultry without a doneness cue fails food safety', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'tofu').name = 'Chicken breast';
    recipe.dish_name = 'Red Thai Curry with Chicken';
    step(recipe, 1).instructions = ['Cut 400 g chicken breast into 2 cm pieces.', 'Toss with 0.5 tbsp low-sodium tamari and 0.5 tbsp lime juice, then leave to marinate for 15 minutes.'];
    step(recipe, 3).instructions = ['Heat 1 tbsp canola oil in a wok over medium-high heat.', 'Add the marinated chicken and stir-fry for 6 minutes.'];
    step(recipe, 3).visualCues = [];
    const r = validateAndCorrectRecipe(recipe, { mode: 'generate', dishProfile: null });
    assert.ok(hard(r, 'food-safety').some((m) => /never says how to tell the poultry is safely cooked/.test(m)));
    assert.ok(r.recipe.details.foodSafety.some((g) => /74°C \(165°F\)/.test(g)));
  });
});

describe('servings, nutrition and claims', () => {
  test('invalid serving count is a hard failure', () => {
    const recipe = validTofuCurry();
    recipe.servings = 0;
    assert.ok(hard(validate(recipe), 'servings').some((m) => /whole number from 1 to 12/.test(m)));
  });

  test('servings that do not fit the quantities are a hard failure', () => {
    const recipe = validTofuCurry();
    recipe.servings = 10;
    assert.ok(hard(validate(recipe), 'servings').some((m) => /don't fit 10 servings of a main meal: only about \d+ g of food per serving/.test(m)));
  });

  test('model-supplied nutrition numbers are ignored and replaced by the calculation', () => {
    const recipe = validTofuCurry();
    recipe.calories = 120;
    recipe.protein = '45g';
    const r = validate(recipe);
    assert.notEqual(r.recipe.calories, 120);
    assert.notEqual(r.recipe.protein, '45g');
    assert.equal(r.recipe.details.nutritionMeta.method, 'calculated');
  });

  test('nutrition equals the hand calculation from USDA records', () => {
    const recipe = { servings: 2, ingredients: [
      { ref: 'a', name: 'Firm tofu', quantity: 200, unit: 'g' },
      { ref: 'b', name: 'Olive oil', quantity: 1, unit: 'tbsp' },
      { ref: 'c', name: 'Salt', quantity: 0.5, unit: 'tsp' },
    ] };
    const tofu = getIngredient('ING_TOFU_FIRM').per100g;
    const oil = getIngredient('ING_OLIVE_OIL').per100g;
    const salt = getIngredient('ING_SALT').per100g;
    const n = calculateNutrition(recipe);
    // USDA: 1 tbsp olive oil = 13.5 g; 1 tsp salt = 6 g.
    const kcal = (200 * tofu.kcal / 100 + 13.5 * oil.kcal / 100) / 2;
    const sodium = (200 * tofu.sodium / 100 + 13.5 * oil.sodium / 100 + 3 * salt.sodium / 100) / 2;
    const satFat = (200 * tofu.satFat / 100 + 13.5 * oil.satFat / 100) / 2;
    assert.ok(Math.abs(n.perServing.kcal - kcal) < 0.01);
    assert.ok(Math.abs(n.perServing.sodium - sodium) < 0.01);
    assert.ok(Math.abs(n.perServing.satFat - satFat) < 0.01);
    assert.equal(n.status, 'complete');
  });

  test('an ingredient with no reliable data is reported, not guessed', () => {
    const n = calculateNutrition({ servings: 2, ingredients: [
      { ref: 'a', name: 'Firm tofu', quantity: 200, unit: 'g' },
      { ref: 'b', name: 'Nutritional yeast', quantity: 20, unit: 'g' },
    ] });
    assert.equal(n.status, 'partial');
    assert.deepEqual(n.unknown.map((u) => u.name), ['Nutritional yeast']);
  });

  test('a high-protein label that the calculation does not support is removed', () => {
    const recipe = validTofuCurry();
    recipe.details.dietaryTags.push('High-Protein');
    const r = validate(recipe);
    assert.ok(r.report.corrections.some((c) => /Removed the "High-Protein" label: calculated \d+(\.\d)? g protein per serving \(needs 20 g or more\)/.test(c.message)));
  });

  test('a low-sodium label is checked against calculated sodium', () => {
    const recipe = validTofuCurry();
    recipe.details.dietaryTags.push('Low-Sodium');
    const r = validate(recipe);
    assert.ok(r.report.corrections.some((c) => /Removed the "Low-Sodium" label: calculated \d+ mg sodium per 100 g/.test(c.message)));
  });

  test('unsupported health claims are removed', () => {
    const recipe = validTofuCurry();
    recipe.details.healthBenefits.push('Rich in antioxidants that fight inflammation', 'Lemongrass is anti-inflammatory', 'Coconut milk provides heart-healthy fats');
    const r = validate(recipe);
    assert.deepEqual(r.recipe.details.healthBenefits, ['Tofu provides plant protein.']);
  });

  test('ingredient swaps are quantified from the database', () => {
    const r = validate(validTofuCurry());
    const swap = r.recipe.details.healthComparisons[0];
    assert.equal(swap.quantified, true);
    assert.ok(swap.perServing.satFat < -10, JSON.stringify(swap));
    assert.match(swap.summary, /^Using 400 ml light coconut milk instead of coconut milk: −\d+ kcal, −\d+ g saturated fat/);
  });

  test('a swap described as lowering saturated fat that actually adds it is a hard failure', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.find((i) => i.ref === 'oil').name = 'Coconut oil';
    recipe.steps[2].instructions[0] = 'Heat 1 tbsp coconut oil in a wok over medium-high heat.';
    recipe.details.healthSwaps.push({ original: 'vegetable oil', replacement: 'coconut oil', quantity: 1, unit: 'tbsp', reason: 'to lower saturated fat' });
    assert.ok(hard(validate(recipe), 'health-claims').some((m) => /says using coconut oil instead of vegetable oil lowers saturated fat, but at this amount it adds about/.test(m)));
  });
});

describe('units', () => {
  test('amounts in different units are compared through the ingredient\'s own weights (3 tbsp paste = 45 g)', () => {
    const recipe = validTofuCurry();
    recipe.steps[3].ingredientsUsed[0] = { ref: 'curry_paste', quantity: 45, unit: 'g' };
    assert.deepEqual(hard(validate(recipe), 'quantities'), []);
  });

  test('text in spoons vs structure in grams allows for typical weights (1/2 tsp salt ≈ 2.5 g)', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.push({ ref: 'salt', name: 'Sea salt', quantity: 2.5, unit: 'g' });
    recipe.steps[4].ingredientsUsed.push({ ref: 'salt', quantity: 2.5, unit: 'g' });
    recipe.steps[4].instructions[0] += ' Season with 0.5 tsp sea salt.';
    assert.deepEqual(hard(validate(recipe), 'quantities'), []);
  });

  test('a clearly different cross-unit amount is still a hard failure (1 tsp salt = 6 g, structure says 2.5 g)', () => {
    const recipe = validTofuCurry();
    recipe.ingredients.push({ ref: 'salt', name: 'Sea salt', quantity: 2.5, unit: 'g' });
    recipe.steps[4].ingredientsUsed.push({ ref: 'salt', quantity: 2.5, unit: 'g' });
    recipe.steps[4].instructions[0] += ' Season with 1 tsp sea salt.';
    assert.ok(hard(validate(recipe), 'quantities').some((m) => /instruction says 1 tsp Sea salt, but the step's ingredientsUsed says 2.5 g/.test(m)));
  });
});

describe('timing', () => {
  test('waiting that overlaps other work is not added twice', () => {
    const r = validate(validTofuCurry());
    const m = r.recipe.details.timingMinutes;
    // Sum of all step durations is 46 min; the 15 min marinade overlaps the 8 min vegetable prep.
    assert.equal(m.total, 38);
    assert.equal(m.overlap, 8);
    assert.equal(r.recipe.details.totalTime, '38 min');
  });

  test('a step whose instructions take longer than its stated duration is a hard failure', () => {
    const recipe = validTofuCurry();
    step(recipe, 4).activeMinutes = 4;
    assert.ok(hard(validate(recipe), 'timing').some((m) => /Step 4 .* add up to 10 min .* timed at 4 min/.test(m)));
  });

  test('waiting written in the text but not counted as passive time is a hard failure', () => {
    const recipe = validTofuCurry();
    step(recipe, 1).passiveMinutes = 0;
    step(recipe, 1).activeMinutes = 20;
    assert.ok(hard(validate(recipe), 'timing').some((m) => /Step 1 includes 15 min of waiting \(marinat/.test(m)));
  });

  test('a step that uses "soaked" chillies needs an earlier soaking step', () => {
    const recipe = validTofuCurry();
    step(recipe, 4).instructions[0] = 'Lower the heat to medium, add 3 tbsp vegan red curry paste and the soaked chillies, and stir for 2 minutes until fragrant.';
    assert.ok(hard(validate(recipe), 'timing').some((m) => /uses "soaked chillies", but no earlier step says to soak it/.test(m)));
  });
});

describe('quality gate', () => {
  test('a hard failure caps the score and fails the gate even when every section is present', () => {
    const recipe = validTofuCurry();
    ing(recipe, 'lime_juice').quantity = 1;
    const r = validate(recipe);
    assert.equal(r.quality.status, 'failed');
    assert.ok(r.quality.score <= 5.9);
    assert.ok(r.quality.hardFailures.length >= 1);
  });

  test('a recipe missing its dish-defining ingredients loses authenticity', () => {
    const recipe = validTofuCurry();
    const r = validateAndCorrectRecipe(recipe, { mode: 'generate', dishProfile: { primaryIngredients: ['red curry paste', 'coconut milk', 'chicken', 'fish sauce'], signatureFlavorings: ['thai basil'] } });
    assert.ok(r.quality.categories.authenticity.score < 80);
  });
});

describe('image brief', () => {
  test('a chicken dish is never told to avoid chicken ("Non-Vegetarian" contains "Vegetarian")', () => {
    const recipe = validTofuCurry();
    recipe.dish_name = 'Red Thai Curry with Chicken';
    recipe.ingredients.find((i) => i.ref === 'tofu').name = 'Chicken breast';
    const brief = validateAndCorrectRecipe(recipe, { mode: 'read' }).recipe.details.imageBrief;
    assert.ok(!brief.avoid.includes('chicken'), JSON.stringify(brief.avoid));
    assert.ok(brief.mainIngredients.includes('Chicken breast'));
  });

  test('a tofu curry photo must show tofu, red curry, and no chicken or green curry', () => {
    const brief = validate(validTofuCurry()).recipe.details.imageBrief;
    assert.equal(brief.mainIngredients[0], 'Firm tofu');
    assert.deepEqual(brief.colors, ['red']);
    for (const a of ['chicken', 'green curry', 'paneer']) assert.ok(brief.avoid.includes(a), a);
  });
});

describe('ingredient database matching', () => {
  test('words that change the food prevent a match instead of borrowing another record', () => {
    for (const name of ['Vegan butter', 'Light cream cheese', 'Low-fat paneer', 'Whole chicken', 'Sweetened condensed milk']) {
      assert.equal(matchIngredient(name).status, 'unmatched', name);
    }
    assert.equal(matchIngredient('Egg noodles').ingredient.id, 'ING_EGG_NOODLES_DRY');
    assert.equal(matchIngredient('Peanut butter').ingredient.id, 'ING_PEANUT_BUTTER');
    assert.equal(matchIngredient('Light coconut milk').ingredient.id, 'ING_LIGHT_COCONUT_MILK');
    assert.equal(matchIngredient('Low‑sodium tamari (gluten‑free soy sauce)').ingredient.id, 'ING_TAMARI_LOW_NA');
  });

  test('household measures use ingredient-specific USDA weights', () => {
    const g = (name, amount, unit) => toGrams(matchIngredient(name).ingredient, amount, unit).grams;
    assert.equal(g('Olive oil', 1, 'tbsp'), 13.5);
    assert.equal(g('Salt', 1, 'tsp'), 6);
    assert.equal(g('Spinach', 1, 'cup'), 30);
    assert.equal(g('Onion', 1, 'medium'), 110);
    assert.equal(g('Garlic', 2, 'clove'), 6);
    assert.equal(toGrams(matchIngredient('Paneer').ingredient, 2, 'piece').grams, null);
  });
});
