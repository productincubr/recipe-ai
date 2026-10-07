import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';
import { GROQ_RECIPE_MODEL, GROQ_FAST_MODEL } from '../config/groqModels.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const SYSTEM_PROMPT = `Role: Senior recipe developer for a premium healthy-cooking cookbook.
Task: Generate a complete, cookable recipe. Do not summarize the recipe. Do not omit ingredients, quantities, preparation details, cooking steps, timing, temperatures, substitutions, or serving instructions. Every instruction must be actionable and specific to THIS dish. A home cook must be able to make it using only what you write.
Output: Strict JSON matching the schema. NO prose, NO markdown, NO wrapper text.

DISH FIDELITY
- The recipe must be the requested dish. Keep its defining ingredients and technique (e.g. butter chicken keeps chicken, a yogurt-spice marinade, a tomato-based makhani gravy, kasuri methi). Only replace an ingredient when the user's diet/allergies require it or an approved swap says so.
- Clinical guidelines are nutrition targets, not an ingredient list: meet them by adjusting this dish's own ingredients, fats and portions. Never bolt on foods the dish doesn't use (e.g. oats or chia on pasta) just because a guideline mentions them.
- Never use placeholder or generic ingredients such as "protein of choice", "high-protein source", "complex carbs", "mixed vegetables", "spices", "seasoning" unless the dish genuinely uses that exact item.

INGREDIENTS
- List EVERY ingredient the cook touches, each whole or ground spice separately, plus oil/butter, salt, water/stock, acids and garnish.
- "quantity" is exact and includes the unit: "300 g", "1/2 tsp", "1 medium", "120 ml". "to taste" is allowed only for salt and pepper.
- "name" is only the ingredient (e.g. "Tomatoes", "Kasuri methi"); put cutting/preparation in "prep", not in the name.
- "prep" says how it is cut or prepared ("finely chopped", "grated", "boneless, cut into 4 cm pieces"), or "".
- "group" names the component it belongs to when the dish has components ("Marinade", "Gravy", "Tempering", "Garnish"), else "Main".
- Quantities must match the number of servings.

METHOD
- Steps in true cooking order from prep to serving. Simple dishes: 4-6 steps; complex dishes: 6-10+. Do not pad with filler steps.
- Each step has 2-5 instructions. Each instruction is one concrete action with quantity, heat level or oven temperature, time, and a visual/texture doneness cue where relevant, e.g. "Cook on medium heat for 4-5 minutes until the onions are translucent; do not brown them."
- Mention every ingredient by name in the step where it is used. Marination/soaking/resting times must be stated.
- Every instruction that uses heat states the heat level and the time.
- If an ingredient is used in more than one step, its listed quantity covers all uses and each step says how much it uses (e.g. "80 g of the yogurt"). Never refer to a "remaining" amount that was not explicitly reserved earlier.
- Include the signature aromatics and finishing touches that define the dish's flavour; a cook who knows the dish should not notice anything missing.

SELF-CHECK BEFORE ANSWERING
- Every listed ingredient is used in the method, and every ingredient used in the method is listed.
- Split quantities add up. Times in steps add up to roughly prepTime + cookTime.
- Nutrition, allergens and dietaryTags match the actual ingredients.
- "chefTip" is a technique trick specific to the step. "commonMistakes" is what to avoid and why.

NUTRITION
- Realistic per-serving values for the exact quantities and servings you wrote. Respect the user's health goals (e.g. diabetes: no added sugar/honey; low sodium: under 400 mg).

JSON Schema:
{
  "dish_name": "string (no repeated words like 'Healthy Healthy')",
  "subtitle": "string (one short line)",
  "category": "string",
  "description": "string (2-3 sentences)",
  "healthier_explanation": "string (specific changes vs the traditional version and why they help the user's goals)",
  "cuisine": "string",
  "meal_type": "string",
  "diet_type": "string",
  "servings": number,
  "prepTime": "string", "cookTime": "string", "totalTime": "string (include marination/resting)",
  "difficulty": "Easy|Medium|Hard",
  "spiceLevel": "Mild|Medium|Hot",
  "calories": number,
  "protein": "string e.g. 32g", "carbohydrates": "string", "fats": "string", "fiber": "string", "sugar": "string", "sodium": "string e.g. 380mg",
  "ingredients": [{"name": "string", "quantity": "string", "prep": "string", "group": "string"}],
  "equipment": ["string"],
  "preparationNotes": ["string (make-ahead, soaking, marination planning)"],
  "steps": [{
    "title": "string",
    "time": "string",
    "heatLevel": "None|Low|Medium-Low|Medium|Medium-High|High|Oven <temp>",
    "instructions": ["string"],
    "chefTip": "string",
    "commonMistakes": "string"
  }],
  "chefTips": ["string"],
  "substitutions": [{"ingredient": "string", "substitute": "string", "note": "string"}],
  "variations": ["string"],
  "servingSuggestions": ["string"],
  "storageInstructions": ["string"],
  "reheatingInstructions": ["string"],
  "allergens": ["string (from the actual ingredients, e.g. Dairy, Tree nuts)"],
  "dietaryTags": ["string (only tags the ingredients truly satisfy)"],
  "healthBenefits": ["string"],
  "proteinBoost": "string (how to raise protein with exact extra quantities, or empty)"
}`;

const buildUserPrompt = (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure, feedback) => {
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
    evidenceSummary || 'None',
    '',
    'APPROVED INGREDIENT SWAPS:',
    JSON.stringify(optimizationPlan?.swaps || []),
    'APPROVED METHOD ADJUSTMENTS:',
    JSON.stringify(optimizationPlan?.methodAdjustments || [])
  );

  if (feedback) {
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
    max_tokens: 16000,
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
export const buildRecipeBlueprint = async (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure = {}, feedback = '') => {
  const apiKey = process.env.GROQ_API_KEY_ARCHITECT || process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Cannot generate recipe.');
    return null;
  }

  const userPrompt = buildUserPrompt(dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure, feedback);

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
        logger.warn(`Rate limited on ${model}; waiting ${Math.ceil(waitMs / 1000)}s before retrying.`);
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
  if (error.response?.status !== 429) return null;
  const header = Number(error.response.headers?.['retry-after']);
  const fromMessage = Number((error.response.data?.error?.message || '').match(/try again in ([\d.]+)s/)?.[1]);
  const seconds = header || fromMessage || 20;
  const ms = Math.ceil(seconds * 1000) + 500;
  return ms <= MAX_RATE_LIMIT_WAIT_MS ? ms : null;
};
