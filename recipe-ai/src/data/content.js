import { Camera, Soup, Leaf } from 'lucide-react'

export const featureCards = [
  {
    id: 'scan-a-meal',
    accent: 'amber',
    icon: Camera,
    title: 'Scan a Meal',
    description: 'Upload a photo of your dish to get recipe ideas.',
    image: 'https://images.unsplash.com/photo-1572448910681-3341d74893d2?q=80&w=800&auto=format&fit=crop',
    imageAlt: 'Bowl of grilled tofu with vegetables and avocado',
  },
  {
    id: 'ingredients',
    accent: 'teal',
    icon: Soup,
    title: 'Ingredients',
    description: 'Use ingredients you have at home.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop',
    imageAlt: 'Bowl of fresh vegetables and tomatoes',
  },
  {
    id: 'superfoods',
    accent: 'terracotta',
    icon: Leaf,
    title: 'Superfoods',
    description: 'Discover nutrient-rich ingredients.',
    image: 'https://images.unsplash.com/photo-1682622110332-d50f50b7146d?q=80&w=800&auto=format&fit=crop',
    imageAlt: 'Bowl of berries, nuts and grains',
  },
]

// Exactly 3 entries — do not repeat/concat this array anywhere.
/** Diet filter chips shown at the bottom of the hero. */
export const categories = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'veg', label: 'Veg', icon: 'leaf' },
  { id: 'non-veg', label: 'Non-Veg', icon: 'drumstick' },
  { id: 'vegan', label: 'Vegan', icon: 'sprout' },
  { id: 'gluten-free', label: 'Gluten Free', icon: 'wheat' },
  { id: 'high-protein', label: 'High Protein', icon: 'dumbbell' },
]