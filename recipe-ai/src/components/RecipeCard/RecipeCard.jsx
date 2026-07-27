import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Flame, Dumbbell, Clock, ArrowRight, Sparkles, Utensils } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

/**
 * Pastel accent themes per card — drives the status badge tint and the
 * Continue button. `olive` is the dark-green featured treatment.
 */
const ACCENTS = {
  olive: {
    badge: 'bg-olive-soft text-olive-deep',
    button: 'bg-olive-dark text-cream-100 hover:bg-olive-deep',
  },
  sage: {
    badge: 'bg-olive-soft text-olive-deep',
    button: 'bg-olive-soft text-olive-deep hover:bg-[#dbe0c2]',
  },
  amber: {
    badge: 'bg-olive-soft text-olive-deep',
    button: 'bg-amber/30 text-[#7a5a1f] hover:bg-amber/45',
  },
  lilac: {
    badge: 'bg-olive-soft text-olive-deep',
    button: 'bg-lilac/35 text-[#4a3f63] hover:bg-lilac/55',
  },
}

/** A single metric (icon + label) in the card's stats row. */
function Metric({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-ink-soft">
      <Icon className="h-4 w-4 text-ink-muted" strokeWidth={2} />
      {children}
    </span>
  )
}

/**
 * A recipe card for the "Continue Cooking" carousel.
 *
 * Featured cards render an extra "AI remembers" box and a full-width
 * dark-green CTA. All cards lift on hover with a soft shadow.
 */
export default function RecipeCard({ recipe, initialSaved = false }) {
  const navigate = useNavigate()
  const theme = ACCENTS[recipe.accent] ?? ACCENTS.sage
  const [saved, setSaved] = useState(initialSaved)
  
  // Safely handle status and map database fields to UI fields
  const statusStr = recipe.status || 'Ready\nTo cook'
  const [statusLine1, statusLine2] = statusStr.split('\n')
  
  const displayTitle = recipe.title || recipe.dish_name || 'Unknown Recipe'
  const displayImage = recipe.image || recipe.image_url
  const displayCalories = recipe.calories ? (String(recipe.calories).includes('kcal') ? recipe.calories : `${recipe.calories} kcal`) : 'N/A'
  const displayProtein = recipe.protein || 'N/A'
  const displayTime = recipe.time || recipe.cooking_time || 'N/A'

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group flex h-full w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-cream-300 bg-cream-100 shadow-card transition-shadow duration-300 ease-out hover:shadow-lift"
    >
      {/* Image + overlays */}
      <div className="relative h-56 shrink-0 overflow-hidden bg-cream-200">
        {displayImage ? (
          <img
            src={displayImage}
            alt={displayTitle}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-ink-muted transition-transform duration-500 group-hover:scale-105">
            <Utensils size={48} className="opacity-20" />
          </div>
        )}

        {/* Status badge */}
        <span
          className={clsx(
            'absolute left-3 top-3 rounded-lg px-3 py-1.5 text-[12px] font-normal leading-tight shadow-soft',
            theme.badge,
          )}
        >
          {statusLine1}
          <br />
          {statusLine2}
        </span>

        {/* Bookmark */}
        <button
          type="button"
          aria-label={saved ? 'Remove bookmark' : 'Save recipe'}
          aria-pressed={saved}
          onClick={async (e) => {
            e.stopPropagation(); // prevent clicking the card underneath
            const newSavedState = !saved;
            setSaved(newSavedState);
            try {
              if (newSavedState) {
                const { saveRecipe } = await import('../../services/userFeaturesApi');
                await saveRecipe(recipe.id);
              } else {
                const { removeSavedRecipe } = await import('../../services/userFeaturesApi');
                await removeSavedRecipe(recipe.id);
              }
            } catch (err) {
              console.error('Failed to toggle save state', err);
            }
          }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cream-100/90 text-ink-soft shadow-soft backdrop-blur transition-colors hover:bg-cream-100"
        >
          <Bookmark
            className={clsx('h-4 w-4', saved && 'fill-olive text-olive')}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl font-semibold text-ink line-clamp-1">
          {displayTitle}
        </h3>

        {/* Healthy Twist label */}
        <span className="mt-1 flex items-center gap-1.5 text-[13px] text-olive">
          Healthy Twist
          <Sparkles className="h-3.5 w-3.5 text-amber" strokeWidth={2} />
        </span>

        {/* Stats */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Metric icon={Flame}>{displayCalories}</Metric>
            <Metric icon={Dumbbell}>{displayProtein}</Metric>
          </div>
          <Metric icon={Clock}>{displayTime}</Metric>
        </div>

        {/* AI remembers (featured only) */}
        {recipe.featured && recipe.aiRemembers && (
          <div className="relative mt-4 overflow-hidden rounded-xl bg-cream-200 px-4 py-3">
            <div className="flex items-start gap-2">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-olive"
                strokeWidth={2}
              />
              <p className="text-[13px] leading-snug text-ink-soft">
                <span className="font-bold text-ink">AI remembers</span>
                <br />
                {recipe.aiRemembers}
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(`/recipe/${recipe.id}`)}
          className={clsx(
            'mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-normal shadow-soft transition-colors',
            theme.button,
          )}
        >
          {recipe.cta ?? 'Continue'}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.article>
  )
}
