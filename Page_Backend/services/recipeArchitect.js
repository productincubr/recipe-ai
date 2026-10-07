import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const PRIMARY_MODEL = process.env.GROQ_RECIPE_MODEL || 'llama-3.3-70b-versatile';
const BACKUP_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `Role: Senior recipe developer for a premium healthy-cooking cookbook.
Task: Write the COMPLETE, cook-ready healthy version of the requested dish. A home cook must be able to make it using ONLY what you write.
Output: Strict JSON matching the schema. NO prose, NO markdown, NO wrapper text.

INGREDIENT RULES
- List EVERY ingredient the cook touches: main produce, protein, dairy, every whole and ground spice (separately), oil, salt, water/stock, acids (lemon, amchur, vinegar) and garnish.
- Exact quantity for each, in g / ml / tsp / tbsp / pieces (e.g. "300 g", "1 small", "1/2 tsp"). Use "to taste" only for salt.
- "prep" says how it is cut or prepared (e.g. "finely sliced", "grated", "crumbled or cubed", "washed and dried well"). Empty string if none.
- Real, specific ingredients only. Never write placeholders like "protein of choice" or "mixed vegetables".

METHOD RULES
- 6 to 10 steps in true cooking order, from prep to serving.
- Each step has 2-4 instructions. Each instruction is one concrete action with the quantity, heat level, time and/or temperature, and a doneness cue (e.g. "Cook for 4-5 minutes on medium heat until the onions turn translucent.").
- Every ingredient in the list must be used in at least one instruction, mentioned by name.
- Include the technique tricks that make the dish work (e.g. "Dry the bhindi completely before cutting to avoid sliminess", "Lower the heat before adding yogurt so it does not split").

NUTRITION
- Realistic per-serving numbers for the quantities you wrote.

JSON Schema:
{
  "dish_name": "string",
  "category": "string",
  "description": "string (2 sentences: what the dish is and what makes this version healthier)",
  "healthier_explanation": "string (specific changes vs the traditional version and why they help the user's goals)",
  "calories": number,
  "protein": "string e.g. 24g",
  "fiber": "string",
  "fats": "string",
  "sodium": "string e.g. 350mg",
  "servings": number,
  "prepTime": "string",
  "cookTime": "string",
  "totalTime": "string",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "string",
  "diet_type": "string",
  "meal_type": "string",
  "ingredients": [{"name": "string", "quantity": "string", "prep": "string"}],
  "steps": [{
    "title": "string",
    "time": "string",
    "heatLevel": "None|Low|Medium-Low|Medium|Medium-High|High",
    "instructions": ["string"],
    "chefTip": "string",
    "commonMistakes": "string"
  }],
  "proteinBoost": "string (how to push protein higher with exact extra quantities, or empty string)",
  "servingSuggestion": "string (what to serve it with for a balanced plate)"
}`;

const buildUserPrompt = (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure, feedback) => {
  const traditional = recipeStructure.primaryIngredients || [];
  const lines = [`Write the complete healthy recipe for: "${dishName}"`, ''];

  if (traditional.length > 0) {
    lines.push(`TRADITIONAL CORE INGREDIENTS (keep them unless an approved swap below replaces one): ${traditional.join(', ')}`);
    lines.push(`Traditional cuisine: ${recipeStructure.cuisine || 'Generic'}`);
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
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 6000,
      response_format: { type: 'json_object' }
    },
    {
      httpsAgent,
      timeout: 90000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );

  const parsed = JSON.parse(response.data.choices[0].message.content.trim());
  parsed.token_metrics = { ...response.data.usage, model_used: model };
  return parsed;
};

/**
 * Generates the full recipe (ingredients with prep notes + detailed method) in one call.
 * Returns null when no model could produce a parseable recipe.
 */
export const buildRecipeBlueprint = async (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure = {}, feedback = '') => {
  const apiKey = process.env.GROQ_API_KEY_ARCHITECT || process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Cannot generate recipe.');
    return null;
  }

  const userPrompt = buildUserPrompt(dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure, feedback);

  for (const model of [PRIMARY_MODEL, BACKUP_MODEL]) {
    try {
      return await callGroq(model, apiKey, userPrompt);
    } catch (error) {
      const detail = error.response?.data?.error?.message || error.message;
      logger.error(`Recipe generation with ${model} failed: ${detail}`);
      if (error.response?.status === 401) break;
    }
  }

  return null;
};
