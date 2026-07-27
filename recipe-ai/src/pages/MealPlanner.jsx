import { useEffect, useState } from 'react';
import { getMealPlans, deleteMealPlan, getSavedRecipes, addMealPlan } from '../services/userFeaturesApi';

export default function MealPlanner() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedRecipes, setSavedRecipes] = useState([]);
  
  const [newPlan, setNewPlan] = useState({
    plan_date: new Date().toISOString().split('T')[0],
    meal_type: 'Dinner',
    recipe_id: ''
  });

  useEffect(() => {
    fetchPlans();
    getSavedRecipes().then(res => {
      if (res.success) setSavedRecipes(res.data);
    });
  }, []);

  const fetchPlans = () => {
    setLoading(true);
    getMealPlans().then(res => {
      if (res.success) {
        setPlans(res.data);
      }
      setLoading(false);
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newPlan.recipe_id) return;
    await addMealPlan(newPlan.plan_date, newPlan.meal_type, newPlan.recipe_id);
    fetchPlans();
  };

  const handleRemove = async (id) => {
    await deleteMealPlan(id);
    fetchPlans();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-olive-dark">Meal Planner</h1>
      
      <div className="bg-cream-100 p-6 rounded-2xl mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Add a Meal</h2>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Date</label>
            <input 
              type="date" 
              value={newPlan.plan_date}
              onChange={e => setNewPlan({...newPlan, plan_date: e.target.value})}
              className="w-full p-2 border border-cream-300 rounded-lg"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Meal Type</label>
            <select 
              value={newPlan.meal_type}
              onChange={e => setNewPlan({...newPlan, meal_type: e.target.value})}
              className="w-full p-2 border border-cream-300 rounded-lg"
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snacks</option>
            </select>
          </div>
          <div className="flex-[2]">
            <label className="block text-sm font-medium mb-1">Recipe (from Saved)</label>
            <select 
              value={newPlan.recipe_id}
              onChange={e => setNewPlan({...newPlan, recipe_id: e.target.value})}
              className="w-full p-2 border border-cream-300 rounded-lg"
              required
            >
              <option value="">Select a recipe</option>
              {savedRecipes.map(r => (
                <option key={r.id} value={r.id}>{r.dish_name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-olive hover:bg-olive-dark text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Add
          </button>
        </form>
      </div>

      {loading ? (
        <p>Loading meal plans...</p>
      ) : plans.length === 0 ? (
        <p>No meals planned yet.</p>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
              <div>
                <p className="font-bold text-lg">{new Date(plan.plan_date).toLocaleDateString()} - {plan.meal_type}</p>
                <p className="text-ink-soft">{plan.recipes?.dish_name}</p>
              </div>
              <button 
                onClick={() => handleRemove(plan.id)}
                className="text-red-500 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
