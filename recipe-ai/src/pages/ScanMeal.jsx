import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  UploadCloud,
  Sun,
  ScanEye,
  Focus,
  ShieldCheck,
  CircleCheck,
  Loader2,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Candy,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

const ANALYSIS_STEPS = [
  'Detecting ingredients',
  'Estimating calories',
  'Analyzing nutrition',
  'Finding healthier swaps',
];

const TIPS = [
  { icon: Sun, title: 'Good lighting', text: 'Use natural light or bright indoor light.' },
  { icon: ScanEye, title: 'Top view', text: 'Shoot from above so we can see all ingredients.' },
  { icon: Focus, title: 'Focus on the meal', text: 'Make sure the dish is in focus and not blurry.' },
  { icon: ShieldCheck, title: 'Minimal background', text: 'Avoid clutter so we can focus on your meal.' },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.slice(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ScanMeal() {
  const navigate = useNavigate();
  const location = useLocation();

  const [stage, setStage] = useState('upload'); // upload | analyzing | results | error
  const [imagePreview, setImagePreview] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (stage !== 'analyzing') return undefined;
    setActiveStep(0);
    const interval = setInterval(() => {
      setActiveStep((s) => (s < ANALYSIS_STEPS.length - 1 ? s + 1 : s));
    }, 900);
    return () => clearInterval(interval);
  }, [stage]);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    setImagePreview(URL.createObjectURL(file));
    setStage('analyzing');
    setError('');

    try {
      const [base64] = await Promise.all([fileToBase64(file), wait(1400)]);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://recipe-final-zjcl.onrender.com';
      const res = await fetch(`${baseUrl}/api/recipes/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data.data);
        setIngredients(data.data.ingredients || []);
        setStage('results');
      } else {
        setError(data.error || 'Failed to analyze the photo.');
        setStage('error');
      }
    } catch (err) {
      setError('Network error. Failed to analyze the photo.');
      setStage('error');
    }
  };

  useEffect(() => {
    const incomingFile = location.state?.file;
    if (!incomingFile) return;

    navigate(location.pathname, { replace: true, state: null });
    const timer = setTimeout(() => handleFile(incomingFile), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleReset = () => {
    setStage('upload');
    setImagePreview(null);
    setResult(null);
    setIngredients([]);
    setEditing(false);
    setError('');
  };

  const handleConfirm = () => {
    navigate('/create', { state: { dish: result.dish_name } });
  };

  const updateIngredient = (index, field, value) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  };

  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', qty: '' }]);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-ink-soft hover:text-ink mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <p className="type-eyebrow text-olive-dark">Scan Your Meal</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight">
        Take a photo or upload an image of your meal
      </h1>
      <p className="mt-2 text-ink-soft">and let AI identify it.</p>

      <AnimatePresence mode="wait">
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-8"
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
                dragActive ? 'border-olive bg-olive-soft/40' : 'border-cream-300 bg-cream-100'
              }`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber/20 text-amber">
                <UploadCloud size={28} />
              </span>
              <div>
                <p className="font-semibold text-ink">Drag &amp; drop an image here</p>
                <p className="text-sm text-ink-muted">or click to upload</p>
              </div>

              <div className="flex w-full max-w-xs flex-col gap-3 mt-2">
                <label
                  htmlFor="scan-choose-image"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-olive-dark px-6 py-3 font-semibold text-white transition hover:bg-olive-deep"
                >
                  <UploadCloud size={18} />
                  Choose Image
                </label>
                <label
                  htmlFor="scan-use-camera"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-cream-300 bg-white px-6 py-3 font-semibold text-ink transition hover:bg-cream-100"
                >
                  <Camera size={18} />
                  Use Camera
                </label>
              </div>

              <input
                id="scan-choose-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <input
                id="scan-use-camera"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <p className="mt-8 mb-4 text-sm font-semibold text-ink">
              Tips for best results
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TIPS.map((tip) => (
                <div
                  key={tip.title}
                  className="flex items-start gap-3 rounded-2xl border border-cream-300 bg-white p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-olive-soft text-olive-dark">
                    <tip.icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{tip.title}</p>
                    <p className="text-xs text-ink-muted">{tip.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {stage === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-8 rounded-3xl border border-cream-300 bg-white p-8"
          >
            <div className="flex flex-col items-center text-center">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Uploaded meal"
                  className="h-40 w-40 rounded-2xl object-cover border border-cream-300 shadow-sm"
                />
              )}
              <p className="mt-5 font-serif text-xl font-bold text-ink">
                Analyzing your meal...
              </p>
              <p className="text-sm text-ink-muted">This usually takes just a few seconds.</p>
            </div>

            <div className="mt-6 space-y-3 max-w-sm mx-auto">
              {ANALYSIS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  {i < activeStep ? (
                    <CircleCheck size={18} className="text-olive shrink-0" />
                  ) : i === activeStep ? (
                    <Loader2 size={18} className="animate-spin text-amber shrink-0" />
                  ) : (
                    <span className="h-[18px] w-[18px] rounded-full border-2 border-cream-300 shrink-0" />
                  )}
                  <span className={`text-sm ${i <= activeStep ? 'text-ink font-medium' : 'text-ink-muted'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {stage === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-8 rounded-3xl border border-cream-300 bg-white p-8 text-center"
          >
            <p className="font-semibold text-red-500">{error}</p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-olive-dark px-6 py-2.5 font-semibold text-white transition hover:bg-olive-deep"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </motion.div>
        )}

        {stage === 'results' && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-8 rounded-3xl border border-cream-300 bg-white p-6 sm:p-8"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-olive-dark mb-3">
              <Sparkles size={16} />
              We found your meal!
            </p>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt={result.dish_name}
                  className="w-full sm:w-40 h-40 rounded-2xl object-cover border border-cream-300 shadow-sm shrink-0"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-2xl font-bold text-ink">{result.dish_name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-olive-soft px-2.5 py-1 text-xs font-semibold text-olive-deep">
                    <CircleCheck size={12} />
                    {Math.round(result.confidence)}% match
                  </span>
                </div>
                <p className="text-sm text-ink-muted mt-1">
                  {result.category} · {result.cuisine}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                  <MacroTile icon={Flame} label="Calories" value={result.calories} iconColor="text-amber" />
                  <MacroTile icon={Dumbbell} label="Protein" value={result.protein} iconColor="text-blue-500" />
                  <MacroTile icon={Droplet} label="Fats" value={result.fats} iconColor="text-orange-500" />
                  <MacroTile icon={Wheat} label="Fiber" value={result.fiber} iconColor="text-emerald-600" />
                  <MacroTile icon={Candy} label="Sugar" value={result.sugar} iconColor="text-pink-500" />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-ink">Detected Ingredients</p>
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-olive-dark hover:text-olive-deep"
                >
                  <Pencil size={12} />
                  {editing ? 'Done editing' : 'Edit / Adjust Ingredients'}
                </button>
              </div>

              <ul className="divide-y divide-cream-200 rounded-2xl border border-cream-300 overflow-hidden">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm bg-white">
                    {editing ? (
                      <>
                        <input
                          value={ing.name}
                          onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                          placeholder="Ingredient"
                          className="flex-1 rounded-lg border border-cream-300 px-2.5 py-1.5 text-sm outline-none focus:border-olive"
                        />
                        <input
                          value={ing.qty || ''}
                          onChange={(e) => updateIngredient(i, 'qty', e.target.value)}
                          placeholder="Qty"
                          className="w-24 rounded-lg border border-cream-300 px-2.5 py-1.5 text-sm outline-none focus:border-olive"
                        />
                        <button
                          type="button"
                          onClick={() => removeIngredient(i)}
                          aria-label={`Remove ${ing.name}`}
                          className="text-ink-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-ink font-medium">{ing.name}</span>
                        <span className="text-ink-muted">{ing.qty}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {editing && (
                <button
                  type="button"
                  onClick={addIngredient}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-olive-dark hover:text-olive-deep"
                >
                  <Plus size={14} />
                  Add ingredient
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-olive-dark px-6 py-3 font-semibold text-white transition hover:bg-olive-deep"
              >
                <CircleCheck size={18} />
                Yes, This Is Correct
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-2 rounded-full border border-cream-300 bg-white px-6 py-3 font-semibold text-ink transition hover:bg-cream-100"
              >
                <RefreshCw size={16} />
                Scan Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MacroTile({ icon: Icon, label, value, iconColor }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-cream-100 py-3 px-2 text-center">
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <p className="text-sm font-semibold text-ink leading-tight">{value ?? '—'}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}
