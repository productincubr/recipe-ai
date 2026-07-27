import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Reviews a generated recipe draft to identify issues and assign a safety rating.
 * 
 * @param {object} recipeDraft - Generated recipe object
 * @param {object} healthProfile - User goals & restrictions
 * @param {string} evidenceSummary - Clinical recommendations summary
 * @returns {Promise<object>} - Review JSON containing safetyConfidence and problems list
 */
export const reviewRecipe = async (recipeDraft, healthProfile, evidenceSummary) => {
  const apiKey = process.env.GROQ_API_KEY;
  const modelName = 'llama-3.1-8b-instant';

  const defaultReview = {
    safetyConfidence: 90,
    problems: []
  };

  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Skipping second-opinion AI review.');
    return defaultReview;
  }

  try {
    const systemPrompt = `You are a clinical peer reviewer and senior nutritionist.
Your task is to review the draft recipe for safety, allergy compliance, and medical guidelines.
Do NOT rewrite the recipe. Only identify problems and rate safety.
You MUST output ONLY a valid JSON object matching the requested schema. No markdown blocks.

Expected JSON structure:
{
  "safetyConfidence": 95,
  "problems": [
    "- Problem 1 description (e.g. Sodium is slightly high)",
    "- Problem 2 description (e.g. Contains potential GERD triggers)"
  ]
}`;

    const userPrompt = `Review this recipe draft for a patient:

RECIPE DRAFT:
Dish: ${recipeDraft.dish_name}
Calories: ${recipeDraft.calories}
Protein: ${recipeDraft.protein}
Fats: ${recipeDraft.fats}
Fiber: ${recipeDraft.fiber}
Sodium: ${recipeDraft.sodium}
Ingredients: ${JSON.stringify(recipeDraft.ingredients)}
Steps: ${JSON.stringify(recipeDraft.steps)}

USER HEALTH PROFILE:
Goals: ${(healthProfile.goals || []).join(', ')}
Medical Conditions: ${(healthProfile.medicalConditions || []).join(', ')}
Allergies: ${(healthProfile.allergies || []).join(', ')}
Diet Preference: ${healthProfile.dietaryPreferences}
Dislikes: ${(healthProfile.dislikedIngredients || []).join(', ')}

CLINICAL RECOMMENDATIONS:
${evidenceSummary}

Evaluate safety compliance, flag any potential allergen leaks, and assign a weighted safetyConfidence score between 0 and 100.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
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
      return JSON.parse(content);
    }
  } catch (error) {
    logger.error('AI Reviewer service failed:', { error: error.message });
  }

  return defaultReview;
};
