import { useId, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Utensils } from 'lucide-react'
import { getHistory } from '../../services/userFeaturesApi'

let expandedByDefault = false

export default function RecentRecipes() {
  const [expanded, setExpanded] = useState(expandedByDefault)
  const [recentRecipes, setRecentRecipes] = useState([])
  const listId = useId()

  useEffect(() => {
    // Fetch recent recipes from DB instead of mock data
    getHistory().then(res => {
      if (res.success && res.data) {
        // Take top 4 for the sidebar
        setRecentRecipes(res.data.slice(0, 4))
      }
    }).catch(console.error)
  }, [])

  const toggle = () => {
    setExpanded((prev) => {
      expandedByDefault = !prev
      return !prev
    })
  }

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={listId}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-cream-200"
      >
        <span className="type-eyebrow-muted">Recent Recipes</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex shrink-0 text-ink-muted"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="list"
            id={listId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <ul className="space-y-1 pt-2">
              {recentRecipes.length === 0 ? (
                <li className="px-2 py-2 text-xs text-ink-muted">No recent recipes.</li>
              ) : recentRecipes.map((recipe) => (
                <li key={recipe.id}>
                  <motion.button
                    type="button"
                    whileHover={{ x: 2 }}
                    onClick={() => console.log('Open recent recipe:', recipe.dish_name)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-cream-200"
                  >
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-cream-300"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-cream-300 flex items-center justify-center text-ink-muted ring-1 ring-cream-300">
                        <Utensils size={18} />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-normal text-ink">
                        {recipe.dish_name}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {formatTime(recipe.created_at)}
                      </span>
                    </span>
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
