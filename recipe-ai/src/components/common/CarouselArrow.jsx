import { motion } from 'framer-motion'

/**
 * Floating circular carousel navigation button, placed just off the track's
 * left/right edge.
 *
 * Shared by every horizontal carousel on the homepage (Continue Cooking,
 * Trending Recipes, Culinary Channel) so the arrows look and behave
 * identically. Previously this exact markup was copy-pasted into three
 * carousels; this is the single source of truth. Classes and motion values are
 * unchanged from those originals, so rendering is pixel-identical.
 *
 * Hidden below `sm` (touch users swipe the track instead).
 *
 * @param {'left'|'right'} side  - which edge to pin the arrow to.
 * @param {() => void} onClick   - nudge the track one "page".
 * @param {React.ComponentType} icon - the chevron icon component to render.
 */
export default function CarouselArrow({ side, onClick, icon: Icon }) {
  const label = side === 'left' ? 'Scroll left' : 'Scroll right'
  const base =
    'absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream-300 bg-cream-100 text-ink-soft shadow-card transition-colors hover:text-ink sm:grid'
  const position =
    side === 'left' ? '-left-3 lg:-left-5' : '-right-3 lg:-right-5'

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={`${base} ${position}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.5} />
    </motion.button>
  )
}
