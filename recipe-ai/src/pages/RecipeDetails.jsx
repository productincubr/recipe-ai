import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Flame, Dumbbell, Sparkles } from 'lucide-react';

export default function RecipeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://recipe-final-zjcl.onrender.com';
        const res = await fetch(`${baseUrl}/api/recipes/${id}`);
        const result = await res.json();
        
        if (res.ok && result.success) {
          setRecipe(result.data);
        } else {
          setError(result.error || 'Recipe not found');
        }
      } catch (err) {
        setError('Network error. Failed to load recipe.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecipe();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-ink-soft">Loading recipe details...</div>;
  if (error || !recipe) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-ink-soft hover:text-ink mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="bg-white rounded-3xl border border-cream-300 shadow-card p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          {/* Left Title & Meta Info */}
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-olive-soft text-olive-deep rounded-full text-xs font-semibold mb-3 uppercase tracking-wider">
              {recipe.category || 'GRAINS'}
            </span>
            <h1 className="text-4xl font-serif font-bold text-ink leading-tight">{recipe.dish_name}</h1>
            <p className="text-ink-soft mt-3 text-lg leading-relaxed">{recipe.description}</p>
            
            <div className="flex flex-wrap gap-4 mt-6">
              {recipe.cooking_time && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-cream-100 rounded-2xl text-ink font-medium text-sm">
                  <Clock className="h-5 w-5 text-amber" />
                  <span>{recipe.cooking_time}</span>
                </div>
              )}
              {recipe.calories && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-cream-100 rounded-2xl text-ink font-medium text-sm">
                  <Flame className="h-5 w-5 text-amber" />
                  <span>{recipe.calories} kcal</span>
                </div>
              )}
              {recipe.protein && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-cream-100 rounded-2xl text-ink font-medium text-sm">
                  <Dumbbell className="h-5 w-5 text-blue-500" />
                  <span>{recipe.protein}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Image */}
          {recipe.image_url ? (
            <div className="w-full md:w-80 h-56 rounded-2xl overflow-hidden bg-cream-200 shrink-0 border border-cream-300 shadow-sm">
              <img 
                src={recipe.image_url} 
                alt={recipe.dish_name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full md:w-80 h-56 rounded-2xl bg-cream-100 border border-cream-300 shrink-0 flex items-center justify-center text-ink-muted text-sm">
              No Image Available
            </div>
          )}
        </div>

        {recipe.healthier_explanation && (
          <div className="bg-cream-100 border border-cream-300 rounded-2xl p-5 mb-8 flex gap-4">
            <Sparkles className="text-olive shrink-0 h-6 w-6" />
            <p className="text-ink-soft text-sm leading-relaxed">
              <strong className="text-ink block mb-1">Why it's healthier</strong>
              {recipe.healthier_explanation}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-10">
          {/* Ingredients */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold mb-5 border-b border-cream-300 pb-2">Ingredients</h3>
            <ul className="space-y-3">
              {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between items-start text-sm">
                  <span className="text-ink font-medium">{ing.name}</span>
                  <span className="text-ink-muted text-right ml-4 shrink-0">{ing.qty || ing.quantity}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-5 border-b border-cream-300 pb-2">Instructions</h3>
            <div className="space-y-6">
              {Array.isArray(recipe.steps) && recipe.steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-olive text-white font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-ink text-lg">{typeof step === 'string' ? `Step ${i + 1}` : step.title}</h4>
                    {typeof step === 'object' && step.instructions && (
                      <ul className="list-disc ml-5 mt-2 space-y-1 text-ink-soft">
                        {step.instructions.map((inst, idx) => (
                          <li key={idx}>{inst}</li>
                        ))}
                      </ul>
                    )}
                    {typeof step === 'string' && <p className="mt-1 text-ink-soft">{step}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
