import heroBowl from '../../assets/food/hero-bowl.png'
import basilLeaf from '../../assets/decor/food/basil-leaf1.png'
import tomatoSlice from '../../assets/decor/food/tomato-slice.png'
import peppercorns from '../../assets/decor/food/peppercorns.png'
import pear from '../../assets/decor/food/pear.png'

/**
 * Fold1Decor — the decorative garnish layer for Fold 1 only.
 *
 * Every asset is a real uploaded PNG cut-out, absolutely positioned *inside* the
 * Fold 1 section container (see Home.jsx). Because the layer is `absolute
 * inset-0` within that container, the decorations belong to Fold 1 alone: when
 * Fold 1 scrolls out of view they leave with it. There are deliberately:
 *   - no page-level / body-attached decorative backgrounds,
 *   - no `position: fixed` decorative images,
 *   - no CSS `background-image`,
 *   - no duplicated asset files.
 *
 * Placement rules honoured here:
 * - Decorations frame the *outer edges* of Fold 1 (the empty gutters/corners
 *   around the centered hero). The layer sits at z-0 while the hero, search bar
 *   and feature cards sit above it at z-10 — so nothing is ever drawn behind
 *   text, over a button, over the search bar, or on top of a card.
 * - The layer is `pointer-events-none` and clips its own `overflow`, so an asset
 *   nudged past an edge can never create horizontal scroll.
 * - The basil leaf is *reused*, not duplicated: the second leaf is the same file
 *   at a different rotation, scale and opacity.
 *
 * Responsive plan (base = mobile, sm = tablet, lg = desktop):
 * - Desktop (lg+): the hero bowl plus all garnishes at full size.
 * - Tablet (sm–md): pear and the reused right-flank leaf are hidden and the
 *   leaves are scaled down (~50% fewer decorations).
 * - Mobile (<sm): only the hero bowl, one basil leaf and one tomato slice.
 */
export default function Fold1Decor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Hero bowl — top-right anchor. Shown on every breakpoint. */}
      <img
        src={heroBowl}
        alt=""
        className="absolute -right-4 -top-3 w-16 opacity-90 select-none sm:-right-8 sm:-top-4 sm:w-40 lg:-right-16 lg:-top-10 lg:w-64"
      />

      {/* Basil leaf — top-left corner. Shown on every breakpoint (mobile leaf). */}
      <img
        src={basilLeaf}
        alt=""
        className="absolute -left-2 top-2 w-12 -rotate-[18deg] opacity-90 select-none sm:left-0 sm:w-14 lg:left-3 lg:top-4 lg:w-24"
      />

      {/* Tomato slice — lower-right corner. Shown on every breakpoint (mobile tomato). */}
      <img
        src={tomatoSlice}
        alt=""
        className="absolute -right-4 top-60 w-14 opacity-90 select-none sm:right-0 sm:w-16 lg:right-2 lg:top-72 lg:w-24"
      />

      {/* Peppercorns — left flank, beside the hero subtitle. Hidden on mobile. */}
      <img
        src={peppercorns}
        alt=""
        className="absolute left-0 top-40 hidden w-20 opacity-80 select-none sm:block lg:top-44 lg:w-32"
      />

      {/* Basil leaf reused — right flank, rotated & re-scaled. Desktop only. */}
      <img
        src={basilLeaf}
        alt=""
        className="absolute right-2 top-44 hidden w-24 rotate-[150deg] opacity-75 select-none lg:block"
      />

      {/* Pear — lower-left gutter, beside the search bar. Desktop only. */}
      <img
        src={pear}
        alt=""
        className="absolute -left-4 top-72 hidden w-16 opacity-90 select-none lg:block"
      />
    </div>
  )
}
