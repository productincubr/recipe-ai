import Hero from '../components/Hero/Hero'
import FeatureCards from '../components/FeatureCards/FeatureCards'
import ContinueCookingSection from '../components/ContinueCookingSection/ContinueCookingSection'
import TrendingRecipes from '../components/TrendingRecipes/TrendingRecipes'
import CulinaryChannel from '../components/CulinaryChannel/CulinaryChannel'

/**
 * Home / Explore page.
 *
 * Fold 1: hero, feature cards and category chips.
 * Fold 2: "recently viewed" recipe carousel — reached by scrolling down.
 * Fold 3: "Trending" — diet filters + community recipe carousel.
 * Fold 4: "Culinary Channel" — chef-curated video carousel.
 */
export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-20 px-5 pb-20 pt-4 sm:space-y-24 sm:px-8 sm:pt-[-10px]">
      {/* Fold 1 */}
      <div className="space-y-10">
        <Hero />
        <FeatureCards />
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
