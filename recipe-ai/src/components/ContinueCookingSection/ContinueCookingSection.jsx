import { motion } from "framer-motion";
import RecipeCarousel from "../RecipeCarousel/RecipeCarousel";

const reveal = {
  hidden: {
    opacity: 0,
    y: 25,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

export default function ContinueCookingSection() {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="mt-20"
    >
      {/* Header */}

      <div className="mb-8 flex items-center justify-between">

        <div className="flex items-end gap-4 flex-wrap">

          <h2
            className="
            font-serif
            text-5xl
            leading-none
            font-bold
            text-[#1F2432]
            "
          >
            Recently viewed
          </h2>

          <p
            className="
            mb-2
            text-[18px]
            text-[#767676]
            tracking-wide
            "
          >
            Based on your preferences
          </p>

        </div>

        <button
          className="
          rounded-full
          border
          border-[#E5E5E5]
          bg-white
          px-5
          py-2
          text-[14px]
          font-medium
          text-gray-600
          transition
          hover:bg-gray-100
          "
        >
          View all
        </button>

      </div>

      {/* Carousel */}

      <RecipeCarousel />
    </motion.section>
  );
}