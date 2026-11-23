// Diet, allergen, substitution and food-safety checks.
//
// Diet and allergen facts come from the ingredient database record of each
// ingredient (its animal origin, allergens, gluten and "may contain" notes).
// Ingredients without a record fall back to name patterns, so an unmatched
// "anchovy paste" is still recognised as fish. Commercial products whose
// composition depends on the brand (Thai curry pastes, oyster sauce) must be
// named as a safe product in vegetarian/vegan recipes — they are never
// assumed to be vegetarian.

import { matchIngredient, getIngredient, normalizeName } from './ingredientDb.js';

// Name patterns, used for ingredients with no database record.
const PATTERNS = {
  meat: /\b(beef|pork|mutton|lamb|goat|veal|bacon|ham|sausages?|salami|pepperoni|prosciutto|chorizo|lard|gelatine?|bone broth|meat|keema)\b/,
  poultry: /\b(chicken|turkey|duck|goose|quail)\b/,
  fish: /\b(fish|salmon|tuna|cod|tilapia|basa|haddock|mackerel|sardines?|anchov(?:y|ies)|trout|halibut|bonito|dashi|katsuobushi|worcestershire)\b/,
  shellfish: /\b(shrimps?|prawns?|crabs?|lobsters?|clams?|mussels?|oysters?|scallops?|squid|calamari|octopus|shrimp paste|belacan|kapi|oyster sauce)\b/,
  egg: /\b(eggs?|egg whites?|egg yolks?|mayonnaise|mayo|meringue|aioli)\b/,
  dairy: /\b(milk|butter|ghee|cheese|paneer|yog(?:h)?urt|curd|dahi|cream|whey|casein|khoya|khoa|buttermilk|parmesan|mozzarella|cheddar|feta|ricotta|mascarpone|malai|lassi|raita)\b/,
  honey: /\bhoney\b/,
  gluten: /\b(wheat|atta|maida|semolina|sooji|suji|rava|barley|rye|spelt|farro|bulgur|couscous|seitan|bread|breadcrumbs|panko|naan|roti|chapati|paratha|pasta|spaghetti|noodles|flour|soy sauce|shoyu|teriyaki|hoisin|malt|beer|asafoetida|hing|stock cubes?|bouillon)\b/,
};
// Phrases that look like an animal/gluten word but are not.
const EXCEPTIONS = {
  meat: /\b(jackfruit meat|plant[- ]based meat|meat[- ]free|mock meat|vegan \w+|vegetarian \w+|coconut meat)\b/g,
  poultry: /\b(chicken[- ]free|no[- ]chicken|vegan chicken|chickpeas?)\b/g,
  fish: /\b(vegan|vegetarian|fish[- ]free) (fish sauce|worcestershire( sauce)?)\b|\bfish[- ]free\b/g,
  shellfish: /\b(vegetarian|vegan|mushroom) oyster sauce\b|\boyster mushrooms?\b/g,
  egg: /\beggless\b|\begg[- ]free\b|\bvegan (mayo(nnaise)?|aioli|eggs?)\b|\beggplants?\b|\b(plant[- ]based|vegan|flax|chia) eggs?\b|\begg (substitute|replacer)\b/g,
  dairy: /\b(coconut|almond|soy|oat|rice|cashew|hemp|plant[- ]based|plant|vegan|dairy[- ]free) (milk|cream|yog(h)?urt|curd|butter|cheese|ghee)\b|\b(peanut|almond|cashew|nut|seed|sunflower|cocoa|apple) butter\b|\bbutter (beans?|lettuce|squash)\b|\bbutternut\b|\bcream of tartar\b|\bcoconut cream\b|\bnutritional yeast\b/g,
  honey: /\bhoney(dew| mushrooms?)\b/g,
  gluten: /\bgluten[- ]free [a-z ]+|\b(rice|chickpea|gram|almond|coconut|corn|tapioca|buckwheat|quinoa|oat|millet|sorghum|jowar|bajra|ragi|potato|cassava) (flour|noodles|pasta)\b|\bcornflour\b|\bbesan\b|\btamari\b|\bcoconut aminos\b|\bglass noodles\b|\bbuckwheat\b|\bzucchini noodles\b/g,
};
const SAFE_LABEL = /\b(vegan|vegetarian|plant[- ]based|no shrimp|without shrimp|shrimp[- ]paste[- ]free|fish[- ]sauce[- ]free|no fish|mushroom[- ]based|homemade)\b/i;

