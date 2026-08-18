import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Coffee, Sun, Moon, Cookie, Trash2, ChefHat, Plus, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { getMealPlans, deleteMealPlan, getSavedRecipes, addMealPlan } from '../services/userFeaturesApi';
import { getRecipeImage } from '../utils/recipeFallbackImage';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

const MEAL_TYPE_META = {
  Breakfast: { icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50' },
  Lunch: { icon: Sun, color: 'text-orange-600', bg: 'bg-orange-50' },
  Dinner: { icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  Snacks: { icon: Cookie, color: 'text-olive-dark', bg: 'bg-olive-soft' },
};

function formatDateHeading(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const todayKey = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().split('T')[0];

  const formatted = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (dateString === todayKey) return `Today · ${formatted}`;
  if (dateString === tomorrowKey) return `Tomorrow · ${formatted}`;
  return formatted;
}

export default function MealPlanner() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [addFeedback, setAddFeedback] = useState(null); // { type: 'success' | 'error', message }
  const navigate = useNavigate();

  const [newPlan, setNewPlan] = useState({
    plan_date: new Date().toISOString().split('T')[0],
    meal_type: 'Dinner',
    recipe_id: '',
  });

  useEffect(() => {
    fetchPlans();
    getSavedRecipes().then((res) => {
      if (res.success) setSavedRecipes(res.data);
    });
  }, []);

  // Feedback banner under the form auto-clears so it doesn't linger forever.
  useEffect(() => {
    if (!addFeedback) return undefined;
    const timer = setTimeout(() => setAddFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [addFeedback]);

  const fetchPlans = () => {
    setLoading(true);
    getMealPlans()
      .then((res) => {
        if (res.success) {
          setPlans(res.data);
          setLoadError(null);
        } else {
          setLoadError(res.error || 'Could not load your meal plan.');
        }
      })
      .catch(() => setLoadError('Could not reach the server. Check your connection and try again.'))
      .finally(() => setLoading(false));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newPlan.recipe_id || submitting) return;
    setSubmitting(true);
    setAddFeedback(null);
    try {
      const res = await addMealPlan(newPlan.plan_date, newPlan.meal_type, newPlan.recipe_id);
      if (res.success) {
        const recipeName = savedRecipes.find((r) => r.id === newPlan.recipe_id)?.dish_name || 'Meal';
        setNewPlan((prev) => ({ ...prev, recipe_id: '' }));
        await fetchPlans();
        setAddFeedback({ type: 'success', message: `${recipeName} added to your plan.` });
      } else {
        setAddFeedback({ type: 'error', message: res.error || "Couldn't add that meal. Please try again." });
      }
    } catch {
      setAddFeedback({ type: 'error', message: "Couldn't reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    const removed = plans.find((p) => p.id === id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    try {
      const res = await deleteMealPlan(id);
      if (!res.success) throw new Error(res.error);
    } catch {
      // Restore on failure so the UI never lies about what's actually saved.
      if (removed) setPlans((prev) => [...prev, removed]);
      setAddFeedback({ type: 'error', message: "Couldn't remove that meal. Please try again." });
    }
  };

  const groupedByDate = useMemo(() => {
    const groups = new Map();
    for (const plan of plans) {
      const key = plan.plan_date;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(plan);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayPlans]) => [
        date,
        dayPlans.sort((a, b) => MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type)),
      ]);
  }, [plans]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-1 font-serif text-3xl font-bold text-ink">Meal Planner</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Line up your saved recipes against the days ahead so cooking never feels last-minute.
      </p>

      <div className="mb-8 rounded-3xl border border-cream-200 bg-cream-100 p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <CalendarDays size={20} className="text-olive-dark" />
          Add a Meal
        </h2>

        {savedRecipes.length === 0 ? (
          <p className="text-sm text-ink-soft">
            You haven't saved any recipes yet. Bookmark a recipe first, then come back to plan it into your week.
          </p>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-ink-soft">Date</label>
              <input
                type="date"
                value={newPlan.plan_date}
                onChange={(e) => setNewPlan({ ...newPlan, plan_date: e.target.value })}
                className="w-full rounded-xl border border-cream-300 bg-cream p-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-olive-soft"
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-ink-soft">Meal Type</label>
              <select
                value={newPlan.meal_type}
                onChange={(e) => setNewPlan({ ...newPlan, meal_type: e.target.value })}
                className="w-full rounded-xl border border-cream-300 bg-cream p-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-olive-soft"
              >
                {MEAL_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex-[2]">
              <label className="mb-1 block text-sm font-medium text-ink-soft">Recipe (from Saved)</label>
              <select
                value={newPlan.recipe_id}
                onChange={(e) => setNewPlan({ ...newPlan, recipe_id: e.target.value })}
                className="w-full rounded-xl border border-cream-300 bg-cream p-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-olive-soft"
                required
              >
                <option value="">Select a recipe</option>
                {savedRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.dish_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-olive px-6 py-2.5 font-medium text-white transition-colors hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={18} />
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}

        {addFeedback && (
          <div
            role="status"
            className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
              addFeedback.type === 'success'
                ? 'bg-olive-soft text-olive-dark'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {addFeedback.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertTriangle size={16} className="shrink-0" />
            )}
            {addFeedback.message}
          </div>
        )}
      </div>

      {loadError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-red-200 bg-red-50 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-500">
            <AlertTriangle size={20} />
          </span>
          <p className="text-sm font-medium text-red-600">{loadError}</p>
          <button
            onClick={fetchPlans}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-cream-200 bg-cream-100" />
          ))}
        </div>
      ) : groupedByDate.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-cream-300 bg-cream-100 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-olive-soft text-olive-dark">
            <ChefHat size={20} />
          </span>
          <p className="text-sm text-ink-soft">No meals planned yet.</p>
          <p className="max-w-xs text-xs text-ink-muted">
            Use the form above to schedule one of your saved recipes for an upcoming day.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([date, dayPlans]) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                {formatDateHeading(date)}
              </h3>
              <div className="space-y-3">
                {dayPlans.map((plan) => {
                  const meta = MEAL_TYPE_META[plan.meal_type] || MEAL_TYPE_META.Dinner;
                  const Icon = meta.icon;
                  const recipe = plan.recipes;
                  return (
                    <div
                      key={plan.id}
                      className="flex items-center gap-4 rounded-2xl border border-cream-200 bg-white p-3 shadow-sm transition-colors hover:border-olive/40"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>
                        <Icon size={18} />
                      </span>

                      {recipe && (
                        <button
                          onClick={() => navigate(`/recipe/${recipe.id}`)}
                          className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"
                        >
                          <img
                            src={getRecipeImage(recipe)}
                            alt={recipe.dish_name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          {plan.meal_type}
                        </p>
                        <button
                          onClick={() => recipe && navigate(`/recipe/${recipe.id}`)}
                          className="truncate text-left font-serif text-lg font-bold text-ink hover:text-olive-dark"
                        >
                          {recipe?.dish_name || 'Recipe unavailable'}
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(plan.id)}
                        className="p-2 text-red-400 transition-colors hover:text-red-600"
                        title="Remove from planner"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
