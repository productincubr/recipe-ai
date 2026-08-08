import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import RecipeCard from "../RecipeCard/RecipeCard";
import RecipeCardSkeleton from "../RecipeCard/RecipeCardSkeleton";
import { getHistory } from "../../services/userFeaturesApi";
import { getRecipeImage } from "../../utils/recipeFallbackImage";
import { readHistoryCache, writeHistoryCache } from "../../utils/recentHistoryCache";

const CARD_WIDTH = 258;
const GAP = 22;

function timeAgo(dateString) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

export default function RecipeCarousel() {
  const carouselRef = useRef(null);
  const navigate = useNavigate();
  const cached = readHistoryCache();
  const [recipes, setRecipes] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    getHistory()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setRecipes(res.data);
          writeHistoryCache(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scroll = (direction) => {
    carouselRef.current?.scrollBy({
      left: direction * (CARD_WIDTH + GAP),
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="flex gap-[22px] overflow-hidden pb-3 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-cream-300 bg-cream-100 py-14 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-olive-soft text-olive-dark">
          <UtensilsCrossed size={20} />
        </span>
        <p className="text-sm text-ink-soft">
          No recipes yet — try the search bar above to make your first one.
        </p>
      </div>
    );
  }

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
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            image={getRecipeImage(recipe)}
            title={recipe.dish_name}
            subtitle={recipe.cuisine || recipe.category}
            description={recipe.description}
            timeAgo={timeAgo(recipe.created_at)}
            onOpen={() => navigate(`/recipe/${recipe.id}`)}
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
