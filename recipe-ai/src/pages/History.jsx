import { useEffect, useState } from 'react';
import { getHistory } from '../services/userFeaturesApi';
import RecipeCard from '../components/RecipeCard/RecipeCard';

export default function History() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then(res => {
      if (res.success) {
        setRecipes(res.data);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-olive-dark">Your Recipe History</h1>
      {loading ? (
        <p>Loading history...</p>
      ) : recipes.length === 0 ? (
        <p>No recipes found in history.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
