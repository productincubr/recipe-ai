import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Generates both the structural blueprint and detailed cookbook steps in a single call.
 */
export const buildRecipeBlueprint = async (dishName, inputs, optimizationPlan, evidenceSummary, recipeStructure = {}) => {
  const apiKey = process.env.GROQ_API_KEY_ARCHITECT || process.env.GROQ_API_KEY;
  const modelName = 'llama-3.1-8b-instant';

  const defaultBlueprint = {
    dish_name: `Healthy ${dishName}`,
    category: "Nutritious Twist",
    description: `A wholesome, calorie-conscious remake of traditional ${dishName}.`,
    calories: 380,
    protein: "22g",
    fiber: "8g",
    fats: "9g",
    sodium: "450mg",
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
      { name: "Cold-pressed Olive or Avocado Oil", quantity: "1 tbsp" }
    ],
    steps: [
      {
        title: "Prepare Ingredients",
        time: "10 min",
        heatLevel: "None",
        ingredients: [
          { name: "High-protein Paneer, Tofu, or Lentils", qty: "200g" }
        ],
        instructions: [
          "Clean and slice the protein source into uniform cubes.",
          "Steam or lightly blanch the fresh seasonal vegetables and set aside."
        ],
        techniques: ["Prepping ingredients", "Blanching veggies"],
        visualCues: {
          time: "10 minutes",
          heat: "None",
          texture: "Firm cubes, vibrant vegetables",
          aroma: "Fresh and clean",
          goal: "Ready elements for fast cooking"
        },
        chefTip: "Keeping vegetable slices uniform ensures they cook evenly.",
        commonMistakes: "Do not over-boil the vegetables, which destroys water-soluble vitamins."
      },
      {
        title: "Combine and Finish",
        time: "15 min",
        heatLevel: "Medium-Low",
        ingredients: [
          { name: "Cold-pressed Olive or Avocado Oil", qty: "1 tbsp" }
        ],
        instructions: [
          "Heat cold-pressed oil in a sauté pan over medium-low heat.",
          "Toss the prepared protein cubes and blanched vegetables together, dusting with herbs and low-sodium seasoning."
        ],
        techniques: ["Sautéing", "Infusing herbs"],
        visualCues: {
          time: "15 minutes",
          heat: "Medium-Low",
          texture: "Lightly glazed and heated through",
          aroma: "Savory herbs and toasted oil",
          goal: "Assemble the balanced meal layers"
        },
        chefTip: "Serve hot over the warm whole grains.",
        commonMistakes: "Do not overheat cold-pressed oil, which breaks down healthy fats."
      }
    ]
  };

  if (!apiKey) {
    logger.warn('GROQ_API_KEY is not defined. Returning default blueprint.');
    return defaultBlueprint;
  }

  try {
    const systemPrompt = `Role: Professional Recipe Architect & Cookbook Writer.
Task: Design structural blueprint & cooking steps for a healthy recipe that stays faithful to the requested dish.
CORE RULE: The final "ingredients" list MUST still include every ingredient in TRADITIONAL CORE INGREDIENTS below, unless PROPOSED OPTIMIZATIONS explicitly swaps it out (that list is the only authorized set of substitutions — do not invent your own). Healthify the dish through quantities, cooking method, added vegetables, and the adjustments already given to you, not by silently replacing what makes the dish "${dishName}".
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
  "steps": [{
    "title": "string",
    "time": "string",
    "heatLevel": "string",
    "ingredients": [{"name": "string", "qty": "string"}],
    "instructions": ["string"],
    "techniques": ["string"],
    "visualCues": {
      "time": "string",
      "heat": "string",
      "texture": "string",
      "aroma": "string",
      "goal": "string"
    },
    "chefTip": "string",
    "commonMistakes": "string"
  }]
}`;

    const traditionalIngredients = recipeStructure.primaryIngredients || [];

    const userPrompt = `Create a healthy recipe blueprint with detailed sequential cooking steps for the dish: "${dishName}"
${traditionalIngredients.length > 0 ? `
TRADITIONAL CORE INGREDIENTS (must appear in the final "ingredients" list unless swapped below):
${traditionalIngredients.join(', ')}
Cuisine: ${recipeStructure.cuisine || 'Generic'}
` : ''}
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

Output the clean, complete JSON object. Make sure all ingredients in the steps reference the master ingredients list.
IMPORTANT: You MUST write the ENTIRE recipe. Include at least 4 to 6 detailed cooking steps in the "steps" array (e.g. Prep, Cook, Combine, Garnish). Do not stop at 2 steps.`;

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
