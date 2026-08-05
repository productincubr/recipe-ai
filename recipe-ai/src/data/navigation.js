/**
 * Static navigation + placeholder data for the app.
 * No backend — everything here is mock data used to render the UI.
 */
import {
  Home,
  History,
  Bookmark,
  CalendarDays,
  ShoppingBag,
  BarChart3,
  Camera,
} from 'lucide-react'

/** Primary sidebar navigation items. */
export const sidebarLinks = [
  { label: 'Home', icon: Home, to: '/', badge: null },
  { label: 'Scan a meal', icon: Camera, to: '/scan', badge: null },
  { label: 'History', icon: History, to: '/history', badge: null },
  { label: 'Saved recipes', icon: Bookmark, to: '/saved', badge: 12 },
  { label: 'Meal planner', icon: CalendarDays, to: '/meal-planner', badge: null },
  { label: 'Shopping list', icon: ShoppingBag, to: '/shopping-list', badge: null },
  { label: 'Nutrition', icon: BarChart3, to: '/nutrition', badge: null },
]

/** Recently generated recipes shown near the bottom of the sidebar. */
export const recentRecipes = [
  {
    id: 'butter-chicken',
    name: 'Butter chicken',
    time: '2 days ago',
    image:
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=120&h=120&fit=crop',
  },
  {
    id: 'pasta-salad',
    name: 'Pasta salad',
    time: '3 days ago',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=120&h=120&fit=crop',
  },
  {
    id: 'quinoa-bowl',
    name: 'Quinoa bowl',
    time: '5 days ago',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=120&h=120&fit=crop',
  },
  {
    id: 'veg-noodles',
    name: 'Veg noodles',
    time: '1 week ago',
    image:
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=120&h=120&fit=crop',
  },
]

/** Signed-in user (placeholder). */
export const currentUser = {
  name: 'Ananya Sharma',
  plan: 'Premium member',
  avatar:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop',
}

/** Top navbar links. */
export const navLinks = [
  { label: 'Explore', to: '/' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Pricing', to: '/pricing' },
]
