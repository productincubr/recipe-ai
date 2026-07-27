import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Parses user input to extract semantic structure of the dish.
 * 
 * @param {string} dishName - Raw dish input (e.g. "Butter Chicken")
 * @returns {Promise<object>} - Semantic recipe understanding object
 */
export const understandRecipe = async (dishName) => {
  const apiKey = process.env.GROQ_API_KEY;
  const modelName = 'llama-3.1-8b-instant';

  const defaultUnderstanding = {
    recipe: dishName,
    cuisine: "Generic",
    mealType: "Lunch/Dinner",
    primaryIngredients: [],
    cookingMethod: "Standard Cooking",
    estimatedNutrition: {}
  };

  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Using default recipe understanding.');
    return defaultUnderstanding;
  }

  try {
    const systemPrompt = `Role: Expert culinary historian & food scientist.
Task: Analyze raw dish name & identify traditional properties.
Caution: DO NOT write recipes or steps.
Output: Strict JSON matching schema. NO prose, NO markdown blocks (\`\`\`json), NO wrapper text.

JSON Schema:
{
  "recipe": "string",
  "cuisine": "string",
  "mealType": "string",
  "primaryIngredients": ["string"],
  "cookingMethod": "string"
}`;

    const userPrompt = `Analyze the traditional preparation of the dish: "${dishName}"`;

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
    logger.error('Recipe understanding service failed:', { error: error.message });
  }

  return defaultUnderstanding;
};
