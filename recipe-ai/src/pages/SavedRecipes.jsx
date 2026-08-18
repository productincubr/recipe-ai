import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkX } from 'lucide-react';
import { getSavedRecipes } from '../services/userFeaturesApi';
import RecipeCard from '../components/RecipeCard/RecipeCard';
import RecipeCardSkeleton from '../components/RecipeCard/RecipeCardSkeleton';
import { getRecipeImage } from '../utils/recipeFallbackImage';
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

export default function SavedRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toggleSave } = useSavedRecipes();

  useEffect(() => {
    getSavedRecipes().then((res) => {
      if (res.success) {
        setRecipes(res.data);
      }
      setLoading(false);
    });
  }, []);

  const handleRemove = (id) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    toggleSave(id);
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <h1 className="mb-1 font-serif text-3xl font-bold text-ink">Saved Recipes</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Every recipe you've bookmarked, ready whenever you want to cook it again.
      </p>

      {loading ? (
        <div className="grid justify-items-center gap-6 [grid-template-columns:repeat(auto-fill,minmax(258px,1fr))] sm:justify-items-start">
          {Array.from({ length: 8 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-cream-300 bg-cream-100 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-olive-soft text-olive-dark">
            <BookmarkX size={20} />
          </span>
          <p className="text-sm text-ink-soft">You haven't saved any recipes yet.</p>
          <p className="max-w-xs text-xs text-ink-muted">
            Tap the bookmark icon on any recipe to keep it here for later.
          </p>
        </div>
      ) : (
        <div className="grid justify-items-center gap-6 [grid-template-columns:repeat(auto-fill,minmax(258px,1fr))] sm:justify-items-start">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              image={getRecipeImage(recipe)}
              title={recipe.dish_name}
              subtitle={recipe.cuisine || recipe.category}
              description={recipe.description}
              timeAgo={timeAgo(recipe.created_at)}
              onOpen={() => navigate(`/recipe/${recipe.id}`)}
              onSave={() => handleRemove(recipe.id)}
              saved
            />
          ))}
        </div>
      )}
    </div>
  );
}
