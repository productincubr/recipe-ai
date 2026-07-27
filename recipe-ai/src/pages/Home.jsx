import Hero from '../components/Hero/Hero'
import FeatureCards from '../components/FeatureCards/FeatureCards'
import Fold1Decor from '../components/Fold1Decor/Fold1Decor'
import ContinueCookingSection from '../components/ContinueCookingSection/ContinueCookingSection'
import TrendingRecipes from '../components/TrendingRecipes/TrendingRecipes'
import CulinaryChannel from '../components/CulinaryChannel/CulinaryChannel'

/**
 * Home / Explore page.
 *
 * Fold 1: hero, feature cards and category chips.
 * Fold 2: the "Continue Cooking" recipe carousel — reached by scrolling down.
 * Fold 3: "Trending Recipes" — diet filters + community recipe carousel.
 * Fold 4: "Culinary Channel" — chef-curated video carousel.
 */
export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-20 px-5 pb-20 pt-4 sm:space-y-24 sm:px-8 sm:pt-6">
      {/* Fold 1 — decorations are scoped to this container only */}
      <div className="relative">
        <Fold1Decor />
        <div className="relative z-10 space-y-10">
          <Hero />
          <FeatureCards />
        </div>
      </div>

      {/* Fold 2 */}
      <ContinueCookingSection />

      {/* Fold 3 */}
      <TrendingRecipes />

      {/* Fold 4 */}
      <CulinaryChannel />
    </div>
  )
}
