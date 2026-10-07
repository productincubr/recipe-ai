-- Stores the full recipe extras (equipment, substitutions, storage, extra
-- nutrition, allergens, ...) and the optimization plan alongside each recipe.
ALTER TABLE public.recipes
    ADD COLUMN IF NOT EXISTS details JSONB,
    ADD COLUMN IF NOT EXISTS optimization_plan JSONB;
