import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Camera,
  Mic,
  Paperclip,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const PLACEHOLDER = "Type a recipe you’d like to make healthier…";

function DietToggle({ diet, setDiet, className = "", compact = false, scope }) {
  return (
    <div
      className={`flex shrink-0 items-center rounded-full border border-cream-300 bg-cream-100 p-1 ${className}`}
    >
      {[
        { value: "veg", label: "Veg", color: "#0E8A16" },
        { value: "nonveg", label: "Non-Veg", color: "#C1272D" },
      ].map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setDiet(opt.value)}
          className={`relative flex items-center rounded-full font-semibold transition-colors ${
            compact ? "gap-1 px-2 py-1 text-[10px]" : "gap-1.5 px-3 py-1.5 text-[12px]"
          } ${diet === opt.value ? "text-ink" : "text-ink-muted hover:text-ink-soft"}`}
        >
          {diet === opt.value && (
            <motion.span
              layoutId={`diet-toggle-pill-${scope}`}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 rounded-full bg-white shadow-sm"
            />
          )}
          <span
            className={`relative z-10 flex shrink-0 items-center justify-center rounded-[3px] border-2 ${
              compact ? "h-2.5 w-2.5" : "h-3 w-3"
            }`}
            style={{ borderColor: opt.color }}
          >
            <span
              className={`rounded-full ${compact ? "h-0.75 w-0.75" : "h-1 w-1"}`}
              style={{ backgroundColor: opt.color }}
            />
          </span>
          <span className="relative z-10 whitespace-nowrap">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [diet, setDiet] = useState("veg");

  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!query.trim()) return;

    navigate("/create", { state: { dish: query.trim(), dietPreference: diet } });
  };

  const handleImagePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    navigate("/scan", { state: { file } });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .4 }}
    >
      {/* Mobile Composer Card */}

      <motion.div
        animate={
          isFocused
            ? {
                borderColor: "#6f7d33",
                boxShadow: "0 10px 32px rgba(230, 169, 58, 0.28)",
                scale: 1,
              }
            : {
                borderColor: ["#f1dfb2", "#e6a93a", "#f1dfb2"],
                boxShadow: [
                  "0 6px 18px rgba(230, 169, 58, 0.14)",
                  "0 10px 30px rgba(230, 169, 58, 0.24)",
                  "0 6px 18px rgba(230, 169, 58, 0.14)",
                ],
                scale: [1, 1.012, 1],
              }
        }
        transition={
          isFocused
            ? { duration: 0.3, ease: "easeOut" }
            : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
        }
        className="
        md:hidden
        rounded-[28px]
        bg-cream
        border-2
        p-5
        shadow-card
        "
      >
        <div className="flex items-center gap-3">
          <motion.span
            animate={{
              backgroundColor: isFocused ? "#6f7d33" : "#f0e6cd",
              rotate: isFocused ? 12 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            <Sparkles
              className={`h-4.5 w-4.5 transition-colors duration-300 ${
                isFocused ? "text-white" : "text-amber"
              }`}
              strokeWidth={2.2}
            />
          </motion.span>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={PLACEHOLDER}
            className="
            min-w-0
            flex-1
            bg-transparent
            border-none
            outline-none
            ring-0
            text-[16px]
            font-semibold
            text-ink
            placeholder:font-normal
            placeholder:text-ink-muted
            focus:outline-none
            focus:ring-0
            focus:border-none
            focus-visible:outline-none
            focus-visible:ring-0
            appearance-none
            "
          />
        </div>

        {/* Toolbar */}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-cream-300 pt-3.5">
          <div className="flex min-w-0 items-center gap-1 text-ink-muted">
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-cream-100 hover:text-ink"
            >
              <Mic size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-cream-100 hover:text-ink"
            >
              <Camera size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-cream-100 hover:text-ink"
            >
              <Paperclip size={18} />
            </motion.button>

            <DietToggle diet={diet} setDiet={setDiet} compact scope="mobile" className="ml-1" />
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            animate={{
              backgroundColor: query.trim() ? "#6f7d33" : "#3a441c",
            }}
            transition={{ duration: 0.25 }}
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          >
            <ArrowRight size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* Desktop Pill */}

      <motion.div
        animate={
          isFocused
            ? {
                borderColor: "#6f7d33",
                boxShadow: "0 12px 34px rgba(230, 169, 58, 0.26)",
                scale: 1,
              }
            : {
                borderColor: ["#f1dfb2", "#e6a93a", "#f1dfb2"],
                boxShadow: [
                  "0 6px 20px rgba(230, 169, 58, 0.12)",
                  "0 10px 30px rgba(230, 169, 58, 0.2)",
                  "0 6px 20px rgba(230, 169, 58, 0.12)",
                ],
                scale: [1, 1.008, 1],
              }
        }
        transition={
          isFocused
            ? { duration: 0.3, ease: "easeOut" }
            : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
        }
        className="
        hidden
        md:flex
        items-center
        gap-4
        h-[72px]
        rounded-full
        bg-cream
        px-7

        border-2
        shadow-card
        "
      >
        {/* Left Icon */}

        <motion.span
          animate={{
            backgroundColor: isFocused ? "#6f7d33" : "#f0e6cd",
            rotate: isFocused ? 12 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        >
          <Sparkles
            className={`h-5 w-5 transition-colors duration-300 ${
              isFocused ? "text-white" : "text-amber"
            }`}
            strokeWidth={2.2}
          />
        </motion.span>

        {/* Input */}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={PLACEHOLDER}
          className="
          flex-1
          bg-transparent
          border-none
          outline-none
          ring-0
          text-[17px]
          font-semibold
          text-ink
          focus:outline-none
          focus:ring-0
          focus:border-none
          focus-visible:outline-none
          focus-visible:ring-0
          appearance-none
          placeholder:font-normal
          placeholder:text-ink-muted
        "
        />

        {/* Diet preference */}

        <DietToggle diet={diet} setDiet={setDiet} scope="desktop" className="shrink-0" />

        <span className="h-7 w-px shrink-0 bg-cream-300" aria-hidden="true" />

        {/* Camera */}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-ink-muted hover:text-ink transition"
        >
          <Camera size={21} />
        </button>

        {/* Mic */}

        <button
          type="button"
          className="text-ink-muted hover:text-ink transition"
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
          bg-olive-dark
          text-white
          flex
          items-center
          justify-center
          "
        >
          <ArrowRight size={20} />
        </motion.button>
      </motion.div>

      {/* Hidden file inputs powering the camera / attach icons */}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImagePicked}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImagePicked}
      />
    </motion.form>
  );
}
