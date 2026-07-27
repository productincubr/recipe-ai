import { motion } from 'framer-motion'
import { Plus, Sparkles } from 'lucide-react'

/**
 * Prominent dark-olive "New Recipe" call-to-action at the top of the sidebar.
 */
export default function NewRecipeButton() {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => console.log('New Recipe clicked')}
      className="group flex w-full items-center gap-3 rounded-2xl bg-olive-dark px-4 py-3.5 text-left text-cream-100 shadow-soft transition-colors hover:bg-olive-deep"
    >
      <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} />
      <span className="flex-1 font-serif text-lg italic">New Recipe</span>
      <Sparkles
        className="h-4 w-4 text-amber transition-transform group-hover:rotate-12"
        strokeWidth={2}
      />
    </motion.button>
  )
}
