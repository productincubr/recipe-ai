import { useEffect, useState } from 'react';
import { getHistory } from '../services/userFeaturesApi';

export default function Nutrition() {
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

  // Simple aggregation for demonstration
  const totalCalories = recipes.reduce((sum, r) => sum + (parseInt(r.calories) || 0), 0);
  const avgCalories = recipes.length > 0 ? Math.round(totalCalories / recipes.length) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-olive-dark">Nutrition Overview</h1>
      
      {loading ? (
        <p>Loading nutrition data...</p>
      ) : recipes.length === 0 ? (
        <p>No data available yet. Generate some recipes to see your nutrition trends.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-ink-dark">Averages</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-cream-50 rounded-lg">
                <span className="font-medium text-ink-soft">Average Calories per Recipe</span>
                <span className="text-2xl font-bold text-olive">{avgCalories} kcal</span>
              </div>
              <p className="text-sm text-ink-muted mt-4">
                This is calculated based on your generated recipes history. Keep tracking for more accurate insights!
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-ink-dark">Recent Macros</h2>
            <div className="space-y-3">
              {recipes.slice(0, 5).map(r => (
                <div key={r.id} className="p-3 bg-cream-50 rounded-lg text-sm flex justify-between">
                  <span className="font-medium truncate w-1/3">{r.dish_name}</span>
                  <span className="text-ink-soft flex-1 text-right">
                    P: {r.protein} | F: {r.fats} | C: {r.fiber}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
