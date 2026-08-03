import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, Info, Loader2, Sparkles } from "lucide-react";
import StepProgress from "../components/CreateRecipeWizard/StepProgress";
import OptionCard from "../components/CreateRecipeWizard/OptionCard";
import StepIllustration from "../components/CreateRecipeWizard/StepIllustration";
import GeneratingOverlay from "../components/CreateRecipeWizard/GeneratingOverlay";
import { WIZARD_STEPS, MoreOptionsIcon } from "../components/CreateRecipeWizard/wizardData";

const TOTAL_STEPS = WIZARD_STEPS.length;

export default function CreateRecipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialDish = location.state?.dish?.trim() || "";

  const [step, setStep] = useState(initialDish ? 2 : 1);
  const [dish, setDish] = useState(initialDish);
  const [goals, setGoals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [cookingStyle, setCookingStyle] = useState("");
  const [spiceLevel, setSpiceLevel] = useState("");
  const [customAllergyText, setCustomAllergyText] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const stepConfig = WIZARD_STEPS[step - 1];

  const selections = { goals, allergies, cookingStyle, spiceLevel };

  const isSelected = (key, value) => {
    if (key === "goals" || key === "allergies") {
      return selections[key].includes(value);
    }
    return selections[key] === value;
  };

  const handleSelect = (value) => {
    const { key, max } = stepConfig;

    if (key === "goals") {
      setGoals((prev) => {
        if (prev.includes(value)) return prev.filter((v) => v !== value);
        if (max && prev.length >= max) return prev;
        return [...prev, value];
      });
    } else if (key === "allergies") {
      setAllergies((prev) => {
        if (value === "None") return prev.includes("None") ? [] : ["None"];
        const withoutNone = prev.filter((v) => v !== "None");
        return withoutNone.includes(value)
          ? withoutNone.filter((v) => v !== value)
          : [...withoutNone, value];
      });
    } else if (key === "cookingStyle") {
      setCookingStyle((prev) => (prev === value ? "" : value));
    } else if (key === "spiceLevel") {
      setSpiceLevel((prev) => (prev === value ? "" : value));
    }
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

  const handleGenerate = async () => {
    if (!dish.trim() || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL ||
        "https://recipe-final-zjcl.onrender.com";

      const response = await fetch(`${baseUrl}/api/recipes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish: dish.trim(),
          goals: goals.length ? goals : ["Healthy eating"],
          allergies: [...allergies.filter((a) => a !== "None"), ...customAllergies],
          dietaryPreferences: cookingStyle || "No Preference",
          spiceLevel: spiceLevel || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate(`/recipe/${data.id || data.recipe?.id || data.generated_recipe_id}`, {
          state: {
            preferences: {
              dish: dish.trim(),
              goals: goals.length ? goals : ["Healthy eating"],
              allergies: [...allergies.filter((a) => a !== "None"), ...customAllergies],
              dietaryPreference: cookingStyle || "No Preference",
              spiceLevel: spiceLevel || null,
            },
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
    if (step === 1) {
      if (!dish.trim()) return;
      goToStep(2);
      return;
    }
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
  const continueDisabled = step === 1 && !dish.trim();

  return (
    <div className="min-h-screen w-full bg-cream">
      <GeneratingOverlay show={submitting} />
      <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 rounded-full bg-[#F2F2F2] px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-[#e8e8e8]"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Step indicator */}
        <div className="mt-8">
          <StepProgress currentStep={step} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mt-10"
          >
            {step === 1 ? (
              <DishStep dish={dish} setDish={setDish} onSubmit={handleContinue} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[#F28C28]">
                      🌿 {stepConfig.eyebrow}
                    </p>
                    <h1 className="mt-3 max-w-2xl font-serif text-[32px] font-bold leading-tight text-[#1E2432] sm:text-[38px]">
                      {stepConfig.title}
                    </h1>
                    <p className="mt-3 max-w-xl text-[16px] text-gray-500">
                      {stepConfig.subtitle}
                    </p>
                  </div>
                  <StepIllustration icon={stepConfig.illustrationIcon} />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {visibleOptions.map((option) => (
                    <OptionCard
                      key={option.value}
                      option={option}
                      selected={isSelected(stepConfig.key, option.value)}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>

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
          {step > 1 && stepConfig.footerLeft === "more" && stepConfig.moreOptions && !showMore ? (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="flex items-center gap-2 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-cream-100"
            >
              <MoreOptionsIcon size={16} />
              {stepConfig.moreLabel}
              <ChevronDown size={14} />
            </button>
          ) : step > 1 && stepConfig.footerLeft === "info" ? (
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
                className="flex flex-col items-center rounded-full bg-[#F2F2F2] px-6 py-2.5 leading-tight text-ink-soft transition hover:bg-[#e8e8e8] disabled:opacity-60"
              >
                <span className="text-[14px] font-semibold">Skip for now</span>
                <span className="text-[11px] text-ink-muted">I'll choose later</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={continueDisabled || submitting}
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
                {step === 1
                  ? "Next: Health Goal"
                  : isLastStep
                  ? "Let's cook!"
                  : `Next: ${stepConfig.nextLabel}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DishStep({ dish, setDish, onSubmit }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[#F28C28]">
        🌿 Step 1 of {TOTAL_STEPS}
      </p>
      <h1 className="mt-3 max-w-2xl font-serif text-[32px] font-bold leading-tight text-[#1E2432] sm:text-[38px]">
        What are we making healthier today?
      </h1>
      <p className="mt-3 max-w-xl text-[16px] text-gray-500">
        Type the dish you'd like a personalized, healthier recipe for.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-8 flex h-[64px] items-center gap-3 rounded-full border border-cream-300 bg-[#F5F4F2] px-6 shadow-sm focus-within:border-[#D8D6D3] focus-within:ring-2 focus-within:ring-[#E6E3DE]"
      >
        <input
          autoFocus
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="e.g. Butter Chicken, Chocolate Cake..."
          className="flex-1 bg-transparent outline-none ring-0"
        />
      </form>
    </div>
  );
}
