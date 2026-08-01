import { motion } from "framer-motion";
import {
  Zap,
  Clock,
 Sparkles,
  Heart,
  Wand2,
} from "lucide-react";

import SearchBar from "../SearchBar/SearchBar";

const filters = [
  {
    id: 1,
    text: "High protein dinner",
    icon: Zap,
    color: "text-orange-500",
  },
  {
    id: 2,
    text: "Under 30 mins",
    icon: Clock,
    color: "text-blue-500",
  },
  {
    id: 3,
    text: "Veg meals",
    icon: Sparkles,
    color: "text-green-500",
  },
  {
    id: 4,
    text: "Low calorie",
    icon: Heart,
    color: "text-red-400",
  },
  {
    id: 5,
    text: "Surprise me",
    icon: Wand2,
    color: "text-yellow-500",
  },
];

function greetingForHour(hour) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Hero({ userName = "Ananya" }) {
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

        <p className="flex items-center gap-2 text-[18px] text-[#F28C28] font-medium">
          🌿 {greeting}, {userName}! 👋
        </p>

        {/* Heading */}

        <h1 className="mt-3 font-serif text-[55px] leading-[68px] font-bold text-[#1E2432] max-w-full">
          What would you like to cook today?
        </h1>

        {/* Subtitle */}

        <p className="mt-4 mb-8 text-[20px] text-gray-500 max-w-[700px]">
          Get personalized recipe ideas in seconds with Recipe AI.
        </p>

        <SearchBar />

        {/* Chips */}

        <div className="mt-10 flex flex-wrap gap-4">

          {filters.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className="flex items-center gap-2 rounded-full bg-[#F2F2F2] px-5 py-3 text-[13px] font-medium hover:bg-[#e8e8e8] transition"
              >
                <Icon className={`w-4 h-4 ${item.color}`} />
                {item.text}
              </button>
            );
          })}
        </div>

      </motion.div>
    </section>
  );
}