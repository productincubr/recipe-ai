import { useRef } from 'react'
import { Droplet, Beef, Leaf, Flame, Wheat, Drumstick, ChevronLeft, ChevronRight } from 'lucide-react'

// Pastel icon-chip themes, reusing the app's existing pastel tokens
// (olive-soft / terracotta / amber / lilac) plus two new ones (sky, blush)
// sampled from the reference for the diet categories that need them.
const DIETS = [
  { id: 'diabetes', label: 'Diabetes Friendly', icon: Droplet, iconClass: 'text-[#3B82C4]' },
  { id: 'kids', label: 'Kids Friendly', icon: Beef, iconClass: 'text-[#C97A1F]' },
  { id: 'keto', label: 'Keto Friendly', icon: Leaf, iconClass: 'text-olive' },
  { id: 'calorie', label: 'Low Calorie', icon: Flame, iconClass: 'text-terracotta' },
  { id: 'fiber', label: 'High Fiber', icon: Wheat, iconClass: 'text-[#C9A227]' },
  { id: 'protein', label: 'High Protein', icon: Drumstick, iconClass: 'text-[#A5432B]' },
]

/**
 * Horizontally scrollable row of pastel diet-filter chips with prev/next
 * nav arrows bookending the row (nav arrows are decorative on mobile widths
 * where the whole row already fits; they scroll the row on wider viewports).
 */
export default function DietFilterChips() {
  const scrollerRef = useRef(null)
  const scrollBy = (dir) => scrollerRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll diet filters left"
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cream-300 text-ink-soft transition-colors hover:bg-cream-100 sm:flex"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
      </button>

      <div
        ref={scrollerRef}
        className="flex flex-1 gap-2.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DIETS.map(({ id, label, icon: Icon, iconClass }) => (
          <button
            key={id}
            type="button"
            onClick={() => console.log('Diet filter:', label)}
            className="flex shrink-0 items-center gap-2 rounded-full border border-cream-300 bg-white px-4 py-2 text-[14px] text-ink shadow-soft transition-colors hover:bg-cream-100"
          >
            <Icon className={`h-4 w-4 ${iconClass}`} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll diet filters right"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cream-300 text-ink-soft transition-colors hover:bg-cream-100"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}