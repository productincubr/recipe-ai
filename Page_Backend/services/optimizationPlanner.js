import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Plans optimization swaps and method adjustments before generating the recipe.
 * 
 * @param {object} recipeStructure - Traditional recipe parameters
 * @param {object} healthProfile - Merged health goals & restrictions
 * @param {string} evidenceSummary - Structured guidelines summary
 * @returns {Promise<object>} - Swaps & adjustments plan JSON
 */
export const planOptimizations = async (recipeStructure, healthProfile, evidenceSummary) => {
  const apiKey = process.env.GROQ_API_KEY;
  const modelName = 'llama-3.1-8b-instant';

  const defaultPlan = {
    swaps: [],
    methodAdjustments: []
  };

  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Using empty optimization plan.');
    return defaultPlan;
  }

  try {
    const systemPrompt = `Role: Clinical recipe optimization planner.
Task: Design healthy substitutions & cooking method adjustments while preserving the dish's identity.
Caution: DO NOT write recipes.

CORE RULE: "Primary Ingredients" are what make this dish recognizable as itself (e.g. the bean in a bean dish, the grain in a rice dish, the protein in a meat dish). Do NOT put a primary ingredient in "swaps" to change its fundamental category (e.g. rice -> quinoa, kidney beans -> lima beans, chicken -> tofu) UNLESS the user's allergies, medical conditions, or dietary preference make the original ingredient unsafe or non-compliant. Every "swaps" entry for a primary ingredient must name the specific allergy/condition/diet that required it in "reason" — if none applies, do not swap it. For primary ingredients with no such conflict, improve them via "methodAdjustments" instead (e.g. white rice -> brown rice, less oil/ghee, more fiber, portion control) so the dish stays recognizable and still tastes like what the user asked for.

Output: Strict JSON matching schema. NO prose, NO markdown blocks (\`\`\`json), NO wrapper text.

JSON Schema:
{
  "swaps": [
    {
      "originalIngredient": "string",
      "substitutedWith": "string",
      "reason": "string",
      "clinicalBenefit": "string"
    }
  ],
  "methodAdjustments": [
    {
      "originalMethod": "string",
      "adjustedMethod": "string",
      "reason": "string"
    }
  ]
}`;

    const userPrompt = `Develop a clinical recipe optimization plan for the dish: "${recipeStructure.recipe}"

TRADITIONAL STRUCTURE:
Cuisine: ${recipeStructure.cuisine}
Primary Ingredients: ${recipeStructure.primaryIngredients.join(', ')}
Cooking Method: ${recipeStructure.cookingMethod}
${healthProfile.cuisine ? `User-requested cuisine: ${healthProfile.cuisine}\n` : ''}${healthProfile.mealType ? `Meal type: ${healthProfile.mealType}\n` : ''}${Array.isArray(healthProfile.ingredients) && healthProfile.ingredients.length > 0 ? `Available ingredients to prioritize: ${healthProfile.ingredients.join(', ')}\n` : ''}${Array.isArray(healthProfile.superfoods) && healthProfile.superfoods.length > 0 ? `Superfoods to include: ${healthProfile.superfoods.join(', ')}\n` : ''}
USER HEALTH PROFILE:
Goals: ${(healthProfile.goals || []).join(', ')}
Medical Conditions: ${(healthProfile.medicalConditions || []).join(', ')}
Allergies: ${(healthProfile.allergies || []).join(', ')}
Diet Preference: ${healthProfile.dietaryPreferences || 'No Preference'}
Dislikes: ${(healthProfile.dislikedIngredients || []).join(', ')}

CLINICAL EVIDENCE BASE:
${evidenceSummary}

Design a clear optimization plan. Only add a "swaps" entry for a primary ingredient if it directly conflicts with an allergy, medical condition, or dietary preference listed above — name which one in "reason". For every other primary ingredient, leave its category untouched and instead add a "methodAdjustments" entry (healthier variety of the same ingredient, less oil/sugar/salt, more fiber/veggies) so the final dish still tastes and looks like "${recipeStructure.recipe}". Follow all allergy and dietary restrictions strictly.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      },
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (response && response.data && response.data.choices && response.data.choices.length > 0) {
      let content = response.data.choices[0].message.content.trim();
      const parsed = JSON.parse(content);
      parsed.token_metrics = response.data.usage;
      return parsed;
    }
  } catch (error) {
    logger.error('Optimization planner service failed:', { error: error.message });
  }

  return defaultPlan;
};
