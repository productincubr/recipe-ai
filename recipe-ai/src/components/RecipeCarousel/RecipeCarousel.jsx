import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RecipeCard from "../RecipeCard/RecipeCard";

import { continueCookingRecipes } from "../../data/continueCooking";

const CARD_WIDTH = 235;
const GAP = 22;

export default function RecipeCarousel() {
  const carouselRef = useRef(null);

  const scroll = (direction) => {
    carouselRef.current?.scrollBy({
      left: direction * (CARD_WIDTH + GAP),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">

      {/* Left Arrow */}

      <button
        onClick={() => scroll(-1)}
        className="
        absolute
        left-[-22px]
        top-1/2
        z-20
        -translate-y-1/2
        h-12
        w-12
        rounded-full
        border
        border-[#E7E7E7]
        bg-white
        shadow-lg
        flex
        items-center
        justify-center
        transition-all
        hover:scale-105
        hover:bg-[#FAFAFA]
        "
      >
        <ChevronLeft size={22} />
      </button>

      {/* Cards */}

      <div
        ref={carouselRef}
        className="
        flex
        gap-[22px]
        overflow-x-auto
        scroll-smooth
        pb-3
        px-1

        snap-x
        snap-mandatory

        scrollbar-hide
        "
      >
        {continueCookingRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            {...recipe}
          />
        ))}
      </div>

      {/* Right Arrow */}

      <button
        onClick={() => scroll(1)}
        className="
        absolute
        right-[-22px]
        top-1/2
        z-20
        -translate-y-1/2
        h-12
        w-12
        rounded-full
        border
        border-[#E7E7E7]
        bg-white
        shadow-lg
        flex
        items-center
        justify-center
        transition-all
        hover:scale-105
        hover:bg-[#FAFAFA]
        "
      >
        <ChevronRight size={22} />
      </button>

    </div>
  );
}