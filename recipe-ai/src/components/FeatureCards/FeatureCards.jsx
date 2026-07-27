import { motion } from 'framer-motion'
import FeatureCard from './FeatureCard'
import { featureCards } from '../../data/content'

// Stagger the cards in as a group.
const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
}

/**
 * Responsive grid of the feature cards.
 * Desktop: 2 cards in row 1, last card spans the full width.
 * Mobile: all cards stack in a single column.
 * Render this component ONCE per page.
 */
export default function FeatureCards() {
  return (
    <motion.div
      variants={list}
      initial="hidden"
      animate="show"
      className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6"
    >
      {featureCards.map((card, i) => (
        <FeatureCard key={card.id} {...card} fullWidth={i === featureCards.length - 1} />
      ))}
    </motion.div>
  )
}