// Page_Backend/services/recipeValidator.js
import logger from '../config/logger.js';

// Valid goals, medical conditions, allergies, dietary preferences, equipment, cuisines
export const VALID_GOALS = [
  'High Protein',
  'high-protein',
  'high protein',
  'Weight Loss',
  'weight-loss',
  'weight loss',
  'Lower Calories',
  'lower-calories',
  'lower calories',
  'Heart Healthy',
  'heart-healthy',
  'heart healthy',
  'High Fiber',
  'high-fiber',
  'high fiber',
  'Gut Friendly',
  'gut-friendly',
  'gut friendly',
  'Blood Sugar Friendly',
  'blood-sugar-friendly',
  'blood sugar friendly',
  'Low Sodium',
  'low-sodium',
  'low sodium',
  'Better Digestion',
  'better-digestion',
  'better digestion',
  'Family Friendly',
  'family-friendly',
  'family friendly',
  'Low Carb',
  'low-carb',
  'low carb',
  'Gut Health',
  'gut-health',
  'gut health',
  'Anti-Inflammatory',
  'anti-inflammatory',
  'anti inflammatory'
];

export const VALID_CONDITIONS = [
  'None',
  'Diabetes',
  'Hypertension',
  'High Cholesterol',
  'Kidney Disease',
  'PCOS',
  'IBS',
  'GERD',
  'Fatty Liver',
  'Pregnancy',
  'Thyroid Disorder',
  'Food Allergies',
  'Other'
];

export const VALID_ALLERGIES = [
  'Peanut',
  'Tree Nut',
  'Dairy',
  'Egg',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
  'Wheat',
  'Gluten',
  'None'
];

export const VALID_DIETS = [
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Halal',
  'Kosher',
  'Jain',
  'Gluten Free',
  'Dairy Free',
  'Egg Free',
  'No Preference'
];

/**
 * Validates the request inputs before sending to the LLM.
 * Returns an object with { isValid, error }
 */
export const validateInputs = (inputs) => {
  const {
    dish,
    goals = [],
    medicalConditions = [],
    allergies = [],
    dietaryPreferences = 'No Preference',
    servings
  } = inputs;

  if (!dish || typeof dish !== 'string' || dish.trim() === '') {
    return { isValid: false, error: 'Dish name is required and must be a string.' };
  }

  if (!Array.isArray(goals) || goals.length === 0) {
    return { isValid: false, error: 'At least one goal is required.' };
  }

  if (goals.length > 3) {
    return { isValid: false, error: 'Maximum of 3 goals can be selected.' };
  }

  // Normalize legacy goal spelling to prevent crashes
  if (Array.isArray(goals)) {
    for (let i = 0; i < goals.length; i++) {
      if (goals[i] === 'High in Protein') {
        goals[i] = 'High Protein';
      }
    }
  }

  for (const goal of goals) {
    const cleanGoal = typeof goal === 'string' ? goal.trim() : '';
    if (!cleanGoal) continue;
    const isGoalValid = VALID_GOALS.some(vg => vg.toLowerCase() === cleanGoal.toLowerCase());
    if (!isGoalValid) {
      logger.warn(`Unrecognized goal received: "${goal}". Registering dynamically.`);
      VALID_GOALS.push(goal);
    }
  }

  if (medicalConditions && !Array.isArray(medicalConditions)) {
    return { isValid: false, error: 'Medical conditions must be an array of strings.' };
  }

  if (allergies && !Array.isArray(allergies)) {
    return { isValid: false, error: 'Allergies must be an array of strings.' };
  }

  if (dietaryPreferences) {
    const cleanDiet = typeof dietaryPreferences === 'string' ? dietaryPreferences.trim() : '';
    const isDietValid = VALID_DIETS.some(vd => vd.toLowerCase() === cleanDiet.toLowerCase());
    if (!isDietValid) {
      logger.warn(`Unrecognized dietary preference received: "${dietaryPreferences}". Proceeding with AI generation fallback.`);
    }
  }

  if (servings && (typeof servings !== 'number' || servings <= 0)) {
    return { isValid: false, error: 'Servings must be a positive number.' };
  }

  return { isValid: true };
};

/**
 * Pre-generation contradiction check.
 * Catches early conflicts in parameters before hitting the LLM.
 */
