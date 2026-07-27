import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { dietFilters } from '../../data/trendingRecipes'

/**
 * Pastel chip themes. `chip` styles the resting state, `active` the selected
 * state (a stronger tint + ring) so the current filter reads clearly.
 */
const CHIP_THEMES = {
  lilac: {
    chip: 'bg-lilac/20 text-[#4a3f63]',
    icon: 'text-[#7a6ba3]',
    active: 'ring-2 ring-lilac/70',
  },
  amber: {
    chip: 'bg-amber/20 text-[#7a5a1f]',
    icon: 'text-amber',
    active: 'ring-2 ring-amber/70',
  },
  sage: {
    chip: 'bg-olive-soft text-olive-deep',
    icon: 'text-olive',
    active: 'ring-2 ring-olive/50',
  },
  terracotta: {
    chip: 'bg-terracotta/12 text-terracotta',
    icon: 'text-terracotta',
    active: 'ring-2 ring-terracotta/50',
  },
  olive: {
    chip: 'bg-olive-soft/70 text-olive-deep',
    icon: 'text-olive',
    active: 'ring-2 ring-olive/50',
  },
  cream: {
    chip: 'bg-cream-100 text-ink-soft border border-cream-300',
    icon: 'text-ink-muted',
    active: 'ring-2 ring-ink/20',
  },
}

/**
 * Horizontally scrollable row of diet filter chips.
 *
 * Placeholder filtering only — selecting a chip toggles its active state and
 * logs to the console. Wire `activeFilter` to real filtering later.
 */
export default function DietFilterChips() {
  const [activeFilter, setActiveFilter] = useState(null)

  const toggle = (id) => {
    const next = activeFilter === id ? null : id
    setActiveFilter(next)
    console.log('Diet filter selected:', next ?? 'none')
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {dietFilters.map(({ id, label, icon: Icon, theme }) => {
        const t = CHIP_THEMES[theme] ?? CHIP_THEMES.sage
        const isActive = activeFilter === id
        return (
          <motion.button
            key={id}
            type="button"
            aria-pressed={isActive}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => toggle(id)}
            className={clsx(
              'flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-normal shadow-soft transition-all',
              t.chip,
              isActive && t.active,
            )}
          >
            <Icon className={clsx('h-4 w-4', t.icon)} strokeWidth={2} />
            {label}
          </motion.button>
        )
      })}

      {/* Trailing "more filters" affordance, matching the design */}
      <motion.button
        type="button"
        aria-label="More filters"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => console.log('More diet filters')}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cream-300 bg-cream-100 text-ink-soft shadow-soft transition-colors hover:bg-cream-200 hover:text-ink"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </motion.button>
    </div>
  )
}
