import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'

const ACCENTS = {
  amber: {
    wash: 'bg-[#FBEAD1]',
    icon: 'text-[#C97A1F]',
    arrow: 'bg-[#E2891E]',
    mediaFrom: '#F0A23A',
    mediaTo: '#D9791A',
  },
  teal: {
    wash: 'bg-[#E6EFDA]',
    icon: 'text-[#4C6B27]',
    arrow: 'bg-[#5C7A29]',
    mediaFrom: '#1B4E49',
    mediaTo: '#0D2A28',
  },
  terracotta: {
    wash: 'bg-[#FBE1D6]',
    icon: 'text-[#C1502F]',
    arrow: 'bg-[#C1442B]',
    mediaFrom: '#D2603C',
    mediaTo: '#AC3A22',
  },
}

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

/**
 * A single hero feature card: left content zone + right image zone
 * with a curved color wave behind the photo.
 */
export default function FeatureCard({ title, description, icon: Icon, accent, image, imageAlt, fullWidth = false }) {
  const theme = ACCENTS[accent] ?? ACCENTS.amber
  const gradientId = `wave-${accent}`

  return (
    <motion.button
      type="button"
      variants={cardVariant}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onClick={() => console.log('Feature clicked:', title)}
      className={clsx(
        'group relative flex h-56 w-full min-w-0 overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 text-left shadow-soft transition-shadow duration-300 ease-out hover:shadow-lift',
        fullWidth && 'md:col-span-2',
      )}
    >
      {/* Left: content */}
      <div className="relative z-10 flex w-[58%] min-w-0 flex-col p-5">
        <span
          className={clsx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
            theme.wash,
            theme.icon,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>

        <h2 className="mt-3.5 truncate font-serif text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 line-clamp-2 flex-1 text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>

        <span
          className={clsx(
            'mt-3.5 grid h-8 w-8 shrink-0 place-items-center self-start rounded-full text-cream-100 shadow-soft transition-transform group-hover:translate-x-1',
            theme.arrow,
          )}
        >
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>

      {/* Right: color wave + photo */}
      <div className="absolute inset-y-0 right-0 w-[58%] overflow-hidden">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.mediaFrom} />
              <stop offset="100%" stopColor={theme.mediaTo} />
            </linearGradient>
          </defs>
          <path d="M110,0 C40,55 40,245 110,300 L400,300 L400,0 Z" fill={`url(#${gradientId})`} />
        </svg>

        <span className="absolute left-[24%] top-6 h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="absolute left-[32%] top-11 h-1 w-1 rounded-full bg-white/30" />
        <span className="absolute left-[28%] top-16 h-1 w-1 rounded-full bg-white/25" />

        <img
          src={image}
          alt={imageAlt}
          className="absolute bottom-0 right-[6%] h-[85%] w-[70%] rounded-2xl object-cover shadow-lg ring-1 ring-black/5"
        />
      </div>
    </motion.button>
  )
}