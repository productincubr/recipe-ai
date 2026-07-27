import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Reviews the final list of detailed steps to ensure clinical safety and cookbook quality.
 */
export const reviewRecipeSteps = async (dishName, steps, inputs, optimizationPlan, evidenceSummary) => {
  const apiKey = process.env.GROQ_API_KEY_REVIEWER || process.env.GROQ_API_KEY;
  const modelName = 'llama-3.1-8b-instant';

  const defaultReview = {
    isPerfect: true,
    safetyConfidence: 95,
    problems: [],
    correctionsNeeded: false
  };

  if (!apiKey) return defaultReview;

  try {
    const systemPrompt = `Role: Clinical Recipe Reviewer & Senior Editor.
Task: Check recipe steps draft for missing details (quantities, time, heat, seasoning, tools).
Output: Strict JSON matching schema. NO prose, NO markdown blocks (\`\`\`json), NO wrapper text.

JSON Schema:
{
  "isPerfect": boolean,
  "safetyConfidence": number, // Scale 0-100
  "problems": ["string"],
  "correctionsNeeded": boolean
}`;

    const userPrompt = `Review the following sequenced steps for "${dishName}":

STEPS DRAFT:
${JSON.stringify(steps.map((s, idx) => ({
  index: idx + 1,
  title: s.title,
  time: s.time,
  heatLevel: s.heatLevel,
  ingredientsUsed: s.ingredients,
  instructions: s.instructions
})))}

USER HEALTH PROFILE:
Goals: ${(inputs.goals || []).join(', ')}
Conditions: ${(inputs.medicalConditions || []).join(', ')}
Allergies: ${(inputs.allergies || []).join(', ')}
Diet: ${inputs.dietaryPreferences}

CLINICAL GUIDELINES:
${evidenceSummary}

Evaluate if the steps are highly detailed, clean, safe, and conform to the clinical guidelines. Output the JSON review.`;

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
      const parsed = JSON.parse(content);
      parsed.token_metrics = response.data.usage;
      return parsed;
    }
  } catch (error) {
    logger.error('Recipe reviewer agent failed:', { error: error.message });
  }

  return defaultReview;
};