export const checkPreContradictions = (inputs) => {
  const { dish, goals = [], medicalConditions = [], allergies = [], dietaryPreferences } = inputs;
  const dishLower = dish.toLowerCase();

  const warnings = [];
  const errors = [];

  // 1. Peanut Allergy vs Peanut Dish
  if (allergies.includes('Peanut') && (dishLower.includes('peanut') || dishLower.includes('satay'))) {
    errors.push('Conflict: Dish requested contains peanuts, but Peanut Allergy is selected.');
  }

  // 2. Vegan/Vegetarian vs Meat Dish
  const meatKeywords = ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'mutton', 'lamb', 'prawn', 'salmon', 'tuna', 'seafood', 'bacon', 'turkey', 'steak'];
  const hasMeat = meatKeywords.some(kw => dishLower.includes(kw));
  if (hasMeat) {
    if (dietaryPreferences === 'Vegan') {
      warnings.push(`Notice: You requested "${dish}" (which traditionally contains meat/seafood) but have a Vegan preference. We will substitute the meat with a plant-based protein (like Tofu, Tempeh, or Seitan).`);
    } else if (dietaryPreferences === 'Vegetarian') {
      warnings.push(`Notice: You requested "${dish}" (which traditionally contains meat/seafood) but have a Vegetarian preference. We will substitute the meat with a vegetarian protein (like Paneer, Lentils, or Tofu).`);
    } else if (dietaryPreferences === 'Jain') {
      warnings.push(`Notice: You requested "${dish}" (which traditionally contains meat/seafood) but have a Jain preference. We will substitute the meat with a Jain-compliant protein and ensure no root vegetables are used.`);
    }
  }

  // 3. Kidney Disease + High Protein Goal
  if (medicalConditions.includes('Kidney Disease') && goals.includes('High Protein')) {
    warnings.push("Protein intake should be individualized for kidney disease. We'll provide moderate-protein recipes and recommend discussing specific protein targets with your healthcare provider.");
  }

  // 4. Low Sodium + Soy Sauce dish
  if ((goals.includes('Low Sodium') || medicalConditions.includes('Hypertension')) && (dishLower.includes('soy sauce') || dishLower.includes('teriyaki'))) {
    warnings.push("Notice: This dish traditionally relies on high-sodium sauces. We will substitute with coconut aminos or low-sodium tamari to keep sodium within safe limits.");
  }

  // 5. Gluten Free / Wheat Allergy vs Pasta/Wheat dish
  const glutenFreeAllergies = allergies.includes('Wheat') || allergies.includes('Gluten') || dietaryPreferences === 'Gluten Free';
  if (glutenFreeAllergies && (dishLower.includes('pasta') || dishLower.includes('bread') || dishLower.includes('spaghetti') || dishLower.includes('roti') || dishLower.includes('naan') || dishLower.includes('pizza') || dishLower.includes('noodles'))) {
    warnings.push(`Notice: You requested a wheat/gluten-based dish, but have gluten/wheat restrictions. We will generate a gluten-free remake using alternative grains (like quinoa, brown rice, chickpea pasta, or gluten-free flour).`);
  }

  return {
    hasErrors: errors.length > 0,
    errors,
    warnings
  };
};

/* Modular Validator Subunits */

