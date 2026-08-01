/**
 * Placeholder data for the "Trending" fold (Fold 3).
 * No backend — shaped so it can later be swapped for an API response.
 */
import {
  Droplet,
  Baby,
  Leaf,
  Flame,
  Sprout,
  Dumbbell,
  Drumstick,
  Heart,
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

const TAGS = [
  { id: 'protein', label: 'High Protein', icon: Drumstick },
  { id: 'carb', label: 'Low Carb', icon: Leaf },
  { id: 'kid', label: 'Kid Friendly', icon: Heart },
]

/**
 * Trending recipe cards. Shape matches RecipeCard's props: title (bold) +
 * subtitle (italic), a short arrow description, viewed meta, and 3 tags.
 */
export const trendingRecipes = [
  {
    id: 'harissa-chicken-bowl',
    title: 'Harissa',
    subtitle: 'Chicken Bowl',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=700&fit=crop',
    viewedLabel: 'Viewed',
    timeAgo: '1 day ago',
    description: 'Protein packed with quinoa',
    tags: TAGS,
  },
  {
    id: 'creamy-pesto-pasta',
    title: 'Creamy',
    subtitle: 'Pesto Pasta',
    image:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=700&fit=crop',
    viewedLabel: 'Viewed',
    timeAgo: '2 days ago',
    description: 'Protein packed with quinoa',
    tags: TAGS,
  },
  {
    id: 'lentil-veg-chawal',
    title: 'Lentil & Veg',
    subtitle: 'Chawal',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=700&fit=crop',
    viewedLabel: 'Viewed',
    timeAgo: '2 days ago',
    description: 'Protein packed with quinoa',
    tags: TAGS,
  },
  {
    id: 'tofu-stir-fry-bowl',
    title: 'Tofu Stir',
    subtitle: 'Fry Bowl',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=700&fit=crop',
    viewedLabel: 'Viewed',
    timeAgo: '3 days ago',
    description: 'Protein packed with quinoa',
    tags: TAGS,
  },
  {
    id: 'oats-banana-pancakes',
    title: 'Oats Banana',
    subtitle: 'Pancakes',
    image:
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=700&fit=crop',
    viewedLabel: 'Viewed',
    timeAgo: '4 days ago',
    description: 'Protein packed with quinoa',
    tags: TAGS,
  },
  {
    id: 'quinoa-veggie-bowl',
    title: 'Quinoa',
    subtitle: 'Veggie Bowl',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=700&fit=crop',
    viewedLabel: 'Viewed',
    timeAgo: '5 days ago',
    description: 'Protein packed with quinoa',
    tags: TAGS,
  },
  {
    id: 'choco-chia-pudding',
    title: 'Choco Chia',
    subtitle: 'Pudding',
    image:
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&h=700&fit=crop',
    viewedLabel: 'Viewed',
    timeAgo: '6 days ago',
    description: 'Protein packed with quinoa',
    tags: TAGS,
  },
]
