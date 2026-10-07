import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// Disable SSL certificate validation for environments with firewall/antivirus SSL interceptors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Generates a photo of this specific dish: Stability AI first, then Gemini.
 *
 * @param {string} dishName - Name of the dish.
 * @param {object} [details] - Extra recipe context to ground the image in what was actually cooked.
 * @param {string} [details.description] - Recipe description.
 * @param {Array<{name: string}>} [details.ingredients] - Recipe ingredients.
 * @param {string} [details.cuisine] - Recipe cuisine.
 * @returns {Promise<string|null>} - Base64 Data URL of the generated image or null.
 */
export const generateDishImage = async (dishName, details = {}) => {
  return (await generateWithStability(dishName, details)) || generateWithGemini(dishName, details);
};

// Override via env when Google renames/retires the model.
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

/**
 * Second provider, so a recipe still gets a photo of its own dish when
 * Stability AI has no key or credits.
 */
const generateWithGemini = async (dishName, details) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY is not defined. No image provider available.');
    return null;
  }

  const keyIngredients = keyIngredientsOf(details);
  const prompt = `Professional food photography of ${dishName}${details.cuisine ? ` (${details.cuisine} cuisine)` : ''}${keyIngredients ? `, made with ${keyIngredients}` : ''}. Show exactly this dish, beautifully plated, warm natural light, photorealistic, appetizing. No text, no people.`;

  logger.info(`Generating image for "${dishName}" with Gemini (${GEMINI_IMAGE_MODEL})...`);
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] }
      },
      { httpsAgent, timeout: 90000, headers: { 'Content-Type': 'application/json' } }
    );
    const image = response.data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!image) throw new Error('No image returned.');
    logger.info('Gemini image generated successfully.');
    return `data:${image.mimeType || 'image/png'};base64,${image.data}`;
  } catch (error) {
    logger.error(`Gemini image generation failed (${error.response?.status || 'no status'}): ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
};

const keyIngredientsOf = (details) =>
  Array.isArray(details.ingredients)
    ? details.ingredients.slice(0, 6).map((i) => i.name).filter(Boolean).join(', ')
    : '';

const generateWithStability = async (dishName, details) => {
  const apiKey = process.env.STABILITY_API_KEY;

  if (!apiKey) {
    logger.warn('STABILITY_API_KEY is not defined. Trying the next image provider.');
    return null;
  }

  logger.info(`Sending text-to-image request to Stability AI for "${dishName}" using Axios...`);

  const url = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

  const keyIngredients = keyIngredientsOf(details);

  const grounding = [
    details.cuisine ? `${details.cuisine} cuisine` : '',
    keyIngredients ? `made with ${keyIngredients}` : '',
    details.description || '',
  ].filter(Boolean).join('. ');

  try {
    const response = await axios.post(
      url,
      {
        text_prompts: [
          {
            text: `High-end professional food photography of ${dishName}, a healthy dish.${grounding ? ` ${grounding}.` : ''} The plate must accurately show these exact ingredients — no substitutions or invented components. Beautifully plated, modern restaurant presentation, clean background, warm natural lighting, macro shot, highly detailed, photorealistic, 8k resolution`,
            weight: 1.0
          },
          {
            text: `blurry, low quality, dark, messy, human, hands, fingers, face, text, logo, watermark, distorted, raw meat, unappetizing`,
            weight: -1.0
          }
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1,
      },
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (response.data && response.data.artifacts && response.data.artifacts.length > 0) {
      const base64Image = response.data.artifacts[0].base64;
      logger.info('Stability AI image generated successfully.');
      return `data:image/png;base64,${base64Image}`;
    }

    throw new Error('No image artifacts returned from Stability AI response.');
  } catch (error) {
    if (error.response) {
      const statusCode = error.response.status;
      const errorText = error.response.data ? JSON.stringify(error.response.data) : 'No error details';
      logger.error(`Stability AI API error status: ${statusCode}. Message: ${errorText}`);
    } else {
      logger.error('Failed to connect to Stability AI:', { error: error.message });
    }
    return null;
  }
};
