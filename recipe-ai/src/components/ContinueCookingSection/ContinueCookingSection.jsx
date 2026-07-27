import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import RecipeCarousel from '../RecipeCarousel/RecipeCarousel'
import Fold2Decor from '../Fold2Decor/Fold2Decor'

// Reveal the section as it scrolls into view.
const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

/**
 * Fold 2 of the homepage — "Continue Cooking".
 *
 * Section header (label + heading + description + View all) and a horizontally
 * scrollable recipe carousel. Sits directly beneath the Hero fold on the Home
 * page.
 */
export default function ContinueCookingSection() {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className="relative"
    >
      {/* Decorative garnish layer — scoped to Fold 2, sits behind all content. */}
      <Fold2Decor />

      {/* Content sits above the decor layer; extra top padding gives the
          heading breathing room and eases the hand-off from Fold 1. */}
      <div className="relative z-10 space-y-8 pt-2 sm:pt-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow">
            Your Recipes
          </p>
          <h2 className="mt-2 font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Continue <span className="text-olive">Cooking</span>
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
            Your recently viewed recipes, right where you left off.
          </p>
        </div>

        {/* View all */}
        <motion.button
          type="button"
          whileHover={{ x: 4 }}
          onClick={() => console.log('View all recipes')}
          className="flex items-center gap-2 text-[15px] font-normal text-terracotta transition-colors hover:text-[#a53f22]"
        >
          View all
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Carousel */}
      <RecipeCarousel />
      </div>
    </motion.section>
  )
}
