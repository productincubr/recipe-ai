/**
 * Fold4Decor — the decorative layer for Fold 4 ("Culinary Channel") only.
 *
 * Unlike Folds 1–3 (which garnish with food PNG cut-outs), Fold 4 is decorated
 * with the uploaded UI SVG pack — sparkles, camera, heart and play glyphs —
 * used as *subtle* accents. The paths below mirror the uploaded assets
 * in src/assets/decor/ui exactly (same viewBox + geometry), inlined so each
 * glyph inherits `currentColor` and can be tinted/faded for a premium, quiet
 * look. There are deliberately NO food decorations in this fold: the only photo
 * that appears is the culinary bowl (rendered by CulinaryChannel itself).
 *
 * Like the other fold-decor layers this one is:
 *   - absolutely positioned `inset-0` *inside* the Fold 4 section only, so the
 *     decorations belong to Fold 4 alone and scroll away with it,
 *   - `pointer-events-none` and `overflow-hidden`, so an accent nudged past an
 *     edge can never create horizontal page scroll,
 *   - drawn at z-0 while the header, badges, bowl, carousel and strip sit above
 *     it at z-10 — nothing is ever painted on top of a video card or any text.
 *
 * Placement rules: accents frame the outer edges / corners and cluster near the
 * heading and section footer — never across the centre where the cards live.
 *
 * The set is kept deliberately sparse and fully on-screen (nothing clipped at
 * the edges) for a clean, premium look.
 *
 * Responsive plan (base = mobile, sm = tablet, lg = desktop):
 * - Desktop (lg+): two sparkles, one camera, one heart and one play accent.
 * - Tablet (sm–md): the same, minus the play accent.
 * - Mobile (<sm): only a single sparkle near the heading. (The culinary bowl
 *   and the per-card play buttons live outside this layer and stay visible.)
 */
export default function Fold4Decor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* A deliberately sparse, fully-visible set of accents — no tiny stray
          sparkles and nothing clipped at the edges, for a clean premium look. */}

      {/* Sparkle near the heading — the single accent kept on mobile. */}
      <Sparkles className="absolute left-1 top-1 h-8 w-8 text-olive/70 sm:h-9 sm:w-9" />

      {/* Sparkle near the bowl — tablet up. */}
      <Sparkles className="absolute right-3 top-3 hidden h-7 w-7 text-olive/50 sm:block lg:right-6 lg:h-10 lg:w-10" />

      {/* Camera accent — top-right gutter. Kept from tablet up (reduced set). */}
      <Camera className="absolute right-2 top-16 hidden h-8 w-8 text-olive/45 sm:block lg:right-3 lg:top-24 lg:h-10 lg:w-10" />

      {/* Heart accent — left, near the feature badges. Tablet up (reduced set). */}
      <Heart className="absolute left-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 text-terracotta/50 sm:block lg:h-9 lg:w-9" />

      {/* Play-button accent — near the bowl. Desktop only (cards carry the
          play buttons that matter on smaller screens). */}
      <PlayAccent className="absolute right-24 top-10 hidden h-9 w-9 text-olive/40 lg:block" />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Inline copies of the uploaded UI SVG pack (src/assets/decor/ui/*).
 * Geometry is identical to the shipped assets; inlining lets each glyph
 * inherit `currentColor` so it can be tinted and faded as a soft accent.
 * ------------------------------------------------------------------ */

function Sparkles({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 5c.5 3.4 1.9 5.7 4.4 6.8-2.5 1.1-3.9 3.4-4.4 6.7-.5-3.3-1.9-5.6-4.4-6.7C14.1 10.7 15.5 8.4 16 5Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M23.5 17c.3 1.7 1 2.9 2.3 3.4-1.3.5-2 1.7-2.3 3.4-.3-1.7-1-2.9-2.3-3.4 1.3-.5 2-1.7 2.3-3.4Z"
        fill="#D8B65A"
      />
      <circle cx="9" cy="22" r="1.6" fill="#D96B43" opacity="0.85" />
    </svg>
  )
}

function Camera({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M6 11.5c0-1.4 1.1-2.5 2.5-2.5h1.7c.5 0 1-.3 1.3-.7l.8-1.2c.3-.5.9-.8 1.5-.8h4.4c.6 0 1.2.3 1.5.8l.8 1.2c.3.4.8.7 1.3.7h1.7c1.4 0 2.5 1.1 2.5 2.5v9c0 1.4-1.1 2.5-2.5 2.5h-15A2.5 2.5 0 0 1 6 20.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="15.5" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="15.5" r="1.4" fill="#D8B65A" />
    </svg>
  )
}

function Heart({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 25.5c-.4 0-.8-.1-1.1-.4-3.3-2.6-6-4.9-7.8-7.1C5.2 15.6 4.5 13.5 4.5 11.4 4.5 8.2 7 5.8 10 5.8c1.5 0 2.9.6 4 1.7l2 2 2-2c1.1-1.1 2.5-1.7 4-1.7 3 0 5.5 2.4 5.5 5.6 0 2.1-.7 4.2-2.6 6.6-1.8 2.2-4.5 4.5-7.8 7.1-.3.3-.7.4-1.1.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayAccent({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="13" fill="#FFF9F1" />
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.9"
      />
      <path
        d="M13.4 11.9c0-1.1 1.2-1.8 2.1-1.2l6 4.1c.9.6.9 1.9 0 2.5l-6 4.1c-.9.6-2.1-.1-2.1-1.2v-8.3Z"
        fill="currentColor"
      />
    </svg>
  )
}

