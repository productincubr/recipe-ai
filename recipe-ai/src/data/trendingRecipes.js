/**
 * Placeholder data for the "Trending Recipes" fold (Fold 3).
 * No backend — shaped so it can later be swapped for an API response.
 */
import {
  Droplet,
  Baby,
  Leaf,
  Flame,
  Sprout,
  Dumbbell,
} from 'lucide-react'

/**
 * Diet filter chips. Each has a pastel theme + matching icon.
 * `id` is the value you'd send to an API when wiring up real filtering.
 */
export const dietFilters = [
  { id: 'diabetes-friendly', label: 'Diabetes Friendly', icon: Droplet, theme: 'lilac' },
  { id: 'kids-friendly', label: 'Kids Friendly', icon: Baby, theme: 'amber' },
  { id: 'keto-friendly', label: 'Keto Friendly', icon: Leaf, theme: 'sage' },
  { id: 'low-calorie', label: 'Low Calorie', icon: Flame, theme: 'terracotta' },
  { id: 'high-fiber', label: 'High Fiber', icon: Sprout, theme: 'olive' },
  { id: 'high-protein', label: 'High Protein', icon: Dumbbell, theme: 'cream' },
]

/**
 * Tag pill colour themes, keyed by the tag label.
 * Falls back to `sage` for any tag not listed here.
 */
export const tagThemes = {
  'High Protein': 'sage',
  'Gluten Free': 'terracotta',
  Vegetarian: 'sage',
  'Quick Meal': 'terracotta',
  'High Fiber': 'sage',
  Vegan: 'sage',
  'Low Cal': 'terracotta',
  'Kids Friendly': 'amber',
  'Low Sugar': 'sage',
  'No Sugar Added': 'lilac',
}

/**
 * Trending recipe cards. `titleLines` renders the handwritten title across
 * one or more lines exactly like the design.
 */
export const trendingRecipes = [
  {
    id: 'harissa-chicken-bowl',
    title: 'Harissa Chicken Bowl',
    titleLines: ['Harissa', 'Chicken', 'Bowl'],
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=700&fit=crop',
    tags: ['High Protein', 'Gluten Free'],
  },
  {
    id: 'creamy-pesto-pasta',
    title: 'Creamy Pesto Pasta',
    titleLines: ['Creamy', 'Pesto', 'Pasta'],
    image:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=700&fit=crop',
    tags: ['Vegetarian', 'Quick Meal'],
  },
  {
    id: 'lentil-veg-stew',
    title: 'Lentil & Veg Stew',
    titleLines: ['Lentil &', 'Veg Stew'],
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=700&fit=crop',
    tags: ['High Fiber', 'Vegan'],
  },
  {
    id: 'tofu-stir-fry-bowl',
    title: 'Tofu Stir Fry Bowl',
    titleLines: ['Tofu', 'Stir Fry', 'Bowl'],
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=700&fit=crop',
    tags: ['High Protein', 'Low Cal'],
  },
  {
    id: 'oats-banana-pancakes',
    title: 'Oats Banana Pancakes',
    titleLines: ['Oats Banana', 'Pancakes'],
    image:
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=700&fit=crop',
    tags: ['Kids Friendly', 'Low Sugar'],
  },
  {
    id: 'quinoa-veggie-bowl',
    title: 'Quinoa Veggie Bowl',
    titleLines: ['Quinoa', 'Veggie', 'Bowl'],
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=700&fit=crop',
    tags: ['High Fiber', 'Vegan'],
  },
  {
    id: 'choco-chia-pudding',
    title: 'Choco Chia Pudding',
    titleLines: ['Choco', 'Chia', 'Pudding'],
    image:
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&h=700&fit=crop',
    tags: ['Vegan', 'No Sugar Added'],
  },
]
