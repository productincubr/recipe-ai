/**
 * Placeholder data for the "Continue Cooking" fold (Fold 2).
 * No backend — shaped so it can later be swapped for an API response.
 *
 * `accent` maps to a pastel theme used for the status badge + Continue button.
 * The first card is `featured` and additionally renders an "AI remembers" box.
 */
export const continueCookingRecipes = [
  {
    id: 'butter-chicken',
    title: 'Butter Chicken',
    image:
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=600&fit=crop',
    status: 'Last opened\n2 hrs ago',
    calories: '520 kcal',
    protein: '28g Protein',
    time: '30 mins',
    accent: 'olive',
    featured: true,
    aiRemembers: 'You reduced oil by 20% last time.',
    cta: 'Continue Cooking',
  },
  {
    id: 'thai-green-curry',
    title: 'Thai Green Curry',
    image:
      'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&h=600&fit=crop',
    status: 'Viewed\nYesterday',
    calories: '450 kcal',
    protein: '28g Protein',
    time: '25 mins',
    accent: 'sage',
    cta: 'Continue',
  },
  {
    id: 'rajma-bowl',
    title: 'Rajma Bowl',
    image:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=600&fit=crop',
    status: 'Viewed\n2 days ago',
    calories: '480 kcal',
    protein: '30g Protein',
    time: '40 mins',
    accent: 'amber',
    cta: 'Continue',
  },
  {
    id: 'paneer-wrap',
    title: 'Paneer Wrap',
    image:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop',
    status: 'Edited\n3 days ago',
    calories: '420 kcal',
    protein: '26g Protein',
    time: '20 mins',
    accent: 'lilac',
    cta: 'Continue',
  },
  {
    id: 'quinoa-bowl',
    title: 'Quinoa Bowl',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=600&fit=crop',
    status: 'Viewed\n4 days ago',
    calories: '390 kcal',
    protein: '22g Protein',
    time: '15 mins',
    accent: 'sage',
    cta: 'Continue',
  },
]
