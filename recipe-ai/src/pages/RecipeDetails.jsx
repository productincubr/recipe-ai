import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Flame,
  Dumbbell,
  Sparkles,
  Download,
  Loader2,
  Share2,
  Bookmark,
  UtensilsCrossed,
  Target,
  Salad,
  Ban,
  Star,
  ArrowRightLeft,
  Wrench,
  Shuffle,
  Refrigerator,
  HeartPulse,
  Users,
  ChefHat,
  Timer,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { useSavedRecipes } from '../context/SavedRecipesContext';
import { getRecipeImage } from '../utils/recipeFallbackImage';

const NON_VEG_KEYWORDS = [
  'chicken', 'mutton', 'lamb', 'beef', 'pork', 'bacon', 'ham', 'sausage',
  'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster', 'meat',
  'turkey', 'duck', 'egg', 'anchovy', 'seafood', 'gelatin', 'squid', 'oyster', 'clam',
];

function isNonVegRecipe(recipe) {
  const text = [
    recipe.dish_name,
    recipe.category,
    recipe.diet_type,
    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients.map((i) => i.name) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return NON_VEG_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}`).test(text));
}

function VegNonVegTag({ nonVeg }) {
  const color = nonVeg ? '#C1272D' : '#0E8A16';
  return (
    <span
      title={nonVeg ? 'Non-Vegetarian' : 'Vegetarian'}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-2 align-middle ml-2"
      style={{ borderColor: color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

const BADGE_THEMES = {
  dish: { icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-500' },
  goal: { icon: Target, color: 'bg-purple-100 text-purple-500' },
  diet: { icon: Salad, color: 'bg-emerald-100 text-emerald-600' },
  avoids: { icon: Ban, color: 'bg-rose-100 text-rose-500' },
  spice: { icon: Flame, color: 'bg-amber-100 text-amber-600' },
  time: { icon: Clock, color: 'bg-sky-100 text-sky-500' },
};

function buildBadges(preferences, recipe) {
  if (!preferences) return [];
  const badges = [];

  if (preferences.dish) {
    badges.push({ theme: 'dish', label: 'Dish', value: preferences.dish });
  }
  (preferences.goals || []).forEach((goal) => {
    badges.push({ theme: 'goal', label: 'Goal', value: goal });
  });
  if (preferences.dietaryPreference && preferences.dietaryPreference !== 'No Preference') {
    badges.push({ theme: 'diet', label: 'Diet', value: preferences.dietaryPreference });
  }
  (preferences.allergies || []).forEach((allergy) => {
    badges.push({ theme: 'avoids', label: 'Avoids', value: allergy });
  });
  if (preferences.spiceLevel) {
    badges.push({ theme: 'spice', label: 'Spice Level', value: preferences.spiceLevel });
  }
  if (recipe?.cooking_time) {
    badges.push({ theme: 'time', label: 'Time', value: recipe.cooking_time });
  }

  return badges;
}

export default function RecipeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preferences = location.state?.preferences;
  const { savedIds, toggleSave } = useSavedRecipes();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://recipe-final-zjcl.onrender.com';

    const generateImage = async (recipeId, dishName) => {
      setImageLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/recipes/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId, dishName }),
        });
        const result = await res.json();
        if (res.ok && result.image_url) {
          setRecipe((prev) => (prev ? { ...prev, image_url: result.image_url } : prev));
        }
      } catch {
        // Non-fatal — the fallback stock photo stays up.
      } finally {
        setImageLoading(false);
      }
    };

    const fetchRecipe = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/recipes/${id}`);
        const result = await res.json();

        if (res.ok && result.success) {
          setRecipe(result.data);
          if (!result.data.image_url && result.data.dish_name) {
            generateImage(result.data.id ?? id, result.data.dish_name);
          }
        } else {
          setError(result.error || 'Recipe not found');
        }
      } catch {
        setError('Network error. Failed to load recipe.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const saved = savedIds.has(id);
  const handleToggleSave = () => toggleSave(id);

  const handleShare = async () => {
    const shareData = {
      title: recipe.dish_name,
      text: recipe.description,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed — nothing to do.
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 1.5,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`${recipe.dish_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-ink-soft">Loading recipe details...</div>;
  if (error || !recipe) return <div className="p-8 text-center text-red-500">{error}</div>;

  const badges = buildBadges(preferences, recipe);
  const details = recipe.details || {};
  const optimizationPlan = recipe.optimization_plan || location.state?.optimizationPlan;
  const swaps = optimizationPlan?.swaps || [];
  const methodAdjustments = optimizationPlan?.methodAdjustments || [];

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-ink-soft hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={handleShare}
              title="Share recipe"
              className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-cream-300 text-ink-soft hover:bg-cream-100 hover:text-ink transition-colors shadow-sm"
            >
              <Share2 size={18} />
            </button>
            {linkCopied && (
              <span className="absolute -bottom-8 right-0 whitespace-nowrap rounded-full bg-ink text-white text-xs px-3 py-1 shadow-lift">
                Link copied!
              </span>
            )}
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download recipe as PDF"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-cream-300 text-ink-soft hover:bg-cream-100 hover:text-ink transition-colors shadow-sm disabled:opacity-60"
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>

          <button
            onClick={handleToggleSave}
            title={saved ? 'Remove bookmark' : 'Bookmark recipe'}
            className={`flex items-center justify-center h-10 w-10 rounded-full border transition-colors shadow-sm ${
              saved
                ? 'bg-olive-soft border-olive text-olive-dark'
                : 'bg-white border-cream-300 text-ink-soft hover:bg-cream-100 hover:text-ink'
            }`}
          >
            <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div ref={cardRef} className="bg-white rounded-3xl border border-cream-300 shadow-card p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          {/* Left Title & Meta Info */}
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-olive-soft text-olive-deep rounded-full text-xs font-semibold mb-3 uppercase tracking-wider">
              {recipe.category || 'GRAINS'}
            </span>
            <h1 className="text-4xl font-serif font-bold text-ink leading-tight">
              {recipe.dish_name}
              <VegNonVegTag nonVeg={isNonVegRecipe(recipe)} />
            </h1>
            {details.subtitle && <p className="text-olive-dark font-medium mt-2">{details.subtitle}</p>}
            <p className="text-ink-soft mt-3 text-lg leading-relaxed">{recipe.description}</p>

            <div className="flex flex-wrap gap-3 mt-6">
              {recipe.cooking_time && (
                <StatPill icon={Clock} iconColor="text-amber" value={recipe.cooking_time} caption="Ready in" />
              )}
              {details.prepTime && (
                <StatPill icon={Timer} iconColor="text-sky-500" value={details.prepTime} caption="Prep" />
              )}
              {details.cookTime && (
                <StatPill icon={Flame} iconColor="text-orange-500" value={details.cookTime} caption="Cook" />
              )}
              {recipe.servings && (
                <StatPill icon={Users} iconColor="text-olive-dark" value={recipe.servings} caption="Servings" />
              )}
              {recipe.difficulty && (
                <StatPill icon={ChefHat} iconColor="text-purple-500" value={recipe.difficulty} caption="Difficulty" />
              )}
              {recipe.calories && (
                <StatPill icon={Flame} iconColor="text-amber" value={`${recipe.calories} kcal`} caption="Per Serving" />
              )}
              {recipe.protein && (
                <StatPill icon={Dumbbell} iconColor="text-blue-500" value={recipe.protein} caption="Protein" />
              )}
            </div>
          </div>

          {/* Right Image */}
          <div className="relative w-full md:w-80 h-56 rounded-2xl overflow-hidden bg-cream-200 shrink-0 border border-cream-300 shadow-sm">
            <img
              src={recipe.image_url || getRecipeImage(recipe)}
              alt={recipe.dish_name}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
            />
            {!recipe.image_url && imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/40 text-white text-sm font-medium">
                <Loader2 size={20} className="animate-spin" />
                Generating image...
              </div>
            )}
          </div>
        </div>

        {badges.length > 0 && (
          <div className="mb-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-olive-dark mb-3">
              <Sparkles size={16} />
              Made for you
            </p>
            <div className="flex flex-wrap rounded-2xl border border-cream-300 bg-cream-100/50 overflow-hidden">
              {badges.map((badge, i) => {
                const { icon: Icon, color } = BADGE_THEMES[badge.theme];
                return (
                  <div
                    key={`${badge.theme}-${badge.value}-${i}`}
                    className="flex-1 min-w-[100px] flex flex-col items-center gap-1.5 text-center px-3 py-4 border-r border-cream-300 last:border-r-0"
                  >
                    <span className={`flex items-center justify-center h-9 w-9 rounded-full ${color}`}>
                      <Icon size={16} />
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-ink-muted font-medium">{badge.label}</span>
                    <span className="text-sm font-semibold text-ink leading-tight">{badge.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <NutritionPanel recipe={recipe} details={details} />

        {recipe.healthier_explanation && (
          <div className="bg-cream-100 border border-cream-300 rounded-2xl p-5 mb-8 flex gap-4">
            <Sparkles className="text-olive shrink-0 h-6 w-6" />
            <p className="text-ink-soft text-sm leading-relaxed whitespace-pre-line">
              <strong className="text-ink block mb-1">Why it's healthier</strong>
              {recipe.healthier_explanation}
            </p>
          </div>
        )}

        {(swaps.length > 0 || methodAdjustments.length > 0) && (
          <div className="mb-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-olive-dark mb-3">
              <ArrowRightLeft size={16} />
              Healthy ingredient swaps
            </p>
            <div className="space-y-3">
              {swaps.map((swap, i) => (
                <div
                  key={`swap-${i}`}
                  className="rounded-2xl border border-cream-300 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-600">
                      {swap.originalIngredient}
                    </span>
                    <ArrowRightLeft size={14} className="text-ink-muted" />
                    <span className="rounded-full bg-olive-soft px-3 py-1 text-olive-deep">
                      {swap.substitutedWith}
                    </span>
                  </div>
                  {swap.reason && (
                    <p className="mt-2 text-sm text-ink-soft leading-relaxed">{swap.reason}</p>
                  )}
                  {swap.clinicalBenefit && (
                    <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                      {swap.clinicalBenefit}
                    </p>
                  )}
                </div>
              ))}

              {methodAdjustments.map((adj, i) => (
                <div
                  key={`method-${i}`}
                  className="rounded-2xl border border-cream-300 bg-cream-100/50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    <Wrench size={14} className="text-ink-muted" />
                    <span>{adj.originalMethod}</span>
                    <ArrowRightLeft size={14} className="text-ink-muted" />
                    <span className="text-olive-deep">{adj.adjustedMethod}</span>
                  </div>
                  {adj.reason && (
                    <p className="mt-2 text-sm text-ink-soft leading-relaxed">{adj.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-y-10 md:gap-y-0 mt-10 md:divide-x md:divide-cream-300">
          {/* Ingredients */}
          <div className="md:col-span-2 md:pr-10">
            <h3 className="text-xl font-bold mb-5 border-b border-cream-300 pb-2">
              Ingredients
              {recipe.servings && (
                <span className="ml-2 text-sm font-normal text-ink-muted">for {recipe.servings} servings</span>
              )}
            </h3>
            {groupIngredients(recipe.ingredients).map(({ group, items }) => (
              <div key={group || 'all'} className="mb-4 last:mb-0">
                {group && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-olive-dark mt-2">{group}</p>
                )}
                <ul className="divide-y divide-cream-200">
                  {items.map((ing, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                      <span className="text-ink font-medium">
                        {ing.name}
                        {ing.prep && <span className="block text-xs font-normal text-ink-muted mt-0.5">{ing.prep}</span>}
                      </span>
                      <span className="text-ink-muted text-right shrink-0 max-w-[45%]">{ing.qty || ing.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {details.equipment?.length > 0 && (
              <div className="mt-8">
                <h4 className="flex items-center gap-2 font-semibold text-ink mb-2">
                  <Wrench size={16} className="text-ink-muted" /> Equipment
                </h4>
                <ul className="list-disc ml-5 space-y-1 text-sm text-ink-soft">
                  {details.equipment.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}

            {details.preparationNotes?.length > 0 && (
              <div className="mt-6 rounded-2xl bg-cream-100 border border-cream-300 p-4">
                <h4 className="font-semibold text-ink mb-2 text-sm">Before you start</h4>
                <ul className="list-disc ml-5 space-y-1 text-sm text-ink-soft">
                  {details.preparationNotes.map((note, i) => <li key={i}>{note}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="md:col-span-3 md:pl-10">
            <h3 className="text-xl font-bold mb-5 border-b border-cream-300 pb-2">Instructions</h3>
            <div className="space-y-8">
              {Array.isArray(recipe.steps) && recipe.steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-olive text-white font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-semibold text-ink text-lg leading-tight">
                        {typeof step === 'string' ? `Step ${i + 1}` : step.title}
                      </h4>
                      {typeof step === 'object' && (step.time || step.heatLevel) && (
                        <div className="flex gap-2">
                          {step.time && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100">
                              <Clock size={11} /> {step.time}
                            </span>
                          )}
                          {step.heatLevel && step.heatLevel !== 'None' && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                              <Flame size={11} /> {step.heatLevel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {typeof step === 'object' && step.instructions && (
                      <ol className="list-decimal ml-5 mt-1 space-y-2 text-ink-soft text-sm leading-relaxed">
                        {step.instructions.map((inst, idx) => (
                          <li key={idx}>{inst}</li>
                        ))}
                      </ol>
                    )}
                    {typeof step === 'string' && <p className="mt-1 text-ink-soft text-sm">{step}</p>}

                    {typeof step === 'object' && step.chefTip && (
                      <div className="mt-3 flex gap-2 rounded-xl bg-olive-soft/60 border border-olive/20 px-3 py-2">
                        <Sparkles size={14} className="text-olive-dark shrink-0 mt-0.5" />
                        <p className="text-xs text-olive-dark leading-relaxed">
                          <span className="font-semibold">Chef tip: </span>{step.chefTip}
                        </p>
                      </div>
                    )}

                    {typeof step === 'object' && step.commonMistakes && (
                      <div className="mt-2 flex gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
                        <Ban size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-600 leading-relaxed">
                          <span className="font-semibold">Avoid: </span>{step.commonMistakes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <RecipeExtras details={details} />

        <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-cream-300 bg-olive-soft/50 py-4 px-6 text-center text-sm font-medium text-olive-dark">
          <Star size={16} className="fill-current" />
          Made just for you — healthy, delicious & perfect for your goals!
        </div>
      </div>
    </div>
  );
}

function groupIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  const groups = [];
  ingredients.forEach((ing) => {
    const group = (ing.group || '').trim();
    const existing = groups.find((g) => g.group === group);
    if (existing) existing.items.push(ing);
    else groups.push({ group, items: [ing] });
  });
  // A single (or "Main"-only) group needs no heading.
  if (groups.length === 1) groups[0].group = '';
  return groups;
}

function NutritionPanel({ recipe, details }) {
  const items = [
    ['Calories', recipe.calories ? `${recipe.calories} kcal` : ''],
    ['Protein', recipe.protein],
    ['Carbs', details.nutrition?.carbohydrates],
    ['Fat', recipe.fats],
    ['Fiber', recipe.fiber],
    ['Sugar', details.nutrition?.sugar],
    ['Sodium', recipe.sodium],
  ].filter(([, value]) => value);

  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold text-olive-dark mb-3">Nutrition per serving</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-cream-100 px-3 py-3 text-center">
            <p className="text-sm font-semibold text-ink">{value}</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListCard({ title, icon: Icon, items }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-2xl border border-cream-300 bg-white p-5">
      <h4 className="flex items-center gap-2 font-semibold text-ink mb-3">
        <Icon size={16} className="text-olive-dark" /> {title}
      </h4>
      <ul className="list-disc ml-5 space-y-1.5 text-sm text-ink-soft leading-relaxed">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

function RecipeExtras({ details }) {
  const substitutions = details.substitutions || [];
  const hasTags = details.allergens?.length > 0 || details.dietaryTags?.length > 0;
  const cards = [
    { title: 'Chef tips', icon: Sparkles, items: details.chefTips },
    { title: 'Variations', icon: Shuffle, items: details.variations },
    { title: 'Serving suggestions', icon: UtensilsCrossed, items: details.servingSuggestions },
    { title: 'Storage', icon: Refrigerator, items: details.storageInstructions },
    { title: 'Reheating', icon: Flame, items: details.reheatingInstructions },
    { title: 'Health benefits', icon: HeartPulse, items: details.healthBenefits },
    { title: 'Protein boost', icon: Dumbbell, items: details.proteinBoost ? [details.proteinBoost] : [] },
  ].filter((card) => card.items?.length);

  if (cards.length === 0 && substitutions.length === 0 && !hasTags) return null;

  return (
    <div className="mt-12 pt-10 border-t border-cream-300 space-y-6">
      {substitutions.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold mb-4">
            <ArrowRightLeft size={18} className="text-olive-dark" /> Substitutions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {substitutions.map((sub, i) => (
              <div key={i} className="rounded-2xl border border-cream-300 bg-cream-100/50 p-4 text-sm">
                <p className="font-semibold text-ink">
                  {sub.ingredient} <span className="text-ink-muted font-normal">→</span> {sub.substitute}
                </p>
                {sub.note && <p className="mt-1 text-ink-soft leading-relaxed">{sub.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => <ListCard key={card.title} {...card} />)}
        </div>
      )}

      {hasTags && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {details.dietaryTags?.map((tag) => (
            <span key={`tag-${tag}`} className="rounded-full bg-olive-soft px-3 py-1 font-medium text-olive-deep">{tag}</span>
          ))}
          {details.allergens?.length > 0 && (
            <span className="rounded-full bg-rose-50 border border-rose-100 px-3 py-1 font-medium text-rose-600">
              Contains: {details.allergens.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, iconColor, value, caption }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-cream-100 rounded-2xl">
      <Icon className={`h-5 w-5 ${iconColor} shrink-0`} />
      <div className="leading-tight">
        <p className="text-ink font-semibold text-sm">{value}</p>
        <p className="text-ink-muted text-xs">{caption}</p>
      </div>
    </div>
  );
}
