import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Camera,
  Mic,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
      className="
      flex
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
    </motion.form>
  );
}