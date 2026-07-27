import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import RecipeCard from '../RecipeCard/RecipeCard'
import CarouselArrow from '../common/CarouselArrow'
import { continueCookingRecipes } from '../../data/continueCooking'

// Card width (300px) + gap (20px) — one "page" per arrow click.
const SCROLL_STEP = 320

/**
 * Horizontally scrollable recipe carousel with left/right navigation arrows.
 * Scrolling is native + smooth (scroll-snap); the arrows nudge the track by
 * one card. Cards overflow into a horizontal scroll on all breakpoints.
 */
export default function RecipeCarousel() {
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
      <CarouselArrow
        side="left"
        onClick={() => scrollBy(-1)}
        icon={ChevronLeft}
      />

      {/* Scroll track */}
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto scroll-smooth px-1 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-2"
      >
        {continueCookingRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {/* Right arrow */}
      <CarouselArrow
        side="right"
        onClick={() => scrollBy(1)}
        icon={ChevronRight}
      />
    </div>
  )
}
