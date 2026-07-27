import linenCorner from '../../assets/decor/food/linen-corner.png'
import rosemary from '../../assets/decor/food/rosemary.png'
import herbSprig from '../../assets/decor/food/olive-branch.png'
import peppercorns from '../../assets/decor/food/peppercorns.png'
import basilLeaf from '../../assets/decor/food/basil-leaf1.png'

/**
 * Fold2Decor — the decorative garnish layer for Fold 2 ("Continue Cooking") only.
 *
 * Every asset is a real uploaded PNG cut-out, absolutely positioned *inside* the
 * Fold 2 section container (see ContinueCookingSection.jsx). Because the layer is
 * `absolute inset-0` within that container, the decorations belong to Fold 2
 * alone: when the section scrolls out of view they leave with it. Mirroring
 * Fold1Decor, there are deliberately:
 *   - no page-level / body-attached decorative backgrounds,
 *   - no `position: fixed` decorative images,
 *   - no CSS `background-image`,
 *   - no duplicated asset files.
 *
 * Placement rules honoured here:
 * - Decorations frame the *outer edges* (corners and side gutters) of Fold 2 and
 *   never reach into the centre. The layer sits at z-0 while the header, recipe
 *   carousel and chips sit above it at z-10 — so nothing is ever drawn on top of
 *   a recipe card, over the carousel arrows, or across any text.
 * - The layer is `pointer-events-none` and clips its own `overflow`, so an asset
 *   nudged past an edge can never create horizontal scroll.
 * - herb-sprig.png was not present in the asset set; olive-branch.png — the only
 *   other loose herb sprig — stands in for it and is kept on every breakpoint.
 *
 * Responsive plan (base = mobile, sm = tablet, lg = desktop):
 * - Desktop (lg+): all five garnishes around the edges.
 * - Tablet (sm–md): the linen corner and peppercorns are hidden, leaving the two
 *   sprigs plus one basil leaf (~half the decorations).
 * - Mobile (<sm): only one herb sprig (olive branch) and one rosemary; everything
 *   else is hidden.
 */
export default function Fold2Decor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Rosemary — top-right corner. Nudged down so the sprig sits fully inside
          the container instead of being clipped by the top edge. Shown on every
          breakpoint (mobile sprig). */}
      <img
        src={rosemary}
        alt=""
        className="absolute top-2 right-1 w-16 rotate-[12deg] opacity-90 select-none sm:top-2 sm:w-20 lg:right-2 lg:top-3 lg:w-28"
      />

      {/* Herb sprig (olive branch) — left gutter. Shown on every breakpoint (mobile sprig). */}
      <img
        src={herbSprig}
        alt=""
        className="absolute -left-2 top-1/2 w-14 -translate-y-1/2 -rotate-[8deg] opacity-90 select-none sm:-left-3 sm:w-20 lg:-left-5 lg:w-28"
      />

      {/* Basil leaf — lower-left corner. Hidden on mobile, shown from tablet up. */}
      <img
        src={basilLeaf}
        alt=""
        className="absolute -bottom-2 left-3 hidden w-16 rotate-[160deg] opacity-80 select-none sm:block lg:left-8 lg:w-24"
      />

      {/* Peppercorns — lower-right gutter. Desktop only. */}
      <img
        src={peppercorns}
        alt=""
        className="absolute bottom-0 right-8 hidden w-20 opacity-80 select-none lg:block"
      />

      {/* Linen corner — top-left corner backdrop. Desktop only. */}
      <img
        src={linenCorner}
        alt=""
        className="absolute -top-3 -left-3 hidden w-44 opacity-60 select-none lg:block"
      />
    </div>
  )
}
