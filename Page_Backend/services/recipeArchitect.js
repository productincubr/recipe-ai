import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';
import { GROQ_RECIPE_MODEL, GROQ_FAST_MODEL } from '../config/groqModels.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const SYSTEM_PROMPT = `You are a senior recipe developer for a healthy-cooking cookbook. Write ONE complete, cookable recipe as strict JSON (no prose, no markdown). The app checks every number: ingredient totals vs the amounts each step uses, step times vs the instructions, diet labels vs the ingredients. Inconsistent recipes are rejected.

DISH
- Keep the requested dish's defining ingredients and technique (butter chicken: chicken, spiced yogurt marinade, tomato makhani gravy, kasuri methi; Thai green curry: green curry paste, coconut milk, Thai basil, makrut lime leaves; tikka: grilled marinated pieces). Replace one only if the user's diet/allergies or an approved swap require it. No generic template, no foods the dish doesn't use.
- No placeholders ("protein of choice", "mixed vegetables", "spices", "healthy oil").

INGREDIENTS
- "ref": unique id the steps use. "name": the product only, specific ("Light coconut milk", "Low-sodium soy sauce"); one option per name (alternatives go in substitutions); cutting goes in "prep".
- "quantity" number + "unit": g/ml for produce, proteins, grains, liquids and anything over 3 tbsp; tsp/tbsp for small amounts; clove/stalk/leaf/sprig/piece only for garlic, lemongrass, leaves, whole spices, chillies. Salt gets a number plus "toTaste": true. "household" optional, size only ("1 medium" for 110 g onion; never repeat the amount or name).
- "optional": true only for items used solely in optional steps; optional sides need their own ingredients.
- "eatenFraction" (0-1) + "eatenFractionReason" only when part is not eaten (marinade left over, frying oil, drained whey, removed whole spices).
- Name products safely: vegetarian/vegan dishes use "vegan red curry paste (no shrimp paste)", "mushroom-based vegetarian oyster sauce", hard cheese "(microbial rennet)"; gluten-free dishes use tamari / gluten-free soy sauce.
- A main-dish serving is usually 300-550 g of food.

STEPS (true order; step 1 is the preparation step, heatLevel "None", covering the cutting/pressing/measuring in the "prep" notes)
- "instructions": 2-5 actions saying what, how, how much, how long and the doneness cue ("Heat 1 tsp oil over medium heat. Add 2 tbsp curry paste and stir for 2-3 minutes until fragrant; do not let it brown.").
- "ingredientsUsed": every ingredient the step adds/measures as {"ref","quantity","unit"}. Per ingredient, the sum over all steps MUST EQUAL the listed quantity (1/2 tbsp in step 1 + 1 tbsp in step 5 = list 1.5 tbsp). Food already measured earlier ("the marinated tofu") is not repeated. Garnishes count.
- Amounts written in the text must equal ingredientsUsed (same number and unit). Never "a few", "some", "extra", "a splash"; never "the remaining X" unless part was measured earlier. Every food named must be listed, or made earlier ("produces": e.g. "red curry paste"); never also list a homemade component as bought.
- "activeMinutes" hands-on; "passiveMinutes" unattended (marinate, soak, press, rest, covered simmer, bake) with "passiveLabel". Together they cover every time in the text; passive time only for waits the text states. Anything a step calls "soaked"/"toasted"/"marinated" needs an earlier step doing it, with its time.
- "dependsOn": steps that must finish first, so independent prep can overlap waiting.
- "heatLevel" None|Low|Medium-Low|Medium|Medium-High|High; "temperature" for oven/grill/oil. "visualCues": how to tell it's done. Meat, poultry, fish and seafood need the safe doneness cue or internal temperature (poultry 74°C/165°F).
- "optional": true for steps that only make an optional side. "chefTip": step-specific technique. "commonMistakes": what to avoid and why. Never promise an exact yield ("about 80-100 g").

HEALTH LANGUAGE
- Conservative and factual. The app calculates nutrition: never state calories or nutrient numbers. Never claim cures, treats, prevents, detox, fat-burning, immunity/metabolism boosts, "superfood", "anti-inflammatory", "rich in antioxidants" or "heart-healthy". Coconut milk/oil, ghee, butter and cream are high in saturated fat.
- Claim only the effect a swap really has (coconut oil has MORE saturated fat than vegetable oil; reduced-sodium tamari is still ~600 mg sodium per tbsp; jaggery and honey are added sugar). "healthSwaps" list each change with the amount used here; the app checks the claimed effect.
- "dietaryTags": only diet labels the ingredients satisfy (Vegetarian, Vegan, Gluten-Free, Dairy-Free); no nutrient claims.

