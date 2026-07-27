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
 * Generates an image of a dish using Stability AI with SSL verification disabled.
 * 
 * @param {string} dishName - Name of the dish.
 * @returns {Promise<string|null>} - Base64 Data URL of the generated image or null.
 */
export const generateDishImage = async (dishName) => {
  const apiKey = process.env.STABILITY_API_KEY;
  
  if (!apiKey) {
    logger.warn('STABILITY_API_KEY is not defined in environment variables. Image generation will be skipped.');
    return null;
  }

  logger.info(`Sending text-to-image request to Stability AI for "${dishName}" using Axios...`);

  const url = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

  try {
    const response = await axios.post(
      url,
      {
        text_prompts: [
          {
            text: `High-end professional food photography of a healthy, delicious version of ${dishName}. Beautifully plated, modern restaurant presentation, clean background, warm natural lighting, macro shot, highly detailed, photorealistic, 8k resolution`,
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
