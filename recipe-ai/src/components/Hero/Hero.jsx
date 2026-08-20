import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

import SearchBar from "../SearchBar/SearchBar";

function greetingForHour(hour) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Hero() {
  const greeting = greetingForHour(new Date().getHours());

  return (
    <section className="w-full">

      {/* Search Bar */}

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .5 }}
        className="mt-8"
      >

        {/* Greeting */}

        <p className="flex items-center gap-2 text-[15px] sm:text-[18px] text-terracotta font-medium">
          🌿 {greeting}! 👋
        </p>

        {/* Heading */}

        <h1 className="mt-3 font-serif text-[32px] leading-[1.1] sm:text-[42px] sm:leading-[1.1] md:text-[55px] md:leading-[68px] font-bold text-ink max-w-full mb-6">
          What would you like to cook today?
        </h1>

        {/* Subtitle */}

        <p className="mt-4 mb-8 text-[16px] sm:text-[20px] text-ink-soft max-w-[700px]">
          Get personalized recipe ideas in seconds with Recipe AI.
        </p>

        <SearchBar />

        {/* Tip */}

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-cream-100 border border-cream-300 px-4 py-3.5 sm:px-5 sm:py-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive-soft text-olive-dark">
            <Lightbulb size={15} />
          </span>
          <p className="text-[13px] sm:text-[14px] leading-relaxed text-ink-soft">
            <strong className="text-ink font-semibold">Tip: </strong>
            You'd be surprised how a few simple ingredient swaps can transform your
            favourite recipes into healthier, protein-rich, high-fibre meals
            without compromising on taste.
          </p>
        </div>

      </motion.div>
    </section>
  );
}
