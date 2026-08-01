import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react'

const FILTERS = [
  'High Protein',
  'Quick & Easy',
  'Vegan',
  'Gluten Free',
  'Kid Friendly',
  'Indian',
  'Salads',
]

/**
 * "Popular Right Now" strip — a flame-badged label beside a horizontally
 * scrollable row of quick-filter pills. Sits above the section header, with
 * a thin gradient progress bar as its top border.
 */
export default function PopularRightNow() {
  const scrollerRef = useRef(null)
  const scrollBy = (dir) => scrollerRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })

  return (
    <div className="mt-6 sm:mt-8">
      <div className="flex flex-wrap items-center gap-4">
        {/* Label */}
        <p className="flex shrink-0 items-center gap-2 font-serif text-lg font-bold leading-tight text-ink">
          <Flame className="h-5 w-5 text-terracotta" strokeWidth={2} fill="currentColor" />
          Popular Right Now
        </p>

        {/* Pills */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll popular filters left"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cream-300 text-ink-soft transition-colors hover:bg-cream-100 sm:flex"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>

          <div
            ref={scrollerRef}
            className="flex flex-1 gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map((label) => (
              <motion.button
                key={label}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => console.log('Popular filter:', label)}
                className="shrink-0 rounded-full border border-cream-300 bg-cream px-4 py-2 text-[14px] text-ink-soft transition-colors hover:bg-cream-100"
              >
                {label}
              </motion.button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll popular filters right"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cream-300 text-ink-soft transition-colors hover:bg-cream-100"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
