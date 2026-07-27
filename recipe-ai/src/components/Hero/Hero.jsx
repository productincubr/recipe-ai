import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import SearchBar from '../SearchBar/SearchBar'

// Simple stagger container so the badge, title and subtitle cascade in.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

/**
 * Hero: AI-powered badge, RecipeAI wordmark, subtitle and the large search
 * bar — all centered on the page.
 */
export default function Hero() {
  return (
    <section className="relative">
      {/* Centered intro: badge, wordmark, subtitle */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-2xl flex-col items-center text-center lg:-translate-x-8"
      >
        {/* Badge */}
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-2 rounded-full bg-olive-soft px-4 py-1.5 text-[13px] font-normal text-olive-deep">
            <Sparkles className="h-4 w-4 text-olive" strokeWidth={2} />
            AI powered
          </span>
        </motion.div>

        {/* Wordmark */}
        <motion.h1
          variants={item}
          className="mt-6 font-serif text-6xl font-semibold tracking-tight text-olive-deep sm:text-7xl"
        >
          Recipe<span className="text-terracotta">AI</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft"
        >
          Your AI kitchen companion. Create healthier recipes for you and your
          family.
        </motion.p>
      </motion.div>

      {/* Search */}
      <div className="relative z-10 mx-auto mt-8 max-w-4xl">
        <SearchBar />
      </div>
    </section>
  )
}