export const validateAllergiesModule = (recipe, allergies) => {
  const errors = [];
  const ingredientsList = (recipe.ingredients || []).map(ing => (ing.name || '').toLowerCase());
  const stepsList = (recipe.steps || []).map(step => {
    if (typeof step === 'string') return step.toLowerCase();
    const title = (step.title || '').toLowerCase();
    const insts = (step.instructions || []).map(i => i.toLowerCase()).join(' ');
    return `${title} ${insts}`;
  });
  const allText = [...ingredientsList, ...stepsList].join(' ');

  if (allergies.length > 0 && !allergies.includes('None')) {
    for (const allergy of allergies) {
      if (allergy === 'Peanut') {
        if (allText.includes('peanut')) {
          errors.push('Contains allergen: Peanut');
        }
      }
      if (allergy === 'Tree Nut') {
        const nuts = ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut'];
        for (const nut of nuts) {
          if (allText.includes(nut)) {
            errors.push(`Contains allergen: Tree Nut (${nut})`);
            break;
          }
        }
      }
      if (allergy === 'Dairy') {
        const dairyTerms = ['milk', 'butter', 'cheese', 'yogurt', 'cream', 'ghee', 'whey', 'casein', 'paneer', 'dairy'];
        for (const d of dairyTerms) {
          if (allText.includes(d)) {
            const regex = new RegExp(`\\b${d}\\b`, 'i');
            if (regex.test(allText)) {
              const isAlternative = (d === 'milk' && (allText.includes('almond milk') || allText.includes('coconut milk') || allText.includes('soy milk') || allText.includes('oat milk') || allText.includes('plant milk'))) ||
                                    (d === 'butter' && allText.includes('vegan butter')) ||
                                    (d === 'cheese' && allText.includes('vegan cheese'));
              if (!isAlternative) {
                errors.push(`Contains allergen: Dairy (${d})`);
                break;
              }
            }
          }
        }
      }
      if (allergy === 'Egg') {
        if (allText.includes('egg') || allText.includes('mayo') || allText.includes('albumen')) {
          errors.push('Contains allergen: Egg');
        }
      }
      if (allergy === 'Soy') {
        const soyTerms = ['soy', 'tofu', 'edamame', 'tempeh', 'miso', 'tamari'];
        for (const s of soyTerms) {
          if (allText.includes(s)) {
            errors.push(`Contains allergen: Soy (${s})`);
            break;
          }
        }
      }
      if (allergy === 'Fish') {
        const fishTerms = ['salmon', 'tuna', 'cod', 'halibut', 'trout', 'sardine', 'anchovy', 'fish', 'sea bass', 'mackerel'];
        for (const f of fishTerms) {
          if (allText.includes(f)) {
            errors.push(`Contains allergen: Fish (${f})`);
            break;
          }
        }
      }
      if (allergy === 'Shellfish') {
        const sfTerms = ['shrimp', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop', 'prawn', 'shellfish'];
        for (const sf of sfTerms) {
          if (allText.includes(sf)) {
            errors.push(`Contains allergen: Shellfish (${sf})`);
            break;
          }
        }
      }
      if (allergy === 'Sesame') {
        if (allText.includes('sesame') || allText.includes('tahini')) {
          errors.push('Contains allergen: Sesame');
        }
      }
      if (allergy === 'Wheat') {
        if (allText.includes('wheat') || (allText.includes('flour') && !allText.includes('almond flour') && !allText.includes('coconut flour') && !allText.includes('gluten-free flour') && !allText.includes('chickpea flour') && !allText.includes('oat flour') && !allText.includes('rice flour'))) {
          errors.push('Contains allergen: Wheat');
        }
      }
      if (allergy === 'Gluten') {
        const glutenTerms = ['wheat', 'barley', 'rye', 'semolina', 'spelt', 'roti', 'naan', 'pasta', 'bread', 'noodles'];
        for (const g of glutenTerms) {
          if (allText.includes(g)) {
            const isGF = allText.includes(`gluten-free ${g}`) || allText.includes(`gf ${g}`) || allText.includes('gluten free') || (g === 'pasta' && allText.includes('chickpea pasta')) || (g === 'flour' && (allText.includes('almond flour') || allText.includes('coconut flour') || allText.includes('chickpea flour')));
            if (!isGF) {
              errors.push(`Contains allergen: Gluten (${g})`);
              break;
            }
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateDietModule = (recipe, dietaryPreferences) => {
  const errors = [];
  const ingredientsList = (recipe.ingredients || []).map(ing => (ing.name || '').toLowerCase());
  const stepsList = (recipe.steps || []).map(step => {
    if (typeof step === 'string') return step.toLowerCase();
    const title = (step.title || '').toLowerCase();
    const insts = (step.instructions || []).map(i => i.toLowerCase()).join(' ');
    return `${title} ${insts}`;
  });
  const allText = [...ingredientsList, ...stepsList].join(' ');

  if (dietaryPreferences && dietaryPreferences !== 'No Preference') {
    if (dietaryPreferences === 'Vegan') {
      const animalTerms = ['chicken', 'beef', 'pork', 'mutton', 'lamb', 'fish', 'shrimp', 'prawn', 'crab', 'lobster', 'seafood', 'egg', 'milk', 'butter', 'cheese', 'yogurt', 'cream', 'ghee', 'honey', 'lard', 'paneer'];
      for (const term of animalTerms) {
        if (allText.includes(term)) {
          const isAlternative = (term === 'milk' && (allText.includes('almond milk') || allText.includes('coconut milk') || allText.includes('soy milk') || allText.includes('oat milk') || allText.includes('plant milk'))) ||
                                (term === 'butter' && allText.includes('vegan butter')) ||
                                (term === 'cheese' && allText.includes('vegan cheese'));
          if (!isAlternative) {
            errors.push(`Vegan restriction violation: Contains animal product "${term}"`);
            break;
          }
        }
      }
    } else if (dietaryPreferences === 'Vegetarian') {
      const meatTerms = ['chicken', 'beef', 'pork', 'mutton', 'lamb', 'fish', 'shrimp', 'prawn', 'crab', 'lobster', 'seafood', 'bacon', 'turkey', 'lard'];
      for (const term of meatTerms) {
        if (allText.includes(term)) {
          errors.push(`Vegetarian restriction violation: Contains meat "${term}"`);
          break;
        }
      }
    } else if (dietaryPreferences === 'Pescatarian') {
      const meatTerms = ['chicken', 'beef', 'pork', 'mutton', 'lamb', 'bacon', 'turkey', 'lard'];
      for (const term of meatTerms) {
        if (allText.includes(term)) {
          errors.push(`Pescatarian restriction violation: Contains meat product "${term}"`);
          break;
        }
      }
    } else if (dietaryPreferences === 'Jain') {
      const jainForbidden = ['chicken', 'beef', 'pork', 'fish', 'seafood', 'egg', 'onion', 'garlic', 'potato', 'ginger', 'carrot', 'radish', 'beetroot', 'sweet potato'];
      for (const term of jainForbidden) {
        if (allText.includes(term)) {
          errors.push(`Jain restriction violation: Contains forbidden root or animal ingredient "${term}"`);
          break;
        }
      }
    } else if (dietaryPreferences === 'Gluten Free') {
      const glutenTerms = ['wheat', 'barley', 'rye', 'semolina', 'spelt', 'roti', 'naan', 'pasta', 'bread', 'breadcrumbs'];
      for (const g of glutenTerms) {
        if (allText.includes(g)) {
          const isGF = allText.includes(`gluten-free ${g}`) || allText.includes(`gf ${g}`) || allText.includes('gluten free') || (g === 'pasta' && allText.includes('chickpea pasta')) || (g === 'flour' && (allText.includes('almond flour') || allText.includes('coconut flour') || allText.includes('chickpea flour')));
          if (!isGF) {
            errors.push(`Gluten Free restriction violation: Contains gluten ingredient "${g}"`);
            break;
          }
        }
      }
    } else if (dietaryPreferences === 'Dairy Free') {
      const dairyTerms = ['milk', 'butter', 'cheese', 'yogurt', 'cream', 'ghee', 'whey', 'casein', 'paneer', 'dairy'];
      for (const d of dairyTerms) {
        if (allText.includes(d)) {
          const regex = new RegExp(`\\b${d}\\b`, 'i');
          if (regex.test(allText)) {
            const isAlternative = (d === 'milk' && (allText.includes('almond milk') || allText.includes('coconut milk') || allText.includes('soy milk') || allText.includes('oat milk') || allText.includes('plant milk'))) ||
                                  (d === 'butter' && allText.includes('vegan butter')) ||
                                  (d === 'cheese' && allText.includes('vegan cheese'));
            if (!isAlternative) {
              errors.push(`Dairy Free restriction violation: Contains dairy product "${d}"`);
              break;
            }
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateMedicalModule = (recipe, medicalConditions, goals) => {
  const errors = [];
  const warnings = [];
  const parseNum = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const match = val.toString().replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const protein = parseNum(recipe.protein);
  const sodium = parseNum(recipe.sodium);
  const ingredientsList = (recipe.ingredients || []).map(ing => (ing.name || '').toLowerCase());
  const stepsList = (recipe.steps || []).map(step => {
    if (typeof step === 'string') return step.toLowerCase();
    const title = (step.title || '').toLowerCase();
    const insts = (step.instructions || []).map(i => i.toLowerCase()).join(' ');
    return `${title} ${insts}`;
  });
  const allText = [...ingredientsList, ...stepsList].join(' ');

  // Hypertension / Low Sodium
  const hasHypertension = medicalConditions.includes('Hypertension') || goals.includes('Low Sodium') || goals.includes('low-sodium') || goals.includes('low sodium');
  if (hasHypertension) {
    if (sodium > 400) {
      errors.push(`Medical (Hypertension) violation: Sodium is ${sodium}mg per serving (target is <400mg).`);
    }
    if (allText.includes('soy sauce') && !allText.includes('low-sodium') && !allText.includes('low sodium') && !allText.includes('aminos')) {
      errors.push('Medical (Hypertension) violation: Recipe includes regular high-sodium soy sauce.');
    }
  }

  // Diabetes / Blood Sugar Friendly
  const hasDiabetes = medicalConditions.includes('Diabetes') || goals.includes('Blood Sugar Friendly') || goals.includes('blood sugar friendly');
  if (hasDiabetes) {
    const sugaryTerms = ['sugar', 'honey', 'maple syrup', 'agave', 'brown sugar', 'corn syrup'];
    for (const s of sugaryTerms) {
      if (allText.includes(s)) {
        const regex = new RegExp(`\\b${s}\\b`, 'i');
        if (regex.test(allText)) {
          errors.push(`Medical (Diabetes) violation: Recipe contains sweetener "${s}".`);
          break;
        }
      }
    }
  }

  // Kidney Disease
  const hasKidneyDisease = medicalConditions.includes('Kidney Disease');
  if (hasKidneyDisease) {
    if (protein > 25) {
      errors.push(`Medical (Kidney Disease) restriction: Protein is too high (${protein}g, target is <25g per serving).`);
    }
  }

  // IBS / GERD
  const hasIbsOrGerd = medicalConditions.includes('IBS') || medicalConditions.includes('GERD');
  if (hasIbsOrGerd) {
    const triggers = ['cayenne', 'chili powder', 'jalapeno', 'chilli', 'hot sauce', 'black pepper', 'caffeine', 'mint'];
    for (const t of triggers) {
      if (allText.includes(t)) {
        warnings.push(`IBS/GERD warning: Contains potential trigger "${t}".`);
      }
    }
    if (medicalConditions.includes('IBS')) {
      if (allText.includes('onion') || allText.includes('garlic')) {
        warnings.push('IBS warning: Contains onion/garlic (high FODMAPs). Prefer chives/hing.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateGoalsModule = (recipe, goals, medicalConditions) => {
  const warnings = [];
  const parseNum = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const match = val.toString().replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const protein = parseNum(recipe.protein);
  const fiber = parseNum(recipe.fiber);
  const calories = parseNum(recipe.calories);
  const hasKidneyDisease = medicalConditions.includes('Kidney Disease');

  if (goals.includes('High Protein') || goals.includes('high protein')) {
    if (!hasKidneyDisease && protein < 20) {
      warnings.push(`Goal (High Protein) alert: Protein is only ${protein}g (target >=20g).`);
    }
  }
  if (goals.includes('High Fiber') || goals.includes('high fiber') || goals.includes('High Fibre')) {
    if (fiber < 5) {
      warnings.push(`Goal (High Fiber) alert: Fiber is only ${fiber}g (target >=5g).`);
    }
  }
  if ((goals.includes('Lower Calories') || goals.includes('lower calories')) && calories > 550) {
    warnings.push(`Goal (Lower Calories) alert: Calories are ${calories} kcal (target <=550 kcal).`);
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
};

export const validateNutritionRangeModule = (recipe) => {
  const warnings = [];
  const parseNum = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const match = val.toString().replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const calories = parseNum(recipe.calories);
  if (calories > 0 && calories < 150) {
    warnings.push(`Nutrition warning: Extremely low calories (${calories} kcal per serving).`);
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
};

export const validateEvidenceModule = (recipe, evidenceSummary) => {
  const warnings = [];
  const ingredientsList = (recipe.ingredients || []).map(ing => (ing.name || '').toLowerCase());
  const stepsList = (recipe.steps || []).map(step => {
    if (typeof step === 'string') return step.toLowerCase();
    const title = (step.title || '').toLowerCase();
    const insts = (step.instructions || []).map(i => i.toLowerCase()).join(' ');
    return `${title} ${insts}`;
  });
  const allText = [...ingredientsList, ...stepsList].join(' ');

  const evLower = (evidenceSummary || '').toLowerCase();
  
  if (evLower.includes('low sodium') || evLower.includes('limit sodium')) {
    const sodiumVal = recipe.sodium ? parseInt(recipe.sodium) : 0;
    if (sodiumVal > 500) {
      warnings.push(`Evidence alignment: Guidelines suggest low sodium, but recipe has ${sodiumVal}mg.`);
    }
  }
  if (evLower.includes('low glycemic') || evLower.includes('added sugars')) {
    if (allText.includes('sugar') || allText.includes('syrup')) {
      warnings.push("Evidence alignment: Guidelines recommend avoiding added sugars, sweetener detected.");
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
};

export const validateCuisineModule = (recipe, cuisine) => {
  const warnings = [];
  if (cuisine && cuisine !== 'Healthy') {
    const cuisineLower = cuisine.toLowerCase();
    const dishNameLower = (recipe.dish_name || '').toLowerCase();
    const recCuisineLower = (recipe.cuisine || '').toLowerCase();
    if (!dishNameLower.includes(cuisineLower) && !recCuisineLower.includes(cuisineLower)) {
      warnings.push(`Cuisine check: Recipe cuisine (${recipe.cuisine || 'Generic'}) does not match target cuisine "${cuisine}".`);
    }
  }
  return {
    isValid: warnings.length === 0,
    warnings
  };
};

/**
 * Checks that the final recipe still resembles the dish the user asked for —
 * i.e. its traditional/identity-defining ingredients weren't silently dropped
 * in the name of "healthifying" it (e.g. "Rajma Chawal" losing its kidney
 * beans and rice). An ingredient is allowed to be missing only if the
 * optimization plan recorded an explicit, reasoned swap for it.
 */
// Generic category words that are too broad to prove a match on their own —
// "Kidney beans" and "Lima Beans" both contain "beans", but that shouldn't
// count as the same ingredient. Only used to de-weight a token; the more
// specific word(s) in the ingredient name (e.g. "kidney", "rajma") still
// have to actually appear for a match.
const GENERIC_FOOD_WORDS = new Set([
  'bean', 'beans', 'rice', 'oil', 'sauce', 'curry', 'gravy', 'powder',
  'leaves', 'leaf', 'paste', 'seed', 'seeds', 'meat', 'spice', 'spices',
  'masala', 'stew', 'soup', 'vegetable', 'vegetables', 'flour', 'milk',
  'cream', 'butter', 'cheese', 'sugar', 'salt'
]);

export const validateDishIdentityModule = (recipe, primaryIngredients = [], optimizationPlan = {}) => {
  const warnings = [];

  if (!primaryIngredients || primaryIngredients.length === 0) {
    return { isValid: true, warnings, missingCount: 0 };
  }

  const approvedSwaps = (optimizationPlan.swaps || []).map(s => (s.originalIngredient || '').toLowerCase());
  const finalIngredientsText = (recipe.ingredients || []).map(ing => (ing.name || '').toLowerCase()).join(' | ');

  let missingCount = 0;
  for (const original of primaryIngredients) {
    const originalLower = (original || '').toLowerCase();
    if (!originalLower) continue;

    const tokens = originalLower.split(/[^a-z]+/).filter(t => t.length > 2);
    // Prefer the specific/distinctive tokens; only fall back to the generic
    // ones if that's all the ingredient name has (e.g. "Rice" on its own).
    const specificTokens = tokens.filter(t => !GENERIC_FOOD_WORDS.has(t));
    const matchTokens = specificTokens.length > 0 ? specificTokens : tokens;

    const isPresent = finalIngredientsText.includes(originalLower) || matchTokens.some(t => finalIngredientsText.includes(t));
    const wasApprovedSwap = approvedSwaps.some(swap =>
      swap.includes(originalLower) || originalLower.includes(swap) || matchTokens.some(t => swap.includes(t))
    );

    if (!isPresent && !wasApprovedSwap) {
      missingCount++;
      warnings.push(`Dish identity check: Traditional ingredient "${original}" is missing from the final recipe with no documented swap reason — it may no longer resemble "${recipe.dish_name}".`);
    }
  }

  return {
    isValid: missingCount === 0,
    warnings,
    missingCount
  };
};

/**
 * End-To-End validation orchestrator.
 * Combines separate validator sub-modules to compute a weighted safety confidence rating.
 */
export const validateGeneratedRecipe = (recipe, inputs, evidenceSummary = '', recipeUnderstanding = {}) => {
  const {
    goals = [],
    medicalConditions = [],
    allergies = [],
    dietaryPreferences = 'No Preference',
    dislikedIngredients = [],
    cuisine = ''
  } = inputs;

  const checks = {
    allergies: true,
    medicalRestrictions: true,
    nutritionGoals: true,
    dietaryPreference: true,
    ingredientAvailability: true,
    dishIdentity: true
  };

  let errors = [];
  let warnings = [];

  // Ensure ingredients and steps are not empty
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    errors.push('Recipe validation failed: Ingredients list is empty.');
  }
  if (!recipe.steps || recipe.steps.length === 0) {
    errors.push('Recipe validation failed: Steps list is empty.');
  }

  // Run modular sub-validators
  const allergyRes = validateAllergiesModule(recipe, allergies);
  const dietRes = validateDietModule(recipe, dietaryPreferences);
  const medicalRes = validateMedicalModule(recipe, medicalConditions, goals);
  const goalsRes = validateGoalsModule(recipe, goals, medicalConditions);
  const nutritionRes = validateNutritionRangeModule(recipe);
  const evidenceRes = validateEvidenceModule(recipe, evidenceSummary);
  const cuisineRes = validateCuisineModule(recipe, cuisine);
  const identityRes = validateDishIdentityModule(recipe, recipeUnderstanding.primaryIngredients, recipe.optimization_plan);

  // Accumulate issues
  errors = [...errors, ...allergyRes.errors, ...dietRes.errors, ...medicalRes.errors];
  warnings = [...warnings, ...medicalRes.warnings, ...goalsRes.warnings, ...nutritionRes.warnings, ...evidenceRes.warnings, ...cuisineRes.warnings, ...identityRes.warnings];

  // Disliked Ingredients check
  const ingredientsList = (recipe.ingredients || []).map(ing => (ing.name || '').toLowerCase());
  const stepsList = (recipe.steps || []).map(step => {
    if (typeof step === 'string') return step.toLowerCase();
    const title = (step.title || '').toLowerCase();
    const insts = (step.instructions || []).map(i => i.toLowerCase()).join(' ');
    return `${title} ${insts}`;
  });
  const allText = [...ingredientsList, ...stepsList].join(' ');
  if (dislikedIngredients && dislikedIngredients.length > 0) {
    for (const item of dislikedIngredients) {
      const cleaned = item.trim().toLowerCase();
      if (cleaned && allText.includes(cleaned)) {
        errors.push(`Disliked ingredient included: "${item}"`);
      }
    }
  }

  // Update check states
  checks.allergies = allergyRes.isValid;
  checks.dietaryPreference = dietRes.isValid;
  checks.medicalRestrictions = medicalRes.isValid;
  checks.nutritionGoals = goalsRes.isValid && nutritionRes.isValid;
  checks.ingredientAvailability = dislikedIngredients.length === 0 || !errors.some(e => e.includes('Disliked'));
  checks.dishIdentity = identityRes.isValid;

  // Calculate Weighted Confidence Score:
  // - Allergy: 25%
  // - Medical: 25%
  // - Goal: 15%
  // - Nutrition Range: 10%
  // - Evidence Match: 5%
  // - Dish Identity (stays recognizable as the requested dish): 20%
  let allergyWeight = allergyRes.isValid && dietRes.isValid ? 25 : 0;
  let medicalWeight = medicalRes.isValid ? 25 : 0;
  let goalWeight = goalsRes.isValid ? 15 : Math.max(0, 15 - goalsRes.warnings.length * 4);
  let nutritionWeight = nutritionRes.isValid ? 10 : 5;
  let evidenceWeight = evidenceRes.isValid ? 5 : Math.max(0, 5 - evidenceRes.warnings.length * 2);
  let identityWeight = identityRes.isValid ? 20 : Math.max(0, 20 - identityRes.missingCount * 7);

  let confidence = allergyWeight + medicalWeight + goalWeight + nutritionWeight + evidenceWeight + identityWeight;

  return {
    isValid: errors.length === 0,
    confidence,
    checks,
    errors,
    warnings
  };
};
