import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import DietFilterChips from './DietFilterChips'
import TrendingCarousel from './TrendingCarousel'
import PopularRightNow from './PopularRightNow'

// Reveal the section as it scrolls into view (matches Fold 2).
const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

/**
 * Fold 3 of the homepage — "Trending".
 *
 * Section header (eyebrow + heading + subtitle + View all recipes), a row of
 * pastel diet filter chips, and a horizontally scrollable trending-recipe
 * carousel. Sits directly beneath the "recently viewed" fold (Fold 2).
 */
export default function TrendingRecipes() {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow text-[16px] font-sans ">
            Your Recipes
          </p>
          <h2 className="mt-2 font-serif text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Trending
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
          className="flex items-center gap-2 rounded-full border border-cream-300 px-5 py-2.5 text-[15px] font-normal text-ink-soft shadow-soft transition-colors hover:bg-cream-100"
        >
          View all recipes
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Diet filter chips */}
      <DietFilterChips />

      {/* Trending carousel */}
      <TrendingCarousel />

      {/* Popular right now */}
      <PopularRightNow />
      </div>
    </motion.section>
  )
}
