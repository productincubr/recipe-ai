import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

/**
 * Generic placeholder for routes that aren't part of this front-end build
 * (History, Pricing, etc.). Keeps navigation functional without a backend.
 */
export default function Placeholder({ title = 'Coming soon' }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-8 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-olive-soft text-olive-dark">
          <Sparkles className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-serif text-4xl font-semibold text-olive-deep">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-ink-muted">
          This screen is part of the RecipeAI experience. The front-end is ready
          — hook it up to your data when you build the backend.
        </p>
      </motion.div>
    </div>
  )
}
