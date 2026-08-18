import { motion } from 'framer-motion'
import { Play, BadgeCheck } from 'lucide-react'
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

/** Avatar wash colours, keyed by chef so the same chef always gets the same colour. */
const AVATAR_THEMES = {
  'Chef Maya Rao': 'bg-terracotta/20 text-terracotta',
  'Chef Arjun Mehta': 'bg-olive-soft text-olive-deep',
  'Chef Priya Nair': 'bg-lilac/25 text-[#4a3f63]',
}

/** "Chef Maya Rao" -> "MR" — initials for the channel-avatar circle. */
function initials(name) {
  return name
    .replace(/^Chef\s+/i, '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * A single video card, laid out like a YouTube video result: a 16:9
 * thumbnail (play button on hover, duration chip bottom-right) followed by
 * channel-style metadata underneath — avatar, title, channel name + verified
 * badge, and a views · uploaded-ago line — instead of overlaying all of that
 * text on top of the image.
 *
 * `onOpen` is called on click.
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
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      role="button"
      tabIndex={0}
      aria-label={`Play video: ${video.title}`}
      onClick={() => onOpen?.(video)}
      onKeyDown={handleKeyDown}
      className="group flex w-full cursor-pointer select-none flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 shadow-card transition-shadow duration-300 ease-out group-hover:shadow-lift">
        <img
          src={video.image}
          alt={video.title}
          loading="lazy"
          draggable="false"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient wash on hover, for a legible play button */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-olive-deep/0 transition-colors duration-300 group-hover:bg-olive-deep/25"
        />

        {/* Play button */}
        <div className="absolute inset-0 z-10 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <motion.span
            whileHover={{ scale: 1.12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="grid h-14 w-14 place-items-center rounded-full bg-cream-100/95 text-olive-dark shadow-lift"
          >
            <Play className="h-5 w-5 translate-x-0.5 fill-current" strokeWidth={0} />
          </motion.span>
        </div>

        {/* Duration */}
        <span className="absolute bottom-2.5 right-2.5 z-10 rounded-md bg-olive-deep/85 px-1.5 py-0.5 text-[12px] font-bold text-cream-100">
          {video.duration}
        </span>
      </div>

      {/* Metadata — below the thumbnail, YouTube-style */}
      <div className="mt-3 flex gap-3">
        <span
          aria-hidden="true"
          className={clsx(
            'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold',
            AVATAR_THEMES[video.chef] ?? 'bg-olive-soft text-olive-deep',
          )}
        >
          {initials(video.chef ?? '')}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-serif text-[16px] font-bold leading-[1.25] text-ink">
            {video.title}
          </h3>

          <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-soft">
            {video.chef}
            <BadgeCheck className="h-3.5 w-3.5 text-ink-muted" strokeWidth={2} />
          </p>

          <p className="text-[13px] text-ink-muted">
            {video.views}
            {video.uploadedAgo && <> · {video.uploadedAgo}</>}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        {video.tags.map((tag) => (
          <span
            key={tag}
            className={clsx(
              'rounded-full px-3 py-1 text-[12px] font-normal',
              TAG_THEMES[videoTagThemes[tag]] ?? TAG_THEMES.sage,
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.article>
  )
}
