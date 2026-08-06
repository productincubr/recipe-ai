import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Camera,
  Mic,
  Paperclip,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MOBILE_SUGGESTIONS = [
  "I have paneer and spinach",
  "High protein dinner",
  "Quick lunch ideas",
];

export default function SearchBar() {
  const [query, setQuery] = useState("");

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!query.trim()) return;

    navigate("/create", { state: { dish: query.trim() } });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .4 }}
    >
      {/* Mobile Composer Card */}

      <div
        className="
        md:hidden
        rounded-3xl
        bg-[#F5F4F2]
        border
        border-[#ECE9E4]
        p-4
        shadow-sm

        transition-all
        duration-300

        focus-within:border-[#D8D6D3]
        focus-within:ring-2
        focus-within:ring-[#E6E3DE]
        "
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FDECC8]">
            <Sparkles className="h-4 w-4 text-[#F5B400]" strokeWidth={2.2} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[#1E2432] leading-snug">
              What would you like to cook today?
            </p>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe your ingredients, mood or goal..."
              className="
              mt-1
              w-full
              bg-transparent
              border-none
              outline-none
              ring-0
              text-[13px]
              text-[#4A4A4A]
              placeholder:text-[#9A968F]
              focus:outline-none
              focus:ring-0
              focus:border-none
              focus-visible:outline-none
              focus-visible:ring-0
              appearance-none
              overflow-hidden
              text-ellipsis
              whitespace-nowrap
              "
            />
          </div>
        </div>

        {/* Suggestion chips */}

        <div className="mt-3 flex flex-wrap gap-2">
          {MOBILE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="rounded-full border border-[#ECE9E4] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4A4A4A] transition hover:bg-[#EFEDE9]"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Toolbar */}

        <div className="mt-4 flex items-center justify-between border-t border-[#ECE9E4] pt-3">
          <div className="flex items-center gap-4 text-[#8B8B8B]">
            <button type="button" className="hover:text-black transition">
              <Mic size={19} />
            </button>
            <button type="button" className="hover:text-black transition">
              <Camera size={19} />
            </button>
            <button type="button" className="hover:text-black transition">
              <Paperclip size={19} />
            </button>
          </div>

          <motion.button
            whileTap={{ scale: .95 }}
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#343434] text-white"
          >
            <ArrowRight size={17} />
          </motion.button>
        </div>
      </div>

      {/* Desktop Pill */}

      <div
        className="
        hidden
        md:flex
        items-center
        gap-4
        h-[68px]
        rounded-full
        bg-[#F5F4F2]
        px-6
        shadow-sm

        border
        border-transparent

        transition-all
        duration-300

        focus-within:border-[#D8D6D3]
        focus-within:ring-2
        focus-within:ring-[#E6E3DE]
        "
      >
        {/* Left Icon */}

        <Sparkles
          className="h-5 w-5 text-[#F5B400] shrink-0"
          strokeWidth={2.2}
        />

        {/* Input */}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="let’s make a healthier version of your dish"
          className="
          flex-1
          bg-transparent
          border-none
          outline-none
          ring-0
          focus:outline-none
          focus:ring-0
          focus:border-none
          focus-visible:outline-none
          focus-visible:ring-0
          appearance-none
          placeholder:text-[#7b7b7b]
        "
        />

        {/* Camera */}

        <button
          type="button"
          className="text-[#8B8B8B] hover:text-black transition"
        >
          <Camera size={21} />
        </button>

        {/* Mic */}

        <button
          type="button"
          className="text-[#8B8B8B] hover:text-black transition"
        >
          <Mic size={21} />
        </button>

        {/* Send */}

        <motion.button
          whileTap={{ scale: .95 }}
          whileHover={{ scale: 1.05 }}
          type="submit"
          className="
          h-11
          w-11
          rounded-full
          bg-[#343434]
          text-white
          flex
          items-center
          justify-center
          "
        >
          <ArrowRight size={20} />
        </motion.button>
      </div>
    </motion.form>
  );
}