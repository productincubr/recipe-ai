import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import { getHistory } from '../services/userFeaturesApi';
import RecipeCard from '../components/RecipeCard/RecipeCard';
import RecipeCardSkeleton from '../components/RecipeCard/RecipeCardSkeleton';
import { getRecipeImage } from '../utils/recipeFallbackImage';
import { readHistoryCache, writeHistoryCache } from '../utils/recentHistoryCache';
import { useSavedRecipes } from '../context/SavedRecipesContext';

function timeAgo(dateString) {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export default function History() {
  const cached = readHistoryCache();
  const [recipes, setRecipes] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const navigate = useNavigate();
  const { savedIds, toggleSave } = useSavedRecipes();

  useEffect(() => {
    getHistory().then(res => {
      if (res.success) {
        setRecipes(res.data);
        writeHistoryCache(res.data);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-olive-dark">Your Recipe History</h1>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center sm:justify-items-start gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-cream-300 bg-cream-100 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-olive-soft text-olive-dark">
            <UtensilsCrossed size={20} />
          </span>
          <p className="text-sm text-ink-soft">No recipes found in history yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center sm:justify-items-start gap-6">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              image={getRecipeImage(recipe)}
              title={recipe.dish_name}
              subtitle={recipe.cuisine || recipe.category}
              description={recipe.description}
              timeAgo={timeAgo(recipe.created_at)}
              onOpen={() => navigate(`/recipe/${recipe.id}`)}
              saved={savedIds.has(recipe.id)}
              onSave={() => toggleSave(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
