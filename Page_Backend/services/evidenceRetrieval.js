import axios from 'axios';
import https from 'https';
import Exa from 'exa-js';
import logger from '../config/logger.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Synthesizes Exa search highlights into a clean clinical guidelines summary using Groq.
 */
const synthesizeEvidenceWithGroq = async (conditions, highlightsText) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return highlightsText;

  try {
    const systemPrompt = `You are a clinical research summarizer.
Your task is to synthesize the search results from trusted medical websites (WHO, NIH, ADA, etc.)
into a clean, structured evidence summary for a patient's nutrition planner.
Focus strictly on nutritional guidelines (GI index, sodium limits, protein, fats, fibers).
You MUST output ONLY a plain text summary under 120 words with 3-4 bullet points. No JSON, no markdown blocks.`;

    const userPrompt = `Synthesize these guidelines for health conditions: ${conditions.join(', ')}

Highlights from search results:
${highlightsText}`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
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
      return response.data.choices[0].message.content.trim();
    }
  } catch (error) {
    logger.warn('Failed to synthesize Exa highlights with Groq. Returning raw text.', { error: error.message });
  }
  return highlightsText;
};

/**
 * Retrieves evidence-based dietary recommendations.
 * 
 * @param {object} healthProfile - Unified health context
 * @returns {Promise<object>} - Evidence summary and citations sources
 */
export const retrieveEvidence = async (healthProfile) => {
  const apiKey = process.env.EXA_API_KEY;
  const conditions = [
    ...(healthProfile.medicalConditions || []),
    ...(healthProfile.goals || [])
  ].filter(Boolean);

  // Predefined local evidence database for common conditions (safe fallback)
  const localEvidenceDB = {
    "diabetes": {
      summary: "- Prefer low glycemic index carbohydrates to prevent glucose spikes.\n- Increase dietary soluble fiber to improve insulin sensitivity.\n- Minimize added sugars and refined carbohydrates.\n- Choose lean plant or clean animal proteins.",
      sources: ["ADA (American Diabetes Association) Guidelines", "NIH MedlinePlus"]
    },
    "hypertension": {
      summary: "- Limit sodium intake strictly to under 1500mg/day.\n- Follow the DASH diet pattern (high potassium, calcium, magnesium).\n- Prioritize healthy mono/polyunsaturated fats and reduce saturated fats.\n- Avoid highly processed or high-sodium sauces.",
      sources: ["AHA (American Heart Association) Guidelines", "Mayo Clinic Care"]
    },
    "pcos": {
      summary: "- Focus on anti-inflammatory whole-food ingredients.\n- Prioritize low glycemic load foods to manage insulin resistance.\n- Ensure moderate lean protein and healthy fats (seeds, walnuts).\n- Limit highly refined carbs and trans fats.",
      sources: ["NIH Office of Women's Health", "Mayo Clinic Research"]
    },
    "ibs": {
      summary: "- Limit high FODMAP ingredients (like raw garlic, onions, wheat).\n- Adjust soluble vs insoluble fiber to manage digestion triggers.\n- Limit spicy seasonings and raw trigger oils.\n- Maintain simple, gut-friendly cooking steps.",
      sources: ["NIH National Institute of Diabetes", "Mayo Clinic IBS Diet"]
    },
    "kidney": {
      summary: "- Control protein density to manage renal filtration workload (target <25g per meal).\n- Control sodium and avoid potassium/phosphorus heavy additives.\n- Choose high-quality, whole-food ingredients.",
      sources: ["National Kidney Foundation (NKF)", "NIH NIDDK"]
    },
    "heart": {
      summary: "- Reduce saturated fats and replace with cold-pressed olive or avocado oils.\n- Increase daily soluble fiber (oats, seeds, pulses) to lower LDL cholesterol.\n- Ensure low sodium cooking limits and zero trans fats.",
      sources: ["AHA/ASA guidelines", "World Health Organization (WHO)"]
    }
  };

  // Find matching local presets
  let matchedPreset = null;
  for (const condition of conditions) {
    const cLower = condition.toLowerCase();
    for (const key of Object.keys(localEvidenceDB)) {
      if (cLower.includes(key) || key.includes(cLower)) {
        matchedPreset = localEvidenceDB[key];
        break;
      }
    }
    if (matchedPreset) break;
  }

  // Default fallback if no conditions match
  const defaultEvidence = {
    summary: "- Focus on clean whole-food ingredients and evidence-informed nutrition.\n- Maintain portion-conscious servings and balanced macronutrient distribution.\n- Minimize refined carbohydrates and processed seed oils.",
    sources: ["World Health Organization (WHO) Healthy Diet Guidelines"]
  };

  const finalLocalFallback = matchedPreset || defaultEvidence;

  if (!apiKey) {
    logger.info("EXA_API_KEY is not defined. Using local evidence database fallback.");
    return finalLocalFallback;
  }

  try {
    const exa = new Exa(apiKey);
    const query = `clinical dietary guidelines and recommendations for ${conditions.join(' and ')}`;
    logger.info(`Querying Exa API: "${query}"`);

    const includeDomains = [
      "who.int",
      "nih.gov",
      "diabetes.org",
      "heart.org",
      "mayoclinic.org",
      "kidney.org",
      "medlineplus.gov"
    ];

    const searchResult = await exa.search(query, {
      type: "auto",
      numResults: 4,
      includeDomains,
      contents: {
        highlights: true
      }
    });

    if (searchResult && searchResult.results && searchResult.results.length > 0) {
      const highlightsText = searchResult.results
        .map(r => `[Source: ${r.title}]\n${(r.highlights || []).join(' ')}`)
        .join('\n\n');
      
      const summary = await synthesizeEvidenceWithGroq(conditions, highlightsText);
      const sources = searchResult.results.map(r => r.title || r.url);
      
      return {
        summary,
        sources
      };
    }
  } catch (error) {
    logger.error("Exa Neural Search failed. Falling back to local guidelines:", { error: error.message });
  }

  return finalLocalFallback;
};
