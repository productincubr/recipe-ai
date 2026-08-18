/**
 * Placeholder data for the "Culinary Channel" fold (Fold 4).
 * No backend — shaped so it can later be swapped for an API response.
 */
import { Leaf, Users, Heart } from 'lucide-react'

/**
 * The three feature badges beneath the section heading.
 * Each has a pastel theme that colours the icon wash + icon.
 */
export const channelFeatures = [
  {
    id: 'real-ingredients',
    title: 'Real ingredients',
    description: 'Nourishing & wholesome',
    icon: Leaf,
    theme: 'sage',
  },
  {
    id: 'real-people',
    title: 'Real people',
    description: 'Sharing from the heart',
    icon: Users,
    theme: 'amber',
  },
  {
    id: 'real-good',
    title: 'Real good',
    description: 'For you. For life.',
    icon: Heart,
    theme: 'terracotta',
  },
]

/**
 * Tag pill colour themes for the video cards, keyed by tag label.
 * Falls back to `sage` for any tag not listed here.
 */
export const videoTagThemes = {
  Vegetarian: 'sage',
  'Quick Meal': 'terracotta',
  'High Protein': 'sage',
  'Low Calorie': 'terracotta',
  'High Fiber': 'sage',
  Vegan: 'olive',
  'Antioxidant Rich': 'lilac',
  'No Sugar Added': 'lilac',
  'Healthy Dessert': 'lilac',
  'Gluten Free': 'sage',
}

/**
 * The hero photo shown on the right of the section header. The image itself
 * is the uploaded HeroImageArea.png asset (imported directly in the component);
 * only the alt text lives here.
 */
export const channelHero = {
  alt: 'Two friends cooking together in the kitchen, sharing fresh vegetables',
}

/**
 * Video cards for the grid. `views` and `uploadedAgo` back the YouTube-style
 * metadata line rendered under each thumbnail.
 */
export const channelVideos = [
  {
    id: 'creamy-pesto-pasta',
    title: 'Creamy Pesto Pasta',
    image:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=700&h=500&fit=crop',
    tags: ['Vegetarian', 'Quick Meal'],
    duration: '08:24',
    youtubeId: 'OrKuktJqGJo',
    chef: 'Chef Maya Rao',
    difficulty: 'Easy',
    views: '128K views',
    uploadedAgo: '2 weeks ago',
  },
  {
    id: 'tofu-stir-fry-bowl',
    title: 'Tofu Stir Fry Bowl',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=700&h=500&fit=crop',
    tags: ['High Protein', 'Low Calorie'],
    duration: '09:15',
    youtubeId: 'U67i1TAIr2U',
    chef: 'Chef Arjun Mehta',
    difficulty: 'Easy',
    views: '86K views',
    uploadedAgo: '5 days ago',
  },
  {
    id: 'quinoa-veggie-bowl',
    title: 'Quinoa Veggie Bowl',
    image:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&h=500&fit=crop',
    tags: ['High Fiber', 'Vegan'],
    duration: '07:48',
    youtubeId: 'mPaJFxzwi-U',
    chef: 'Chef Priya Nair',
    difficulty: 'Easy',
    views: '204K views',
    uploadedAgo: '3 weeks ago',
  },
  {
    id: 'berry-smoothie-bowl',
    title: 'Berry Smoothie Bowl',
    image:
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=700&h=500&fit=crop',
    tags: ['Antioxidant Rich', 'No Sugar Added'],
    duration: '08:03',
    youtubeId: 's9f08Qsz-KE',
    chef: 'Chef Maya Rao',
    difficulty: 'Easy',
    views: '312K views',
    uploadedAgo: '1 month ago',
  },
  {
    id: 'stuffed-bell-peppers',
    title: 'Stuffed Bell Peppers',
    image:
      'https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=700&h=500&fit=crop',
    tags: ['Vegetarian', 'High Protein'],
    duration: '10:12',
    youtubeId: 'Go_v-2MLxCw',
    chef: 'Chef Arjun Mehta',
    difficulty: 'Medium',
    views: '57K views',
    uploadedAgo: '4 days ago',
  },
  {
    id: 'chocolate-avocado-mousse',
    title: 'Chocolate Avocado Mousse',
    image:
      'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=700&h=500&fit=crop',
    tags: ['Healthy Dessert', 'Gluten Free'],
    duration: '05:47',
    youtubeId: 'wuZffe60q4M',
    chef: 'Chef Priya Nair',
    difficulty: 'Easy',
    views: '441K views',
    uploadedAgo: '6 days ago',
  },
]

/**
 * Bottom information strip items, separated by thin dividers.
 */
export const channelStrip = [
  'New videos every week',
  'Simple recipes',
  'Big flavor',
  'Better you',
]
