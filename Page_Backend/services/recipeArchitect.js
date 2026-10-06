import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Generates the structural blueprint (metadata + step title list) for a recipe.
 * Detailed step content is written separately by recipeWriter.js.
 */
export const buildRecipeBlueprint = async (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure = {}) => {
  const apiKey = process.env.GROQ_API_KEY_ARCHITECT || process.env.GROQ_API_KEY;
  const modelName = 'llama-3.1-8b-instant';

  const defaultBlueprint = {
    dish_name: dishName.toLowerCase().startsWith('healthy ') ? dishName : `Healthy ${dishName}`,
    category: "Nutritious Twist",
    description: `A wholesome, calorie-conscious remake of traditional ${dishName}.`,
    calories: 380,
    protein: "22g",
    fiber: "8g",
    fats: "9g",
    sodium: "370mg",
    servings: inputs.servings || 2,
    prepTime: "15 min",
    cookTime: "25 min",
    difficulty: "Medium",
    cuisine: "Generic",
    diet_type: inputs.dietaryPreferences || "Vegetarian",
    meal_type: "Lunch, Dinner",
    ingredients: [
      { name: "High-protein Paneer, Tofu, or Lentils", quantity: "200g" },
      { name: "Complex carbs (Quinoa, Brown Rice, or Oats)", quantity: "1 cup" },
      { name: "Mixed fresh seasonal vegetables", quantity: "1.5 cups" },
      { name: "Cold-pressed Olive or Avocado Oil", quantity: "1 tbsp" },
      { name: "Low sodium seasoning / herbs", quantity: "to taste" },
      { name: "Garlic & Ginger paste", quantity: "1 tsp" }
    ],
    steps: [
      "Prepare Ingredients",
      "Cook Grains",
      "Sauté Protein",
      "Combine and Season",
      "Plate and Garnish"
    ]
  };

  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Returning default blueprint.');
    return defaultBlueprint;
  }

  try {
    const systemPrompt = `Role: Professional Recipe Architect.
Task: Design the structural blueprint for a healthy recipe that stays faithful to the requested dish. Do NOT write detailed cooking instructions — only plan the step titles.
CORE RULE: The final "ingredients" list MUST still include every ingredient in TRADITIONAL CORE INGREDIENTS below, unless PROPOSED OPTIMIZATIONS explicitly swaps it out. Healthify through quantities, cooking method, and the adjustments already given to you.
Output: Strict JSON matching schema. NO prose, NO markdown blocks (\`\`\`json), NO wrapper text.

JSON Schema:
{
  "dish_name": "string",
  "category": "string",
  "description": "string",
  "calories": number,
  "protein": "string",
  "fiber": "string",
  "fats": "string",
  "sodium": "string",
  "servings": number,
  "prepTime": "string",
  "cookTime": "string",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "string",
  "diet_type": "string",
  "meal_type": "string",
  "ingredients": [{"name": "string", "quantity": "string"}],
  "steps": ["Step Title 1", "Step Title 2", "Step Title 3"]
}`;

    const traditionalIngredients = recipeStructure.primaryIngredients || [];

    const userPrompt = `Create a healthy recipe blueprint with detailed sequential cooking steps for the dish: "${dishName}"
${traditionalIngredients.length > 0 ? `
TRADITIONAL CORE INGREDIENTS (must appear in the final "ingredients" list unless swapped below):
${traditionalIngredients.join(', ')}
Cuisine: ${recipeStructure.cuisine || 'Generic'}
` : ''}
${inputs.cuisine ? `USER-REQUESTED CUISINE: ${inputs.cuisine} — the dish must reflect this cuisine's flavors and technique, overriding any inferred cuisine above.\n` : ''}${inputs.mealType ? `MEAL TYPE: ${inputs.mealType} — make sure the dish, portioning, and richness suit this meal.\n` : ''}${Array.isArray(inputs.ingredients) && inputs.ingredients.length > 0 ? `AVAILABLE INGREDIENTS TO PRIORITIZE: ${inputs.ingredients.join(', ')} — build the recipe around these where sensible.\n` : ''}${Array.isArray(inputs.superfoods) && inputs.superfoods.length > 0 ? `SUPERFOODS TO INCLUDE: ${inputs.superfoods.join(', ')} — these must appear in the final "ingredients" list.\n` : ''}
USER HEALTH SPECIFICATIONS:
Goals: ${(inputs.goals || []).join(', ')}
Conditions: ${(inputs.medicalConditions || []).join(', ')}
Allergies: ${(inputs.allergies || []).join(', ')}
Diet: ${inputs.dietaryPreferences || 'No Preference'}
Dislikes: ${(inputs.dislikedIngredients || []).join(', ')}

CLINICAL GUIDELINES:
${evidenceSummary}

PROPOSED OPTIMIZATIONS:
${JSON.stringify(optimizationPlan.swaps)}

Output the clean JSON blueprint. The "steps" array must contain 5 to 6 meaningful step TITLES only as plain strings (e.g. ["Marinate the Protein", "Cook the Gravy Base", "Temper Spices", "Simmer and Reduce", "Plate and Garnish"]). Do NOT write instructions inside steps — only the title strings.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.25,
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
    logger.error('Combined recipe generation service failed:', { error: error.message });
  }

  return defaultBlueprint;
};
