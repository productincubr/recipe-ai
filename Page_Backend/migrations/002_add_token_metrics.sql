-- =========================================================================
-- Migration: 002_add_token_metrics
-- Adds columns to public.recipe_requests to store LLM token usage and pricing.
-- =========================================================================

ALTER TABLE public.recipe_requests
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'unknown';
