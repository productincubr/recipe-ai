import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TrendingRecipeCard from './TrendingRecipeCard'
import CarouselArrow from '../common/CarouselArrow'
import { trendingRecipes } from '../../data/trendingRecipes'

// Card width (240px) + gap (20px) — one "page" per arrow click.
const SCROLL_STEP = 260

/**
 * Horizontally scrollable trending-recipe carousel with left/right circular
 * navigation arrows. Native smooth scroll + scroll-snap; the arrows nudge the
 * track by one card. Overflows into a horizontal scroll on all breakpoints.
 */
export default function TrendingCarousel() {
  const trackRef = useRef(null)

  const scrollBy = (direction) => {
    trackRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative">
      {/* Left arrow */}
      <CarouselArrow side="left" onClick={() => scrollBy(-1)} icon={ChevronLeft} />

      {/* Scroll track */}
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto scroll-smooth px-1 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-2"
      >
        {trendingRecipes.map((recipe) => (
          <TrendingRecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {/* Right arrow */}
      <CarouselArrow side="right" onClick={() => scrollBy(1)} icon={ChevronRight} />
    </div>
  )
}
