import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import FeatureBadge from './FeatureBadge'
import VideoGrid from './VideoGrid'
import Fold4Decor from '../Fold4Decor/Fold4Decor'
import culinaryBowl from '../../assets/food/culinary-bowl.png'
import {
  channelFeatures,
  channelHero,
  channelStrip,
} from '../../data/culinaryChannel'

// Reveal the section as it scrolls into view (matches Folds 2 & 3).
const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

/**
 * Fold 4 of the homepage — "Culinary Channel".
 *
 * A section header + feature badges on the left, the culinary bowl on the
 * right, a responsive video grid below, and an information strip at the bottom.
 * Sits directly beneath the "Trending Recipes" fold (Fold 3).
 *
 * Decorations are handled entirely by <Fold4Decor />: the uploaded UI SVG pack
 * (sparkles, camera, heart, play, chat-bubble) used as subtle accents. There
 * are no food decorations here — the culinary bowl is the only photo. The decor
 * layer is scoped to this section (absolute inset-0, z-0) so it belongs to
 * Fold 4 alone; all content sits above it at z-10.
 */
export default function CulinaryChannel() {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
      className="relative"
    >
      {/* Section-scoped SVG UI decorations (Fold 4 only). */}
      <Fold4Decor />

      <div className="relative z-10 space-y-10">
        {/* Top: header + feature badges (left) / culinary bowl (right) */}
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Left column */}
          <div>
            <p className="type-eyebrow">
              Culinary Channel
            </p>
            <h2 className="mt-2 font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Inspiration,
              <br />
              cooked <span className="text-olive">daily.</span>
            </h2>
            <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
              Watch, learn &amp; cook with our chef-curated videos.
            </p>

            {/* Feature badges */}
            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-5">
              {channelFeatures.map((feature) => (
                <FeatureBadge key={feature.id} {...feature} />
              ))}
            </div>
          </div>

          {/* Right column — "View all videos" + the culinary bowl */}
          <div className="flex h-full flex-col self-stretch">
            {/* View all videos — top-right of the section header */}
            <div className="mb-5 flex justify-end sm:mb-6">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03, x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => console.log('View all videos')}
                className="flex items-center gap-2 rounded-full bg-cream-100 px-5 py-2.5 text-[15px] font-normal text-ink shadow-card transition-colors hover:bg-cream-200"
              >
                View all videos
                <ArrowRight className="h-4 w-4 text-olive" strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Bowl stays vertically centred in the remaining space. */}
            <div className="relative flex-1 content-center">
              {/* Linen cloth backdrop */}
              <div
                aria-hidden="true"
                className="absolute -inset-3 -rotate-1 rounded-[2rem] bg-gradient-to-br from-cream-100 to-cream-200 shadow-soft sm:-inset-4"
              />

              <img
                src={culinaryBowl}
                alt={channelHero.alt}
                loading="lazy"
                className="relative mx-auto w-56 select-none object-contain drop-shadow-[0_18px_30px_rgba(30,25,10,0.18)] sm:w-72 lg:w-[26rem]"
              />
            </div>
          </div>
        </div>

        {/* Video grid */}
        <div className="pt-2">
          <VideoGrid />
        </div>

        {/* Bottom information strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-ink-soft">
          {channelStrip.map((item, i) => (
            <div key={item} className="flex items-center gap-2 sm:gap-4">
              {i > 0 && (
                <span aria-hidden="true" className="h-4 w-px bg-cream-300" />
              )}
              <span className="text-[14px] font-normal sm:text-[15px]">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
