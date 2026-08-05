import axios from 'axios';
import https from 'https';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const GEMINI_MODEL = 'gemini-flash-latest';

const SYSTEM_PROMPT = `You are a food recognition and nutrition estimation system. Analyze the photo of a meal and respond with STRICT JSON only — no markdown, no code fences, no prose — matching exactly this schema:
{
  "dish_name": "string",
  "confidence": number (0-100, how confident you are in the dish identification),
  "category": "string (e.g. Main Course, Snack, Dessert, Breakfast)",
  "cuisine": "string",
  "calories": number,
  "protein": "string, e.g. '25g'",
  "fats": "string, e.g. '10g'",
  "fiber": "string, e.g. '4g'",
  "sugar": "string, e.g. '6g'",
  "ingredients": [{"name": "string", "qty": "string"}]
}
Estimate nutrition for the single typical serving shown in the photo. List every visually identifiable ingredient with an approximate quantity. If the photo does not clearly show food, still return your best-guess JSON with a low confidence score.`;

const getFallbackScan = () => ({
  dish_name: 'Unrecognized Dish',
  confidence: 0,
  category: 'Unknown',
  cuisine: 'Unknown',
  calories: 0,
  protein: '0g',
  fats: '0g',
  fiber: '0g',
  sugar: '0g',
  ingredients: [],
});

/**
 * Sends a food photo to Gemini's vision model and returns a structured
 * dish + nutrition + ingredients estimate.
 *
 * @param {string} base64Image - Raw base64 image data (no data: prefix).
 * @param {string} mimeType - e.g. 'image/jpeg'.
 * @returns {Promise<object>} Parsed scan result, or a low-confidence fallback on failure.
 */
export const scanMealImage = async (base64Image, mimeType) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.warn('GEMINI_API_KEY is not defined. Meal scan cannot run.');
    throw new Error('Meal scanning is not configured on the server.');
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { inline_data: { mime_type: mimeType, data: base64Image } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      },
      {
        httpsAgent,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini Vision.');

    const parsed = JSON.parse(text);
    return { ...getFallbackScan(), ...parsed };
  } catch (error) {
    const detail = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error('Meal scan via Gemini Vision failed:', { error: detail });
    throw new Error('Failed to analyze the photo. Please try again.');
  }
};
