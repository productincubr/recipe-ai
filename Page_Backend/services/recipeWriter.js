import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Generates a single detailed step for the recipe.
 */
const writeSingleStep = async (dishName, blueprint, stepTitle, stepIndex, completedSteps, inputs, optimizationPlan, evidenceSummary) => {
  const apiKey = process.env.GROQ_API_KEY_WRITER || process.env.GROQ_API_KEY;
  const modelName = 'llama-3.1-8b-instant';

  const defaultStep = {
    title: stepTitle,
    time: "5-10 min",
    heatLevel: "Medium",
    ingredients: [],
    instructions: ["Proceed with preparation as directed."],
    techniques: ["Standard preparation"],
    visualCues: {
      time: "5-10 minutes",
      heat: "Medium",
      texture: "Consistent mix",
      aroma: "Fragrant",
      goal: "Prepare ingredients"
    },
    chefTip: "Work efficiently and safely.",
    commonMistakes: "Avoid rushing the prep."
  };

  if (!apiKey) return defaultStep;

  try {
    const systemPrompt = `You are a professional Cookbook Writer.
Your task is to write a single detailed step for a premium cookbook.
Do NOT write the whole recipe. Write ONLY the requested step.
You MUST output ONLY a valid JSON object matching the requested schema. No markdown blocks.

Expected JSON structure:
{
  "title": "Step Title",
  "time": "e.g. 10 min",
  "heatLevel": "e.g. None / Low / Medium / High",
  "ingredients": [
    {
      "name": "Ingredient Name used in this step",
      "qty": "Exact metric quantity (e.g. 150 g, 1 tbsp)"
    }
  ],
  "instructions": [
    "Instruction sentence 1 (highly detailed, e.g. Heat 1 tbsp of olive oil in a wide heavy-bottomed skillet over medium heat.)",
    "Instruction sentence 2 (e.g. Add the finely chopped onions and sauté for 5-6 minutes, stirring occasionally.)"
  ],
  "techniques": [
    "Professional technique used (e.g. Sautéing, Deglazing, Tempering spices, Resting meat, Simmering)"
  ],
  "visualCues": {
    "time": "Time details (e.g. 5-6 minutes)",
    "heat": "Heat level details (e.g. Medium-High)",
    "texture": "Expected texture / color (e.g. Translucent and soft with golden edges)",
    "aroma": "Expected aroma (e.g. Sweet caramelized onions)",
    "goal": "Expected target (e.g. Cook onions until sweat and caramelized)"
  },
  "chefTip": "Professional cooking advice for this step",
  "commonMistakes": "Mistake to avoid during this step (e.g. Do not overcrowd the pan or keep heat too high, which burns garlic.)"
}`;

    const userPrompt = `Write Step ${stepIndex + 1}: "${stepTitle}" for healthy recipe: "${dishName}"

MASTER BLUEPRINT DETAILS:
Cuisine: ${blueprint.cuisine}
Prep Time: ${blueprint.prepTime}
Cook Time: ${blueprint.cookTime}
Difficulty: ${blueprint.difficulty}
Master Ingredients & Quantities: ${JSON.stringify(blueprint.ingredients)}

CLINICAL RECOMMENDATIONS:
${evidenceSummary}

PROPOSED SWAPS:
${JSON.stringify(optimizationPlan.swaps)}

PREVIOUS COMPLETED STEPS CONTEXT (what has already been cooked):
${completedSteps.length > 0 ? JSON.stringify(completedSteps.map(s => ({ title: s.title, ingredients: s.ingredients }))) : 'None'}

Please construct the detailed cookbook step for "${stepTitle}". Only use ingredients that are listed in the Master Ingredients blueprint.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
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
    logger.error(`Recipe writer failed on step index ${stepIndex}:`, { error: error.message });
  }

  return defaultStep;
};

/**
 * Sequential step-by-step recipe writer loop.
 */
export const writeRecipeSteps = async (dishName, blueprint, inputs, optimizationPlan, evidenceSummary) => {
  const completedSteps = [];

  logger.info(`Starting sequential step generation for blueprint steps: [${blueprint.steps.join(', ')}]`);

  for (let i = 0; i < blueprint.steps.length; i++) {
    if (i > 0) {
      // 600ms safety sleep to let Groq rate limits breathe
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    const stepTitle = blueprint.steps[i];
    logger.info(`Recipe Writer Agent: Generating Step ${i + 1}/${blueprint.steps.length}: "${stepTitle}"`);
    
    const stepDetails = await writeSingleStep(
      dishName,
      blueprint,
      stepTitle,
      i,
      completedSteps,
      inputs,
      optimizationPlan,
      evidenceSummary
    );
    
    completedSteps.push(stepDetails);
  }

  return completedSteps;
};
