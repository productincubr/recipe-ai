import { motion } from 'framer-motion'
import clsx from 'clsx'
import { tagThemes } from '../../data/trendingRecipes'

/** Pastel pill colours for the bottom tags. */
const TAG_THEMES = {
  sage: 'bg-olive-soft text-olive-deep',
  terracotta: 'bg-terracotta/12 text-terracotta',
  amber: 'bg-amber/20 text-[#7a5a1f]',
  lilac: 'bg-lilac/25 text-[#4a3f63]',
}

/** Small decorative sprig drawn beside the handwritten title, as in the design. */
function Sprig() {
  return (
    <svg
      viewBox="0 0 32 24"
      className="h-5 w-6 text-olive/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 20 C 12 16, 20 10, 28 4" />
      <path d="M14 13 C 12 9, 13 6, 16 5" />
      <path d="M20 9 C 19 5, 21 3, 24 3" />
      <path d="M9 16 C 8 13, 9 11, 12 10" />
    </svg>
  )
}

/**
 * A single trending-recipe card.
 *
 * Cream panel with a handwritten title up top, a large recipe image, and
 * coloured tag pills at the bottom. Lifts + scales the image on hover.
 */
export default function TrendingRecipeCard({ recipe }) {
  const open = () => console.log('Open recipe:', recipe.title)

  // The card is a clickable region, so give it button semantics and make it
  // operable by keyboard (Enter / Space) as well as pointer. Focus styling is
  // handled globally by the :focus-visible ring in index.css.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      role="button"
      tabIndex={0}
      aria-label={`Open recipe: ${recipe.title}`}
      onClick={open}
      onKeyDown={handleKeyDown}
      className="group flex h-[440px] w-[240px] shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-3xl border border-cream-300 bg-cream-100 shadow-card transition-shadow duration-300 ease-out hover:shadow-lift"
    >
      {/* Handwritten title */}
      <div className="flex items-start justify-between gap-2 px-5 pb-1 pt-6">
        <h3
          className="font-hand text-3xl font-bold leading-[1.05] text-olive-dark"
          style={{ fontFamily: 'var(--font-hand)' }}
        >
          {recipe.titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h3>
        <Sprig />
      </div>

      {/* Image */}
      <div className="relative mt-2 flex-1 overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Bottom tags */}
      <div className="flex flex-wrap gap-2 px-5 pb-5 pt-4">
        {recipe.tags.map((tag) => (
          <span
            key={tag}
            className={clsx(
              'rounded-full px-3 py-1 text-[12px] font-normal',
              TAG_THEMES[tagThemes[tag]] ?? TAG_THEMES.sage,
            )}
          >
            #{tag}
          </span>
        ))}
      </div>
    </motion.article>
  )
}