JSON:
{"dish_name":"","subtitle":"","category":"Main Course","description":"2-3 sentences","healthier_explanation":"specific ingredient/method changes vs the traditional version","cuisine":"","meal_type":"","diet_type":"Vegan|Vegetarian|Pescatarian|Non-Vegetarian","servings":2,"difficulty":"Easy|Medium|Hard","spiceLevel":"Mild|Medium|Hot","visualDescription":"sauce colour/texture, visible ingredients, garnish, vessel",
"ingredients":[{"ref":"","name":"","quantity":0,"unit":"","household":"","prep":"","group":"","optional":false,"toTaste":false}],
"equipment":[""],"preparationNotes":[""],
"steps":[{"stepNumber":1,"title":"","technique":"","heatLevel":"","temperature":"","activeMinutes":0,"passiveMinutes":0,"passiveLabel":"","dependsOn":[],"optional":false,"produces":"","ingredientsUsed":[{"ref":"","quantity":0,"unit":""}],"instructions":[""],"visualCues":[""],"chefTip":"","commonMistakes":""}],
"chefTips":[""],"thingsToAvoid":[""],"substitutions":[{"ingredient":"a listed ingredient","substitute":"with amount","note":""}],"variations":[""],"servingSuggestions":[""],"storageInstructions":["how long, where"],"reheatingInstructions":[""],"allergens":[""],"dietaryTags":[""],
"healthSwaps":[{"original":"full-fat coconut milk","replacement":"light coconut milk","quantity":300,"unit":"ml","reason":""}],"healthBenefits":["factual, no numbers"],"proteinBoost":"exact extra quantities, or empty"}`;

// Prose that validation problems rarely concern; dropped from the repair
// prompt to keep it inside the provider's per-request token limit.
export const PROSE_FIELDS = ['chefTips', 'variations', 'servingSuggestions', 'storageInstructions', 'reheatingInstructions', 'healthBenefits', 'proteinBoost', 'preparationNotes', 'equipment', 'thingsToAvoid', 'subtitle'];
const compactDraft = (draft) => {
  const out = Object.fromEntries(Object.entries(draft).filter(([k]) => !PROSE_FIELDS.includes(k)));
  out.steps = (draft.steps || []).map(({ chefTip, commonMistakes, ...rest }) => rest);
  return out;
};

const buildUserPrompt = (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure, feedback, previousDraft) => {
  const traditional = recipeStructure.primaryIngredients || [];
  const lines = [`Write the complete healthy recipe for: "${dishName}"`, ''];

  if (traditional.length > 0) {
    lines.push(`TRADITIONAL CORE INGREDIENTS (keep them unless diet/allergy or an approved swap replaces one): ${traditional.join(', ')}`);
    lines.push(`Traditional cuisine: ${recipeStructure.cuisine || 'Generic'}`);
  }
  const signature = recipeStructure.signatureFlavorings || [];
  if (signature.length > 0) {
    lines.push(`SIGNATURE FLAVORINGS (include each unless the user's restrictions forbid it): ${signature.join(', ')}`);
  }
  if (inputs.cuisine) lines.push(`USER-REQUESTED CUISINE: ${inputs.cuisine}`);
  if (inputs.mealType) lines.push(`MEAL TYPE: ${inputs.mealType}`);
  if (inputs.spiceLevel) lines.push(`SPICE LEVEL: ${inputs.spiceLevel}`);
  if (Array.isArray(inputs.ingredients) && inputs.ingredients.length > 0) {
    lines.push(`AVAILABLE INGREDIENTS TO BUILD AROUND: ${inputs.ingredients.join(', ')}`);
  }
  if (Array.isArray(inputs.superfoods) && inputs.superfoods.length > 0) {
    lines.push(`SUPERFOODS THAT MUST BE INCLUDED: ${inputs.superfoods.join(', ')}`);
  }

  lines.push(
    '',
    'USER HEALTH PROFILE:',
    `Goals: ${(inputs.goals || []).join(', ') || 'General wellness'}`,
    `Conditions: ${(inputs.medicalConditions || []).join(', ') || 'None'}`,
    `Allergies (must be completely absent): ${(inputs.allergies || []).join(', ') || 'None'}`,
    `Diet: ${inputs.dietaryPreferences || 'No Preference'}`,
    `Dislikes: ${(inputs.dislikedIngredients || []).join(', ') || 'None'}`,
    `Servings: ${inputs.servings || 2}`,
    '',
    'CLINICAL GUIDELINES:',
    previousDraft ? 'Already applied in the draft below.' : evidenceSummary || 'None',
    '',
    'APPROVED INGREDIENT SWAPS:',
    JSON.stringify(optimizationPlan?.swaps || []),
    'APPROVED METHOD ADJUSTMENTS:',
    JSON.stringify(optimizationPlan?.methodAdjustments || [])
  );

  if (feedback && previousDraft) {
    // Repair, not regenerate: the model fixes the listed problems in its own
    // draft, so parts that were already correct are not rewritten (and broken).
    lines.push(
      '',
      'YOUR PREVIOUS DRAFT (JSON) FAILED THESE AUTOMATED CHECKS:',
      feedback,
      '',
      'Return the corrected recipe JSON. Fix every problem above (adjust quantities, ingredientsUsed, instruction text, times or ingredients as needed so they agree); keep everything else unchanged.',
      `Fields left out of the draft below (${PROSE_FIELDS.join(', ')}, and each step's chefTip/commonMistakes) are kept automatically: leave them out of your answer too unless a problem is about them.`,
      'PREVIOUS DRAFT:',
      JSON.stringify(compactDraft(previousDraft))
    );
  } else if (feedback) {
    lines.push('', `YOUR PREVIOUS DRAFT WAS REJECTED. Fix these problems: ${feedback}`);
  }

  return lines.join('\n');
};

