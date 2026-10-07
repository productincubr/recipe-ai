// Groq retires models regularly; override via env instead of editing code.
export const GROQ_RECIPE_MODEL = process.env.GROQ_RECIPE_MODEL || 'openai/gpt-oss-120b';
export const GROQ_FAST_MODEL = process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';
