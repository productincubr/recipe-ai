import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Camera, Mic, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * The large hero search input: "Ask RecipeAI anything…" with camera,
 * microphone and send affordances. Triggers the backend AI generation.
 */
export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://recipe-final-zjcl.onrender.com';
      const response = await fetch(`${baseUrl}/api/recipes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dish: query,
          goals: ['Healthy eating'] // Default goal
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Successfully generated! Navigate to recipe details screen
        setQuery('');
        navigate(`/recipe/${data.id || data.recipe?.id || data.generated_recipe_id}`);
      } else {
        console.error('Failed to generate recipe:', data);
        alert(data.error || 'Failed to generate recipe. Check server logs.');
      }
    } catch (error) {
      console.error('Error calling generate API:', error);
      alert('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="flex items-center gap-3 rounded-3xl border border-cream-300 bg-cream-100 p-2.5 pl-5 shadow-card transition-shadow duration-300 ease-out focus-within:border-olive/40 focus-within:shadow-lift"
    >
      <Sparkles className="h-5 w-5 shrink-0 text-olive" strokeWidth={2} />

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask RecipeAI anything..."
        disabled={loading}
        className="min-w-0 flex-1 bg-transparent text-[17px] text-ink placeholder:text-ink-muted focus:outline-none disabled:opacity-50"
      />

      {/* Camera */}
      <IconButton label="Scan a meal" onClick={() => console.log('Camera clicked')}>
        <Camera className="h-5 w-5" strokeWidth={2} />
      </IconButton>

      {/* Microphone */}
      <IconButton label="Voice input" onClick={() => console.log('Mic clicked')}>
        <Mic className="h-5 w-5" strokeWidth={2} />
      </IconButton>

      {/* Send */}
      <motion.button
        type="submit"
        aria-label="Send"
        disabled={loading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-olive text-cream-100 shadow-soft transition-colors hover:bg-olive-dark disabled:bg-olive/50 disabled:cursor-wait"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
        ) : (
          <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
        )}
      </motion.button>
    </motion.form>
  )
}

/** Small round icon button used for the camera + mic controls. */
function IconButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border border-cream-300 bg-cream-100 text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink sm:grid"
    >
      {children}
    </button>
  )
}
