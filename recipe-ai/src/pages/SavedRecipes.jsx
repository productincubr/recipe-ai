import { useEffect, useState } from 'react';
import { getSavedRecipes, removeSavedRecipe } from '../services/userFeaturesApi';
import RecipeCard from '../components/RecipeCard/RecipeCard';
import { BookmarkMinus } from 'lucide-react';

export default function SavedRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = () => {
    setLoading(true);
    getSavedRecipes().then(res => {
      if (res.success) {
        setRecipes(res.data);
      }
      setLoading(false);
    });
  };

  const handleRemove = async (id) => {
    await removeSavedRecipe(id);
    fetchSaved();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-olive-dark">Saved Recipes</h1>
      {loading ? (
        <p>Loading saved recipes...</p>
      ) : recipes.length === 0 ? (
        <p>You haven't saved any recipes yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <div key={recipe.id} className="relative">
              <RecipeCard recipe={recipe} initialSaved={true} />
              <button 
                onClick={() => handleRemove(recipe.id)}
                className="absolute top-4 right-4 bg-white p-2 rounded-full shadow hover:bg-red-50 text-red-500 z-10"
                title="Remove from saved"
              >
                <BookmarkMinus size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
