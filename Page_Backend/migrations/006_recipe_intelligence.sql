-- =========================================================================
-- Migration: 006_recipe_intelligence
-- Normalised storage for the recipe validation system: the ingredient
-- reference database, each recipe's ingredients and steps, calculated
-- nutrition with its sources, diet/allergen data, substitutions, and every
-- validation run with its quality score.
--
-- Additive only: no existing table or column is changed or dropped, and
-- recipes.details keeps the full validated recipe (what the website reads).
-- Safe to run more than once.
--
-- Security: RLS is enabled on every new table. The backend writes with the
-- service-role key (which bypasses RLS). Browsers get read access only to the
-- public ingredient reference data; recipe-derived tables have no anon
-- policies, so they are reachable only through the backend API.
-- =========================================================================

-- ---------- Ingredient reference database (USDA FoodData Central) ----------
CREATE TABLE IF NOT EXISTS public.ingredients (
    id                 TEXT PRIMARY KEY,                -- e.g. 'ING_TOFU_FIRM'
    name               TEXT NOT NULL,
    aliases            TEXT[] NOT NULL DEFAULT '{}',
    category           TEXT,
    state              TEXT,                            -- raw | cooked | dry | canned | as sold
    animal             TEXT,                            -- meat | poultry | fish | shellfish | dairy | egg | honey
    allergens          TEXT[] NOT NULL DEFAULT '{}',
    may_contain        TEXT[] NOT NULL DEFAULT '{}',    -- brand-dependent (e.g. shrimp paste in curry paste)
    gluten             TEXT NOT NULL DEFAULT 'false',   -- 'true' | 'false' | 'cross-contact'
    negligible         BOOLEAN NOT NULL DEFAULT FALSE,
    per_100g           JSONB,                           -- kcal, protein, carbs, fat, satFat, fiber, sugar, sodium (null = no data)
    density_g_per_ml   NUMERIC,
    portions           JSONB NOT NULL DEFAULT '{}',     -- household measures in grams: tsp, tbsp, cup, medium, clove ...
    source_dataset     TEXT NOT NULL,
    source_fdc_id      INTEGER,
    source_description TEXT,
    proxy_note         TEXT,
    variability        TEXT,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON public.ingredients (lower(name));

-- ---------- Recipe ingredients ----------
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id         UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    position          INTEGER NOT NULL,
    ref               TEXT NOT NULL,                    -- id used by recipe_steps.ingredients_used
    ingredient_id     TEXT REFERENCES public.ingredients(id) ON DELETE SET NULL,
    name              TEXT NOT NULL,
    quantity          NUMERIC,
    unit              TEXT,
    household         TEXT,
    display_quantity  TEXT,
    prep              TEXT,
    component         TEXT,
    optional          BOOLEAN NOT NULL DEFAULT FALSE,
    to_taste          BOOLEAN NOT NULL DEFAULT FALSE,
    grams             NUMERIC,
    eaten_fraction    NUMERIC,
    nutrition_source  TEXT,                             -- usda | label | unknown | negligible | optional
    match_status      TEXT,                             -- matched | unmatched
    UNIQUE (recipe_id, ref)
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients (ingredient_id);

-- ---------- Recipe steps ----------
CREATE TABLE IF NOT EXISTS public.recipe_steps (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id         UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    step_number       INTEGER NOT NULL,
    title             TEXT,
    technique         TEXT,
    heat_level        TEXT,
    temperature       TEXT,
    active_minutes    NUMERIC,
    passive_minutes   NUMERIC,
    passive_label     TEXT,
    depends_on        INTEGER[] NOT NULL DEFAULT '{}',
    optional          BOOLEAN NOT NULL DEFAULT FALSE,
    produces          TEXT,
    instructions      JSONB NOT NULL DEFAULT '[]',
    visual_cues       JSONB NOT NULL DEFAULT '[]',
    ingredients_used  JSONB NOT NULL DEFAULT '[]',      -- [{ref, quantity, unit}]
    chef_tip          TEXT,
    common_mistakes   TEXT,
    UNIQUE (recipe_id, step_number)
);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON public.recipe_steps (recipe_id);

-- ---------- Calculated nutrition (per serving) ----------
CREATE TABLE IF NOT EXISTS public.recipe_nutrition (
    recipe_id            UUID PRIMARY KEY REFERENCES public.recipes(id) ON DELETE CASCADE,
    servings             INTEGER,
    kcal                 NUMERIC,
    protein_g            NUMERIC,
    carbs_g              NUMERIC,
    fat_g                NUMERIC,
    sat_fat_g            NUMERIC,
    fiber_g              NUMERIC,
    sugar_g              NUMERIC,
    added_sugar_g        NUMERIC,
    sodium_mg            NUMERIC,
    grams_per_serving    NUMERIC,
    status               TEXT NOT NULL,                 -- complete | partial | insufficient
    coverage             NUMERIC,                       -- share of recipe weight with data (0-1)
    incomplete_nutrients JSONB NOT NULL DEFAULT '{}',
    note                 TEXT,
    engine_version       INTEGER NOT NULL DEFAULT 2,
    calculated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_nutrition_sources (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id          UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    ingredient_ref     TEXT,
    ingredient_id      TEXT REFERENCES public.ingredients(id) ON DELETE SET NULL,
    ingredient_name    TEXT,
    grams              NUMERIC,
    conversion         TEXT,                            -- how the amount was turned into grams
    source_type        TEXT,                            -- usda | label
    fdc_id             INTEGER,
    record_description TEXT
);
CREATE INDEX IF NOT EXISTS idx_recipe_nutrition_sources_recipe ON public.recipe_nutrition_sources (recipe_id);

-- ---------- Diet, allergens, food safety ----------
CREATE TABLE IF NOT EXISTS public.recipe_dietary_info (
    recipe_id     UUID PRIMARY KEY REFERENCES public.recipes(id) ON DELETE CASCADE,
    diet_type     TEXT,
    dietary_tags  TEXT[] NOT NULL DEFAULT '{}',
    allergens     TEXT[] NOT NULL DEFAULT '{}',
    may_contain   TEXT[] NOT NULL DEFAULT '{}',
    diet_note     TEXT,
    food_safety   JSONB NOT NULL DEFAULT '[]',
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_substitutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id       UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    ingredient_ref  TEXT,
    ingredient      TEXT NOT NULL,
    substitute      TEXT NOT NULL,
    note            TEXT,
    warning         TEXT
);
CREATE INDEX IF NOT EXISTS idx_recipe_substitutions_recipe ON public.recipe_substitutions (recipe_id);

-- ---------- Validation runs and quality scores (kept separately from the recipe) ----------
CREATE TABLE IF NOT EXISTS public.recipe_validations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id       UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    mode            TEXT NOT NULL,                      -- generate | read
    passed          BOOLEAN NOT NULL,                   -- no hard failures
    structured      BOOLEAN NOT NULL,                   -- steps carried ingredientsUsed
    checks          JSONB NOT NULL,
    issues          JSONB NOT NULL DEFAULT '[]',
    corrections     JSONB NOT NULL DEFAULT '[]',
    engine_version  INTEGER NOT NULL DEFAULT 2,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_validations_recipe ON public.recipe_validations (recipe_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.recipe_quality_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id       UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    validation_id   UUID REFERENCES public.recipe_validations(id) ON DELETE SET NULL,
    score           NUMERIC(3, 1) NOT NULL,             -- 0.0 - 10.0
    passed          BOOLEAN NOT NULL,
    status          TEXT NOT NULL,                      -- passed | below-threshold | failed
    categories      JSONB NOT NULL,
    hard_failures   JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_quality_scores_recipe ON public.recipe_quality_scores (recipe_id, created_at DESC);

-- ---------- Row Level Security ----------
ALTER TABLE public.ingredients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_steps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_nutrition         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_nutrition_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_dietary_info      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_substitutions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_validations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_quality_scores    ENABLE ROW LEVEL SECURITY;

-- Public reference data (USDA values): readable by anyone, writable only by the backend.
DROP POLICY IF EXISTS "Ingredient reference data is public" ON public.ingredients;
CREATE POLICY "Ingredient reference data is public" ON public.ingredients
    FOR SELECT TO anon, authenticated USING (true);
