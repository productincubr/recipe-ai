import trendingBowl from '../../assets/food/trending-bowl.png'
import oliveBranch from '../../assets/decor/food/olive-branch.png'
import lemonSlice from '../../assets/decor/food/lemon-slice.png'
import tomatoSlice from '../../assets/decor/food/tomato-slice.png'
import basilLeaf from '../../assets/decor/food/basil-leaf2.png'

/**
 * Fold3Decor — the decorative garnish layer for Fold 3 ("Trending Recipes") only.
 *
 * Every asset is a real uploaded PNG cut-out, absolutely positioned *inside* the
 * Fold 3 section container (see TrendingRecipes.jsx). Because the layer is
 * `absolute inset-0` within that container, the decorations belong to Fold 3
 * alone: when the section scrolls out of view they leave with it. Mirroring
 * Fold1Decor and Fold2Decor, there are deliberately:
 *   - no page-level / body-attached decorative backgrounds,
 *   - no `position: fixed` decorative images,
 *   - no CSS `background-image`,
 *   - no duplicated asset files.
 *
 * Placement rules honoured here:
 * - Decorations frame the *outer edges* (corners and side gutters) of Fold 3 and
 *   never reach into the centre. The layer sits at z-0 while the header, diet
 *   chips and trending carousel sit above it at z-10 — so nothing is ever drawn
 *   on top of a recipe card, over the carousel, or across any text. The recipe
 *   cards stay the focus; the garnishes stay premium and sparse.
 * - The trending bowl is the section's hero anchor. On mobile/tablet it sits
 *   small in the upper-right (where the header button wraps below the heading,
 *   so they never touch); on desktop it drops to the mid-right gutter so it
 *   clears the top-right "View all recipes" button and the heading entirely.
 * - The layer is `pointer-events-none` and clips its own `overflow`, so an asset
 *   nudged past an edge can never create horizontal scroll.
 *
 * Responsive plan (base = mobile, sm = tablet, lg = desktop):
 * - Desktop (lg+): all five garnishes around the edges (bowl, olive branch,
 *   lemon slice, tomato slice, basil leaf).
 * - Tablet (sm–md): same five, scaled down.
 * - Mobile (<sm): only the trending bowl, one olive branch and one lemon slice;
 *   everything else is hidden.
 */
export default function Fold3Decor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Trending bowl — right-side hero anchor. On desktop it drops to the
          mid-right gutter (vertically centred, cropped by the edge) so it sits
          clear of the top-right "View all recipes" button and never overlaps
          the heading or any card. On smaller screens the header button wraps
          below the heading, so the smaller top-right bowl stays clear too. */}
      <img
        src={trendingBowl}
        alt=""
        className="absolute -right-4 -top-3 w-16 opacity-90 select-none sm:-right-6 sm:-top-4 sm:w-32 lg:top-1/2 lg:-right-14 lg:w-56 lg:-translate-y-1/2"
      />

      {/* Olive branch — left gutter, mid-height. Shown on every breakpoint (mobile). */}
      <img
        src={oliveBranch}
        alt=""
        className="absolute -left-3 top-1/2 w-24 -translate-y-1/2 -rotate-[8deg] opacity-90 select-none sm:-left-4 sm:w-32 lg:-left-6 lg:w-44"
      />

      {/* Lemon slice — lower-left corner. Shown on every breakpoint (mobile). */}
      <img
        src={lemonSlice}
        alt=""
        className="absolute -bottom-2 left-3 w-14 opacity-85 select-none sm:left-4 sm:w-16 lg:-bottom-3 lg:left-6 lg:w-24"
      />

      {/* Tomato slice — lower-right corner. Hidden on mobile, shown from tablet up. */}
      <img
        src={tomatoSlice}
        alt=""
        className="absolute -bottom-2 right-3 hidden w-16 opacity-85 select-none sm:block lg:-bottom-3 lg:right-6 lg:w-24"
      />

      {/* Basil leaf — top-right corner. Moved off the left so it no longer sits
          across the "Trending Recipes" label and heading text. Desktop only,
          where the trending bowl has dropped to the mid-right gutter, so the two
          right-side garnishes never collide. */}
      <img
        src={basilLeaf}
        alt=""
        className="absolute -top-3 right-3 hidden w-32 rotate-[18deg] opacity-80 select-none lg:block"
      />
    </div>
  )
}
