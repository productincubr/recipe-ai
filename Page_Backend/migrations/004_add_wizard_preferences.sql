-- Adds the remaining wizard step selections (Allergies, Cooking Style,
-- Taste & Spice) to the request log so every selection made in the
-- "Create Recipe" flow is persisted, not just the health goals.
ALTER TABLE public.recipe_requests
    ADD COLUMN IF NOT EXISTS allergies TEXT[],
    ADD COLUMN IF NOT EXISTS dietary_preference TEXT,
    ADD COLUMN IF NOT EXISTS spice_level TEXT;
