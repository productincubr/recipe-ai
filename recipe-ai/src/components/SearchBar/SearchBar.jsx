import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Camera,
  Mic,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!query.trim() || loading) return;

    setLoading(true);

    try {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL ||
        "https://recipe-final-zjcl.onrender.com";

      const response = await fetch(`${baseUrl}/api/recipes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dish: query,
          goals: ["Healthy eating"],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setQuery("");
        navigate(`/recipe/${data.id || data.recipe?.id || data.generated_recipe_id}`);
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Network Error");
    } finally {
      setLoading(false);
    }
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
        disabled={loading}
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
        disabled={loading}
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
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <ArrowRight size={20} />
        )}
      </motion.button>
    </motion.form>
  );
}