import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import DietFilterChips from './DietFilterChips'
import TrendingCarousel from './TrendingCarousel'
import Fold3Decor from '../Fold3Decor/Fold3Decor'

// Reveal the section as it scrolls into view (matches Fold 2).
const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

/**
 * Fold 3 of the homepage — "Trending Recipes".
 *
 * Section header (label + heading + subtitle + View all recipes), a row of
 * pastel diet filter chips, and a horizontally scrollable trending-recipe
 * carousel. Sits directly beneath the "Continue Cooking" fold (Fold 2).
 */
export default function TrendingRecipes() {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className="relative"
    >
      {/* Decorative garnish layer — scoped to Fold 3, sits behind all content. */}
      <Fold3Decor />

      {/* Content sits above the decor layer; spacing unchanged from before. */}
      <div className="relative z-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow">
            Trending Recipes
          </p>
          <h2 className="mt-2 max-w-2xl font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Recipes loved by our <span className="text-olive">community.</span>
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
            Healthy recipes, made simple.
          </p>
        </div>

        {/* View all recipes */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.03, x: 2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => console.log('View all recipes')}
          className="flex items-center gap-2 rounded-full border border-terracotta/40 px-5 py-2.5 text-[15px] font-normal text-terracotta shadow-soft transition-colors hover:bg-terracotta/5"
        >
          View all recipes
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Diet filter chips */}
      <DietFilterChips />

      {/* Trending carousel */}
      <TrendingCarousel />
      </div>
    </motion.section>
  )
}
