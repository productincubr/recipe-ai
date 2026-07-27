-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- Table 1: recipes
-- Stores detailed AI-customized healthier recipes
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dish_name TEXT NOT NULL,
    category TEXT,                          -- e.g., 'Classic Comfort Food'
    description TEXT,
    
    -- Nutrition Facts (per serving)
    calories INTEGER,                       -- e.g., 425
    protein TEXT,                           -- e.g., '18g'
    fiber TEXT,                             -- e.g., '12g'
    fats TEXT,                              -- e.g., '9g'
    sodium TEXT,                            -- e.g., '620mg'
    
    -- Recipe Metadata
    cooking_time TEXT,                      -- e.g., '35 mins'
    servings INTEGER DEFAULT 2,
    difficulty TEXT DEFAULT 'Easy',
    cuisine TEXT,                           -- e.g., 'North Indian'
    diet_type TEXT,                         -- e.g., 'Vegetarian'
    meal_type TEXT,                         -- e.g., 'Lunch, Dinner'
    best_for TEXT,                          -- e.g., 'Healthy meals'
    
    -- Structured Lists (PostgreSQL JSONB for nested items)
    ingredients JSONB NOT NULL,             -- Array of objects: [{"name": "Rajma", "qty": "1 cup"}, ...]
    steps JSONB NOT NULL,                   -- Array of strings/steps: ["Step 1 instructions", "Step 2..."]
    
    -- Health Explanations
    healthier_explanation TEXT,             -- AI details of why the recipe is healthier
    image_url TEXT,                         -- Optional image path
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on dish_name for quicker search lookups
CREATE INDEX IF NOT EXISTS idx_recipes_dish_name ON public.recipes(dish_name);

-- =========================================================================
-- Table 2: recipe_requests
-- Logs the user request query parameters (dish and targets)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.recipe_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dish_query TEXT NOT NULL,               -- The raw user search string
    selected_goals TEXT[] NOT NULL,         -- PostgreSQL array to store up to 3 selected goals
    generated_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for searching requests by dish query
CREATE INDEX IF NOT EXISTS idx_recipe_requests_query ON public.recipe_requests(dish_query);
