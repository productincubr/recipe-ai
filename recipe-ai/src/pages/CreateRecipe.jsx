import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, Info, Loader2, Sparkles } from "lucide-react";
import StepProgress from "../components/CreateRecipeWizard/StepProgress";
import OptionCard from "../components/CreateRecipeWizard/OptionCard";
import StepIllustration from "../components/CreateRecipeWizard/StepIllustration";
import GeneratingOverlay from "../components/CreateRecipeWizard/GeneratingOverlay";
import IngredientsStep from "../components/CreateRecipeWizard/IngredientsStep";
import { getWizardSteps, MoreOptionsIcon } from "../components/CreateRecipeWizard/wizardData";

export default function CreateRecipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.state?.mode || "dish";
  const initialDish = mode === "dish" ? location.state?.dish?.trim() || "" : "";

  const steps = useMemo(() => getWizardSteps(mode), [mode]);
  const TOTAL_STEPS = steps.length;

  const [step, setStep] = useState(initialDish ? 2 : 1);
  const [dish, setDish] = useState(initialDish);
  const [ingredients, setIngredients] = useState([]);
  const [selections, setSelections] = useState({});
  const [customAllergyText, setCustomAllergyText] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const stepConfig = steps[step - 1];

  const isSelected = (value) => {
    const current = selections[stepConfig.key];
    if (stepConfig.selectionMode === "multi") {
      return (current || []).includes(value);
    }
    return current === value;
  };

  const handleSelect = (value) => {
    const { key, selectionMode, max } = stepConfig;

    setSelections((prev) => {
      if (selectionMode === "multi") {
        const arr = prev[key] || [];

        if (key === "allergies") {
          if (value === "None") {
            return { ...prev, allergies: arr.includes("None") ? [] : ["None"] };
          }
          const withoutNone = arr.filter((v) => v !== "None");
          return {
            ...prev,
            allergies: withoutNone.includes(value)
              ? withoutNone.filter((v) => v !== value)
              : [...withoutNone, value],
          };
        }

        if (arr.includes(value)) return { ...prev, [key]: arr.filter((v) => v !== value) };
        if (max && arr.length >= max) return prev;
        return { ...prev, [key]: [...arr, value] };
      }

      return { ...prev, [key]: prev[key] === value ? "" : value };
    });
  };

  const visibleOptions = useMemo(() => {
    if (stepConfig.type !== "options") return [];
    return showMore && stepConfig.moreOptions
      ? [...stepConfig.options, ...stepConfig.moreOptions]
      : stepConfig.options;
  }, [stepConfig, showMore]);

  const goToStep = (next) => {
    setShowMore(false);
    setShowInfo(false);
    setError("");
    setStep(next);
  };

  const customAllergies = customAllergyText
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const handleBack = () => {
    if (step === 1) {
      navigate("/");
      return;
    }
    goToStep(step - 1);
  };

  const buildSeedDish = () => {
    if (mode === "dish") return dish.trim();
    if (mode === "ingredients") {
      return ingredients.length
        ? `A recipe using ${ingredients.slice(0, 4).join(", ")}`
        : "A healthy home-style recipe";
    }
    const chosen = selections.superfoods || [];
    return chosen.length
      ? `A recipe featuring ${chosen.slice(0, 3).join(", ")}`
      : "A healthy recipe with superfoods";
  };

  const handleGenerate = async () => {
    if (submitting) return;
    const seedDish = buildSeedDish();
    if (!seedDish.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL ||
        "https://recipe-final-zjcl.onrender.com";

      const goals = selections.goals?.length ? selections.goals : ["Healthy eating"];
      const allergies = [
        ...(selections.allergies || []).filter((a) => a !== "None"),
        ...customAllergies,
      ];
      const dietaryPreferences = selections.cookingStyle || "No Preference";
      const spiceLevel = selections.spiceLevel || undefined;
      const cuisine = selections.cuisine || undefined;
      const mealType = selections.mealType || undefined;

      const response = await fetch(`${baseUrl}/api/recipes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish: seedDish,
          goals,
          allergies,
          dietaryPreferences,
          spiceLevel,
          cuisine,
          mealType,
          ingredients: mode === "ingredients" ? ingredients : undefined,
          superfoods: mode === "superfoods" ? selections.superfoods || [] : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate(`/recipe/${data.id || data.recipe?.id || data.generated_recipe_id}`, {
          state: {
            preferences: {
              dish: seedDish,
              goals,
              allergies,
              dietaryPreference: dietaryPreferences,
              spiceLevel: spiceLevel || null,
            },
            optimizationPlan: data.optimization_plan,
          },
        });
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (step < TOTAL_STEPS) {
      goToStep(step + 1);
      return;
    }
    handleGenerate();
  };

  const handleSkip = () => {
    if (step < TOTAL_STEPS) {
      goToStep(step + 1);
    } else {
      handleGenerate();
    }
  };

  const isLastStep = step === TOTAL_STEPS;
  const continueDisabled =
    (stepConfig.type === "dish" && !dish.trim()) ||
    submitting;

  const nextStepLabel = !isLastStep ? steps[step]?.label : null;

  return (
    <div className="min-h-screen w-full bg-cream">
      <GeneratingOverlay show={submitting} />
      <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 rounded-full bg-cream-100 px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-cream-200"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Step indicator */}
        <div className="mt-8">
          <StepProgress steps={steps} currentStep={step} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${step}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mt-10"
          >
            {stepConfig.type === "dish" ? (
              <DishStep
                dish={dish}
                setDish={setDish}
                onSubmit={handleContinue}
                totalSteps={TOTAL_STEPS}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-terracotta">
                      🌿 Step {step} of {TOTAL_STEPS}
                    </p>
                    <h1 className="mt-3 max-w-2xl font-serif text-[28px] font-bold leading-tight text-ink sm:text-[38px]">
                      {stepConfig.title}
                    </h1>
                    <p className="mt-3 max-w-xl text-[16px] text-ink-soft">
                      {stepConfig.subtitle}
                    </p>
                  </div>
                  <StepIllustration icon={stepConfig.illustrationIcon} />
                </div>

                {stepConfig.type === "options" && (
                  <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {visibleOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        option={option}
                        selected={isSelected(option.value)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}

                {stepConfig.type === "ingredients" && (
                  <IngredientsStep ingredients={ingredients} setIngredients={setIngredients} />
                )}

                {stepConfig.allowCustomInput && (
                  <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-cream-300 bg-cream-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-ink">
                        {stepConfig.customInputLabel}
                      </p>
                      <p className="text-[12px] text-ink-muted">
                        {stepConfig.customInputHint}
                      </p>
                    </div>
                    <input
                      value={customAllergyText}
                      onChange={(e) => setCustomAllergyText(e.target.value)}
                      placeholder={stepConfig.customInputPlaceholder}
                      className="h-11 w-full rounded-full border border-cream-300 bg-white px-4 text-sm outline-none focus:border-olive sm:w-72"
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="mt-4 text-sm font-medium text-red-500">{error}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap items-start justify-between gap-4 border-t border-cream-300 pt-6">
          {stepConfig.footerLeft === "more" && stepConfig.moreOptions && !showMore ? (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="flex items-center gap-2 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-cream-100"
            >
              <MoreOptionsIcon size={16} />
              {stepConfig.moreLabel}
              <ChevronDown size={14} />
            </button>
          ) : stepConfig.footerLeft === "info" ? (
            <div className="max-w-sm">
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-ink"
              >
                <Info size={16} />
                {stepConfig.infoLabel}
                <ChevronDown
                  size={14}
                  className={showInfo ? "rotate-180 transition-transform" : "transition-transform"}
                />
              </button>
              {showInfo && (
                <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                  {stepConfig.infoText}
                </p>
              )}
            </div>
          ) : (
            <span />
          )}

          <div className="ml-auto flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="flex flex-col items-center rounded-full bg-cream-100 px-6 py-2.5 leading-tight text-ink-soft transition hover:bg-cream-200 disabled:opacity-60"
              >
                <span className="text-[14px] font-semibold">Skip for now</span>
                <span className="text-[11px] text-ink-muted">I'll choose later</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={continueDisabled}
              className="flex flex-col items-center rounded-full bg-olive-dark px-7 py-2.5 leading-tight text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex items-center gap-2 text-[14px] font-semibold">
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isLastStep ? (
                  <Sparkles size={16} />
                ) : null}
                {isLastStep ? "Generate Recipe" : "Continue"}
                {!isLastStep && <ArrowRight size={16} />}
              </span>
              <span className="text-[11px] text-white/75">
                {isLastStep ? "Let's cook!" : `Next: ${nextStepLabel}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DishStep({ dish, setDish, onSubmit, totalSteps }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-terracotta">
        🌿 Step 1 of {totalSteps}
      </p>
      <h1 className="mt-3 max-w-2xl font-serif text-[28px] font-bold leading-tight text-ink sm:text-[38px]">
        What are we making healthier today?
      </h1>
      <p className="mt-3 max-w-xl text-[16px] text-ink-soft">
        Type the dish you'd like a personalized, healthier recipe for.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-8 flex h-[64px] items-center gap-3 rounded-full border border-cream-300 bg-cream-100 px-6 shadow-sm focus-within:border-olive focus-within:ring-2 focus-within:ring-olive-soft"
      >
        <input
          autoFocus
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="e.g. Butter Chicken, Chocolate Cake..."
          className="flex-1 bg-transparent outline-none ring-0 text-ink"
        />
      </form>
    </div>
  );
}
