import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import clsx from 'clsx'
import { videoTagThemes } from '../../data/culinaryChannel'

/** Pastel pill colours for the category tags (shared language with Fold 3). */
const TAG_THEMES = {
  sage: 'bg-olive-soft text-olive-deep',
  terracotta: 'bg-terracotta/15 text-terracotta',
  amber: 'bg-amber/20 text-[#7a5a1f]',
  lilac: 'bg-lilac/25 text-[#4a3f63]',
  olive: 'bg-olive text-cream-100',
}

/**
 * A single premium video card.
 *
 * Large thumbnail with a handwritten title overlay, a centered play button,
 * category tags and a duration chip. Lifts + scales the thumbnail and grows
 * the play button on hover.
 *
 * Fills its grid cell and keeps a 4:3 aspect ratio. `onOpen` is called on click.
 */
export default function VideoCard({ video, onOpen }) {
  // The card is a clickable region, so give it button semantics and make it
  // operable by keyboard (Enter / Space) as well as pointer. Focus styling is
  // handled globally by the :focus-visible ring in index.css.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen?.(video)
    }
  }

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      role="button"
      tabIndex={0}
      aria-label={`Play video: ${video.title}`}
      onClick={() => onOpen?.(video)}
      onKeyDown={handleKeyDown}
      className="group relative flex aspect-[4/3] w-full cursor-pointer select-none overflow-hidden rounded-3xl border border-cream-300 bg-cream-100 shadow-card transition-shadow duration-300 ease-out hover:shadow-lift"
    >
      {/* Thumbnail */}
      <img
        src={video.image}
        alt={video.title}
        loading="lazy"
        draggable="false"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Warm gradient wash for legible overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-olive-deep/70 via-olive-deep/10 to-olive-deep/25"
      />

      {/* Handwritten title */}
      <h3
        className="absolute left-5 top-4 z-10 font-hand text-3xl font-bold leading-[1.02] text-cream-100 drop-shadow-[0_2px_6px_rgba(30,25,10,0.45)]"
        style={{ fontFamily: 'var(--font-hand)' }}
      >
        {video.titleLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h3>

      {/* Play button */}
      <div className="absolute inset-0 z-10 grid place-items-center">
        <motion.span
          whileHover={{ scale: 1.12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-cream-100/95 text-olive-dark shadow-lift transition-transform duration-300 group-hover:scale-110"
        >
          <Play className="h-6 w-6 translate-x-0.5 fill-current" strokeWidth={0} />
        </motion.span>
      </div>

      {/* Chef + difficulty */}
      {video.chef && (
        <p className="absolute left-5 top-16 z-10 text-[13px] font-medium text-cream-100/90 drop-shadow-[0_1px_4px_rgba(30,25,10,0.5)]">
          {video.chef}
          {video.difficulty && <span className="text-cream-100/70"> · {video.difficulty}</span>}
        </p>
      )}

      {/* Tags */}
      <div className="absolute bottom-4 left-5 z-10 flex flex-wrap gap-2">
        {video.tags.map((tag) => (
          <span
            key={tag}
            className={clsx(
              'rounded-full px-3 py-1 text-[12px] font-normal shadow-soft',
              TAG_THEMES[videoTagThemes[tag]] ?? TAG_THEMES.sage,
            )}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Duration */}
      <span className="absolute bottom-4 right-5 z-10 rounded-full bg-olive-deep/75 px-2.5 py-1 text-[12px] font-bold text-cream-100">
        {video.duration}
      </span>
    </motion.article>
  )
}
