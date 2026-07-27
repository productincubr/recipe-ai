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
Task: Design healthy substitutions & cooking method adjustments.
Caution: DO NOT write recipes.
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

USER HEALTH PROFILE:
Goals: ${(healthProfile.goals || []).join(', ')}
Medical Conditions: ${(healthProfile.medicalConditions || []).join(', ')}
Allergies: ${(healthProfile.allergies || []).join(', ')}
Diet Preference: ${healthProfile.dietaryPreferences || 'No Preference'}
Dislikes: ${(healthProfile.dislikedIngredients || []).join(', ')}

CLINICAL EVIDENCE BASE:
${evidenceSummary}

Design a clear optimization plan with swaps and adjustments. Follow all allergy and dietary restrictions strictly.`;

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
