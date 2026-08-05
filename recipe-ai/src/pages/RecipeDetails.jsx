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
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { saveRecipe, removeSavedRecipe, getSavedRecipes } from '../services/userFeaturesApi';

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

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
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
      } catch (err) {
        // Non-fatal — the "No Image Available" placeholder stays up.
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
      } catch (err) {
        setError('Network error. Failed to load recipe.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  useEffect(() => {
    getSavedRecipes()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setSaved(res.data.some((r) => r.id === id));
        }
      })
      .catch(() => {});
  }, [id]);

  const handleToggleSave = async () => {
    if (savingBookmark) return;
    setSavingBookmark(true);
    try {
      if (saved) {
        await removeSavedRecipe(id);
        setSaved(false);
      } else {
        await saveRecipe(id);
        setSaved(true);
      }
    } catch (err) {
      // Non-fatal — leave saved state unchanged on failure.
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: recipe.dish_name,
      text: recipe.description,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
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
            disabled={savingBookmark}
            title={saved ? 'Remove bookmark' : 'Bookmark recipe'}
            className={`flex items-center justify-center h-10 w-10 rounded-full border transition-colors shadow-sm disabled:opacity-60 ${
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
            <p className="text-ink-soft mt-3 text-lg leading-relaxed">{recipe.description}</p>

            <div className="flex flex-wrap gap-3 mt-6">
              {recipe.cooking_time && (
                <StatPill icon={Clock} iconColor="text-amber" value={recipe.cooking_time} caption="Ready in" />
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
          {recipe.image_url ? (
            <div className="w-full md:w-80 h-56 rounded-2xl overflow-hidden bg-cream-200 shrink-0 border border-cream-300 shadow-sm">
              <img
                src={recipe.image_url}
                alt={recipe.dish_name}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full md:w-80 h-56 rounded-2xl bg-cream-100 border border-cream-300 shrink-0 flex flex-col items-center justify-center gap-2 text-ink-muted text-sm">
              {imageLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating image...
                </>
              ) : (
                'No Image Available'
              )}
            </div>
          )}
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

        {recipe.healthier_explanation && (
          <div className="bg-cream-100 border border-cream-300 rounded-2xl p-5 mb-8 flex gap-4">
            <Sparkles className="text-olive shrink-0 h-6 w-6" />
            <p className="text-ink-soft text-sm leading-relaxed">
              <strong className="text-ink block mb-1">Why it's healthier</strong>
              {recipe.healthier_explanation}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-y-10 md:gap-y-0 mt-10 md:divide-x md:divide-cream-300">
          {/* Ingredients */}
          <div className="md:col-span-2 md:pr-10">
            <h3 className="text-xl font-bold mb-5 border-b border-cream-300 pb-2">Ingredients</h3>
            <ul className="divide-y divide-cream-200">
              {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                  <span className="text-ink font-medium">{ing.name}</span>
                  <span className="text-ink-muted text-right shrink-0 whitespace-nowrap">{ing.qty || ing.quantity}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="md:col-span-3 md:pl-10">
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

        <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-cream-300 bg-olive-soft/50 py-4 px-6 text-center text-sm font-medium text-olive-dark">
          <Star size={16} className="fill-current" />
          Made just for you — healthy, delicious & perfect for your goals!
        </div>
      </div>
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