const callGroq = async (model, apiKey, userPrompt) => {
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4,
    // Recipes use about 3,500 output tokens (incl. reasoning); 8,000 leaves headroom.
    max_tokens: 8000,
    response_format: { type: 'json_object' }
  };
  if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'medium';

  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
    httpsAgent,
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  const choice = response.data.choices[0];
  if (choice.finish_reason === 'length') {
    throw new Error('Model output was cut off (finish_reason=length).');
  }
  const parsed = JSON.parse(choice.message.content.trim());
  parsed.token_metrics = { ...response.data.usage, model_used: model };
  return parsed;
};

/**
 * Generates the full recipe in one call.
 * Returns null when no model could produce a parseable, untruncated recipe.
 */
export const buildRecipeBlueprint = async (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure = {}, feedback = '', previousDraft = null) => {
  const apiKey = process.env.GROQ_API_KEY_ARCHITECT || process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Cannot generate recipe.');
    return null;
  }

  const userPrompt = buildUserPrompt(dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure, feedback, previousDraft);

  for (const model of [...new Set([GROQ_RECIPE_MODEL, GROQ_FAST_MODEL])]) {
    for (let rateLimitRetries = 0; ; rateLimitRetries++) {
      try {
        return await callGroq(model, apiKey, userPrompt);
      } catch (error) {
        const detail = error.response?.data?.error?.message || error.message;
        logger.error(`Recipe generation with ${model} failed: ${detail}`);
        if (error.response?.status === 401) return null;

        const waitMs = rateLimitWaitMs(error);
        if (waitMs === null || rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) break;
        logger.warn(`${model}: retrying in ${Math.ceil(waitMs / 1000)}s (${/json/i.test(detail) ? 'invalid JSON' : 'rate limit'}).`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }

  return null;
};

const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RATE_LIMIT_WAIT_MS = 60000;

// Groq free tier has a low tokens-per-minute cap; waiting is better than failing the user's request.
const rateLimitWaitMs = (error) => {
  // Groq's free tier rejects a normal-sized request as "Request too large"
  // (413, with an inflated "Requested" figure) while the per-minute budget is
  // busy from earlier calls. Measured: the same ~1,900-token prompt is
  // accepted once a fresh minute starts, so wait for the window to reset.
  const message = error.response?.data?.error?.message || '';
  if (/request too large/i.test(message)) return 61000;
  // JSON mode occasionally rejects a generation; the same request usually
  // succeeds on a second try.
  if (/failed to (generate|validate) json/i.test(message)) return 1500;
  if (error.response?.status !== 429) return null;
  const header = Number(error.response.headers?.['retry-after']);
  const fromMessage = Number((error.response.data?.error?.message || '').match(/try again in ([\d.]+)s/)?.[1]);
  const seconds = header || fromMessage || 20;
  const ms = Math.ceil(seconds * 1000) + 500;
  return ms <= MAX_RATE_LIMIT_WAIT_MS ? ms : null;
};
