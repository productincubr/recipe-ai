import clsx from 'clsx'

/**
 * Icon-wash themes per feature badge. `wash` tints the round icon holder,
 * `icon` colours the glyph — mirroring the accent system used elsewhere on
 * the homepage (feature cards, tag pills).
 */
const THEMES = {
  sage: { wash: 'bg-olive-soft', icon: 'text-olive-dark' },
  amber: { wash: 'bg-amber/20', icon: 'text-amber' },
  terracotta: { wash: 'bg-terracotta/15', icon: 'text-terracotta' },
  lilac: { wash: 'bg-lilac/25', icon: 'text-[#5a4d7a]' },
}

/**
 * A single "Real ingredients / Real people / Real good" feature badge:
 * a round icon wash beside a bold title and a soft supporting line.
 */
export default function FeatureBadge({ title, description, icon: Icon, theme }) {
  const t = THEMES[theme] ?? THEMES.sage

  return (
    <div className="flex items-center gap-3">
      <span
        className={clsx(
          'grid h-11 w-11 shrink-0 place-items-center rounded-full',
          t.wash,
          t.icon,
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="leading-tight">
        <p className="font-serif text-[15px] font-semibold text-ink">{title}</p>
        <p className="text-[13px] text-ink-muted">{description}</p>
      </div>
    </div>
  )
}