const ANIMAL_KEYS = ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'honey'];
const ALLERGEN_LABEL = { milk: 'Milk', egg: 'Egg', fish: 'Fish', shellfish: 'Shellfish (crustacean)', 'tree nuts': 'Tree nuts', peanuts: 'Peanuts', wheat: 'Wheat (gluten)', soy: 'Soy', sesame: 'Sesame', mustard: 'Mustard', celery: 'Celery' };
const ALLERGY_TO_KEYS = {
  dairy: ['milk'], milk: ['milk'], lactose: ['milk'], egg: ['egg'], eggs: ['egg'], fish: ['fish'], shellfish: ['shellfish'], seafood: ['fish', 'shellfish'],
  nuts: ['tree nuts', 'peanuts'], 'tree nuts': ['tree nuts'], peanut: ['peanuts'], peanuts: ['peanuts'], gluten: ['wheat'], wheat: ['wheat'], soy: ['soy'], sesame: ['sesame'], mustard: ['mustard'],
};

/** Diet-relevant facts for one ingredient line (database first, name patterns as fallback). */
export const ingredientFacts = (ing) => {
  const record = ing.ingredientId ? getIngredient(ing.ingredientId) : (matchIngredient(ing.name).ingredient || null);
  const label = `${ing.name} ${ing.prep || ''}`.toLowerCase().replace(/[‐‑‒−]/g, '-');
  const labelledSafe = SAFE_LABEL.test(label);
  const facts = { animal: new Set(), allergens: new Set(), gluten: false, glutenCrossContact: false, mayContain: new Set(), rennet: false, record };
  if (record) {
    if (record.animal) facts.animal.add(record.animal);
    record.allergens.forEach((a) => facts.allergens.add(a));
    if (record.gluten === true) facts.gluten = true;
    if (record.gluten === 'cross-contact' && !/certified gluten[- ]free|gluten[- ]free/.test(label)) facts.glutenCrossContact = true;
    if (!labelledSafe) record.mayContain.forEach((m) => facts.mayContain.add(m));
    facts.rennet = record.rennet && !/vegetarian|microbial rennet|rennet[- ]free/.test(label);
  }
  // Patterns catch animal products the record doesn't describe (and unmatched lines).
  const cleaned = label.replace(/\([^)]*\b(alternative|substitute|instead of)\b[^)]*\)/g, ' ').replace(/\b(no|without|free of|free from)\s+[a-z' -]+?(?=[),;:.]|$)/g, ' ');
  for (const key of ANIMAL_KEYS) {
    if (PATTERNS[key].test(cleaned.replace(EXCEPTIONS[key], ' '))) {
      if (!(record && !record.animal && labelledSafe)) facts.animal.add(key);
    }
  }
  if (!record && PATTERNS.gluten.test(cleaned.replace(EXCEPTIONS.gluten, ' ')) && !/gluten[- ]free/.test(label)) facts.gluten = true;
  if (facts.animal.has('dairy')) facts.allergens.add('milk');
  if (facts.animal.has('egg')) facts.allergens.add('egg');
  if (facts.animal.has('fish')) facts.allergens.add('fish');
  if (facts.animal.has('shellfish')) facts.allergens.add('shellfish');
  if (facts.gluten) facts.allergens.add('wheat');
  if (!record) {
    if (/\b(soy|tofu|tempeh|edamame|miso|tamari)\b/.test(cleaned)) facts.allergens.add('soy');
    if (/\bpeanuts?\b|\bgroundnut/.test(cleaned)) facts.allergens.add('peanuts');
    if (/\b(almonds?|cashews?|walnuts?|pistachios?|pecans?|hazelnuts?|macadamias?|pine nuts?)\b/.test(cleaned)) facts.allergens.add('tree nuts');
    if (/\b(sesame|tahini)\b/.test(cleaned)) facts.allergens.add('sesame');
  }
  return facts;
};

const dietOf = (factsList) => {
  const has = (k) => factsList.some((f) => f.facts.animal.has(k));
  const may = (k) => factsList.some((f) => f.facts.mayContain.has(k));
  const names = (pred) => factsList.filter(pred).map((f) => f.ing.name);
  const why = {
    vegetarian: names((f) => ['meat', 'poultry', 'fish', 'shellfish'].some((k) => f.facts.animal.has(k) || f.facts.mayContain.has(k)) || f.facts.rennet),
    vegan: names((f) => ANIMAL_KEYS.some((k) => f.facts.animal.has(k) || f.facts.mayContain.has(k)) || f.facts.rennet),
    pescatarian: names((f) => f.facts.animal.has('meat') || f.facts.animal.has('poultry')),
    glutenFree: names((f) => f.facts.gluten || f.facts.glutenCrossContact || f.facts.mayContain.has('wheat')),
    dairyFree: names((f) => f.facts.animal.has('dairy')),
    eggFree: names((f) => f.facts.animal.has('egg')),
  };
  return {
    is: Object.fromEntries(Object.entries(why).map(([k, v]) => [k, v.length === 0])),
    why,
    flags: { meat: has('meat') || has('poultry'), fish: has('fish') || may('fish'), shellfish: has('shellfish') || may('shellfish') },
  };
};

const PRETTY = { vegetarian: 'Vegetarian', vegan: 'Vegan', pescatarian: 'Pescatarian', glutenFree: 'Gluten-Free', dairyFree: 'Dairy-Free', eggFree: 'Egg-Free' };
const TAG_KEY = (tag) => {
  const t = String(tag).toLowerCase().replace(/[‐‑‒−_]/g, '-').trim();
  return /^vegetarian$/.test(t) ? 'vegetarian' : /^(vegan|plant[- ]based)$/.test(t) ? 'vegan' : /^pescatarian$/.test(t) ? 'pescatarian'
    : /^gluten[- ]?free$/.test(t) ? 'glutenFree' : /^dairy[- ]?free$/.test(t) ? 'dairyFree' : /^egg[- ]?free$/.test(t) ? 'eggFree' : null;
};

/**
 * Applies diet and allergen validation to the recipe (required ingredients only;
 * optional ingredients are reported separately).
 */
export const applyDietAndAllergens = (recipe, ctx, { inputs = {}, mode = 'generate' } = {}) => {
  const details = (recipe.details = recipe.details || {});
  const required = (recipe.ingredients || []).filter((i) => !i.optional);
  const factsList = required.map((ing) => ({ ing, facts: ingredientFacts(ing) }));
  const { is, why, flags } = dietOf(factsList);
  const fail = (rule, msg) => (mode === 'generate' ? ctx.hard(rule, msg) : ctx.hard(rule, msg));

  const name = String(recipe.dish_name || '').toLowerCase();
  const requested = String(inputs.dietaryPreferences || '').toLowerCase();
  const claimedType = String(recipe.diet_type || '').toLowerCase();
  const wantsVegan = /\bvegan\b|plant[- ]based/.test(`${name} ${requested} ${claimedType}`);
  const wantsVeg = wantsVegan || /\bvegetarian\b|\bveg\b/.test(`${name} ${requested}`) || /^(vegetarian|lacto|ovo)/.test(claimedType);

  // Brand-dependent products in a vegetarian/vegan recipe must be named safely.
  for (const { ing, facts } of factsList) {
    if (wantsVeg && (facts.mayContain.has('fish') || facts.mayContain.has('shellfish'))) {
      fail('diet', `"${ing.name}" — many commercial versions contain shrimp paste or fish sauce. In a ${wantsVegan ? 'vegan' : 'vegetarian'} recipe name a safe product, e.g. "vegan ${normalizeName(ing.name)} (no shrimp paste)".`);
    }
    if (wantsVeg && facts.rennet) {
      fail('diet', `"${ing.name}" is traditionally made with animal rennet; specify a vegetarian version made with microbial rennet.`);
    }
  }

  // The user's requested diet.
  const reqKey = { vegan: 'vegan', vegetarian: 'vegetarian', 'gluten free': 'glutenFree', 'gluten-free': 'glutenFree', 'dairy free': 'dairyFree', 'dairy-free': 'dairyFree', pescatarian: 'pescatarian', 'eggetarian': null }[requested];
  if (reqKey && !is[reqKey]) fail('diet', `You asked for a ${PRETTY[reqKey]} recipe, but it contains: ${why[reqKey].join(', ')}.`);

  // Title claims.
  for (const [key, re] of [['vegan', /\bvegan\b/], ['vegetarian', /\bvegetarian\b/], ['glutenFree', /gluten[- ]free/], ['dairyFree', /dairy[- ]free/]]) {
    if (re.test(name) && !is[key]) fail('diet', `The dish name says "${PRETTY[key]}" but it contains ${why[key].join(', ')}.`);
  }

  // Allergies the user listed must be absent (including optional ingredients).
  const everything = (recipe.ingredients || []).map((ing) => ({ ing, facts: ingredientFacts(ing) }));
  for (const allergy of inputs.allergies || []) {
    const keys = ALLERGY_TO_KEYS[String(allergy).toLowerCase()] || [String(allergy).toLowerCase()];
    const hits = everything.filter((f) => keys.some((k) => f.facts.allergens.has(k) || f.facts.mayContain.has(k))).map((f) => f.ing.name);
    if (hits.length) fail('allergens', `You listed a ${allergy} allergy, but the recipe contains ${hits.join(', ')}.`);
  }

  // diet_type and dietary tags are derived from the ingredients, not trusted.
  // diet_type describes what is definitely in the recipe; brand-dependent
  // products ("may contain shrimp paste") remove the verified label and are
  // reported separately instead of turning a vegetarian curry "pescatarian".
  const definite = dietOf(factsList.map((f) => ({ ...f, facts: { ...f.facts, mayContain: new Set() } }))).is;
  const actual = definite.vegan ? 'Vegan' : definite.vegetarian ? 'Vegetarian' : definite.pescatarian ? 'Pescatarian' : 'Non-Vegetarian';
  const brandDependent = factsList.filter((f) => f.facts.mayContain.has('fish') || f.facts.mayContain.has('shellfish')).map((f) => f.ing.name);
  details.dietNote = brandDependent.length && definite.vegetarian
    ? `${actual} only if ${brandDependent.join(' and ')} ${brandDependent.length > 1 ? 'are' : 'is'} made without shrimp paste or fish sauce — check the label.`
    : '';
  if (recipe.diet_type && recipe.diet_type !== actual && !/^(none|no preference|n\/a|any)$/i.test(recipe.diet_type)) {
    const contradicts = (/vegan/i.test(recipe.diet_type) && !definite.vegan) || (/^vegetarian|lacto|ovo/i.test(recipe.diet_type) && !definite.vegetarian);
    if (contradicts) ctx.correct('diet', `Diet type changed from "${recipe.diet_type}" to "${actual}": ${why[/vegan/i.test(recipe.diet_type) ? 'vegan' : 'vegetarian'].join(', ')}.`);
  }
  recipe.diet_type = actual;

  const claimed = Array.isArray(details.dietaryTags) ? details.dietaryTags : [];
  const kept = [];
  for (const tag of claimed) {
    const key = TAG_KEY(tag);
    if (!key) { kept.push(tag); continue; }
    if (is[key]) kept.push(PRETTY[key]);
    else ctx.correct('diet', `Removed the "${tag}" label: the recipe contains ${why[key].join(', ')}.`);
  }
  for (const key of ['vegan', 'vegetarian', 'glutenFree', 'dairyFree']) {
    if (is[key] && !kept.includes(PRETTY[key]) && !(key === 'vegetarian' && kept.includes('Vegan'))) kept.push(PRETTY[key]);
  }
  details.dietaryTags = [...new Set(kept)];

  // Allergens: computed from every ingredient (optional ones noted as such).
  const contains = new Set();
  const mayContain = new Set();
  const optionalOnly = new Set();
  for (const { ing, facts } of everything) {
    for (const a of facts.allergens) (ing.optional ? optionalOnly : contains).add(a);
    for (const m of facts.mayContain) if (ALLERGEN_LABEL[m]) mayContain.add(m);
    if (facts.glutenCrossContact) mayContain.add('wheat');
  }
  for (const a of contains) optionalOnly.delete(a);
  for (const a of contains) mayContain.delete(a);
  const modelSaid = new Set((details.allergens || []).map((a) => String(a).toLowerCase()));
  for (const a of contains) {
    const label = ALLERGEN_LABEL[a] || a;
    if (![...modelSaid].some((m) => m.includes(a.split(' ')[0]) || (a === 'milk' && m.includes('dairy')) || (a === 'wheat' && m.includes('gluten')))) {
      ctx.correct('allergens', `Added allergen "${label}" from the ingredients.`);
    }
  }
  details.allergens = [...contains].map((a) => ALLERGEN_LABEL[a] || a);
  details.allergenInfo = {
    contains: details.allergens,
    mayContain: [...mayContain].map((a) => ALLERGEN_LABEL[a] || a),
    optionalIngredientsContain: [...optionalOnly].map((a) => ALLERGEN_LABEL[a] || a),
    note: mayContain.size ? 'Depends on the brand you buy — check the label.' : '',
  };
  return { is, why, flags, factsList };
};

/**
 * Substitutions must respect the user's diet and allergies, refer to an
 * ingredient that is actually in the recipe, and say when they change the
 * recipe's diet or allergens.
 */
export const applySubstitutions = (recipe, ctx, diet, { inputs = {} } = {}) => {
  const details = recipe.details || {};
  const subs = Array.isArray(details.substitutions) ? details.substitutions : [];
  const allergyKeys = (inputs.allergies || []).flatMap((a) => ALLERGY_TO_KEYS[String(a).toLowerCase()] || [String(a).toLowerCase()]);
  const ingredientWords = (recipe.ingredients || []).map((i) => normalizeName(i.name));
  const out = [];
  for (const sub of subs) {
    if (!sub || !sub.ingredient || !sub.substitute) continue;
    const target = normalizeName(sub.ingredient);
    const inRecipe = (recipe.ingredients || []).find((i) => i.ref === sub.ref)
      || (recipe.ingredients || []).find((i) => normalizeName(i.name) === target)
      || (recipe.ingredients || []).find((i) => target.split(' ').filter((w) => w.length > 2).every((w) => normalizeName(i.name).includes(w)));
    if (!inRecipe) {
      ctx.correct('substitutions', `Removed the substitution for "${sub.ingredient}": the recipe doesn't use it.`);
      continue;
    }
    const subFacts = ingredientFacts({ name: sub.substitute });
    const origFacts = ingredientFacts(inRecipe);
    if (subFacts.record && origFacts.record && subFacts.record.id === origFacts.record.id && normalizeName(sub.substitute) === normalizeName(inRecipe.name)) {
      ctx.correct('substitutions', `Removed the substitution "${sub.ingredient} → ${sub.substitute}": it is the same ingredient.`);
      continue;
    }
    const breaks = [];
    if (diet.is.vegan && ANIMAL_KEYS.some((k) => subFacts.animal.has(k))) breaks.push('not vegan');
    else if (diet.is.vegetarian && ['meat', 'poultry', 'fish', 'shellfish'].some((k) => subFacts.animal.has(k))) breaks.push('not vegetarian');
    if (diet.is.glutenFree && subFacts.gluten) breaks.push('contains gluten');
    if (diet.is.dairyFree && subFacts.animal.has('dairy')) breaks.push('contains dairy');
    const newAllergens = [...subFacts.allergens].filter((a) => !origFacts.allergens.has(a));
    const violatesUser = allergyKeys.filter((k) => subFacts.allergens.has(k));
    const requested = String(inputs.dietaryPreferences || '').toLowerCase();
    const violatesDiet = (requested === 'vegan' && breaks.includes('not vegan')) || (requested === 'vegetarian' && breaks.includes('not vegetarian'))
      || (/gluten/.test(requested) && breaks.includes('contains gluten')) || (/dairy/.test(requested) && breaks.includes('contains dairy'));
    if (violatesUser.length || violatesDiet) {
      ctx.correct('substitutions', `Removed "${sub.ingredient} → ${sub.substitute}": it ${violatesUser.length ? `contains ${violatesUser.join(', ')}, which you are allergic to` : `is ${breaks.join(', ')}, which conflicts with your diet`}.`);
      continue;
    }
    const warnings = [...breaks.map((b) => `makes the dish ${b}`), ...newAllergens.map((a) => `adds ${ALLERGEN_LABEL[a] || a}`)];
    out.push({ ...sub, ref: inRecipe.ref, warning: warnings.length ? `Note: this swap ${warnings.join(' and ')}.` : sub.warning || '' });
  }
  void ingredientWords;
  details.substitutions = out;
};

// ---------------------------------------------------------------------------
// Food safety (USDA FSIS safe minimum internal temperatures)
// ---------------------------------------------------------------------------

const SAFETY_RULES = {
  poultry: { text: 'Cook chicken or other poultry to an internal temperature of 74°C (165°F); the thickest piece should have no pink and clear juices.', cue: /74\s*°?\s*c|165\s*°?\s*f|cooked through|no (longer )?pink|juices run clear|opaque (all the way|throughout)|internal temp/i },
  'ground-poultry': { text: 'Cook ground chicken or turkey to 74°C (165°F) all the way through.', cue: /74\s*°?\s*c|165\s*°?\s*f|cooked through|no (longer )?pink|internal temp/i },
  'ground-meat': { text: 'Cook ground beef, lamb or pork to 71°C (160°F) all the way through.', cue: /71\s*°?\s*c|160\s*°?\s*f|cooked through|no (longer )?pink|browned (all over|through)|internal temp/i },
  'whole-meat': { text: 'Cook whole cuts of beef, lamb or goat to at least 63°C (145°F), then rest for 3 minutes; slow-cooked curries should be simmered until tender.', cue: /63\s*°?\s*c|145\s*°?\s*f|tender|cooked through|internal temp|rest/i },
  pork: { text: 'Cook pork to 63°C (145°F) and rest for 3 minutes.', cue: /63\s*°?\s*c|145\s*°?\s*f|cooked through|internal temp/i },
  fish: { text: 'Cook fish to 63°C (145°F), until the flesh is opaque and flakes easily.', cue: /63\s*°?\s*c|145\s*°?\s*f|opaque|flakes?/i },
  shellfish: { text: 'Cook shrimp and prawns until pink and opaque all the way through (63°C / 145°F).', cue: /opaque|pink|63\s*°?\s*c|145\s*°?\s*f|curl/i },
};

export const buildFoodSafety = (recipe, ctx, { mode = 'generate' } = {}) => {
  const records = (recipe.ingredients || []).map((i) => (i.ingredientId ? getIngredient(i.ingredientId) : null)).filter(Boolean);
  const text = (recipe.steps || []).flatMap((s) => (typeof s === 'string' ? [s] : [s.title, ...(s.instructions || []), ...(s.visualCues || [])])).join(' ');
  const guidance = [];
  const kinds = [...new Set(records.map((r) => r.safety).filter(Boolean))];
  for (const kind of kinds) {
    const rule = SAFETY_RULES[kind];
    guidance.push(rule.text);
    if (!rule.cue.test(text)) {
      const msg = `The method never says how to tell the ${kind.replace('-', ' ')} is safely cooked (temperature or a clear doneness cue).`;
      if (mode === 'generate') ctx.hard('food-safety', msg);
      else ctx.warn('food-safety', msg);
    }
  }
  const rawAnimal = records.some((r) => ['meat', 'poultry', 'fish', 'shellfish'].includes(r.animal) && r.state === 'raw');
  if (rawAnimal) {
    guidance.push('Use a separate board and knife for raw meat, poultry or seafood, and wash hands and surfaces after handling it.');
    if (/marinade/i.test(text)) guidance.push('Discard marinade that touched raw meat, or boil it for at least 1 minute before using it as a sauce.');
  }
  if (records.some((r) => r.animal === 'egg')) guidance.push('Cook eggs until the whites are fully set; cook yolks firm for young children, pregnant people and older adults.');
  if (records.some((r) => r.id === 'ING_KIDNEY_BEANS_DRY')) guidance.push('Soak dried kidney beans, then boil them hard for at least 10 minutes before simmering — undercooked kidney beans are toxic.');
  if (records.some((r) => r.category === 'grain' && /rice/i.test(r.name))) guidance.push('Cool leftover rice quickly and refrigerate within 1 hour; reheat only once, until steaming hot.');
  guidance.push('Refrigerate leftovers within 2 hours of cooking, and reheat to 74°C (165°F) until steaming hot throughout.');
  recipe.details = recipe.details || {};
  recipe.details.foodSafety = [...new Set(guidance)];
};
