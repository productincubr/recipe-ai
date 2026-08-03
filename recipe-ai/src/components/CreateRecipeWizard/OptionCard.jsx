import { motion } from "framer-motion";
import { Check } from "lucide-react";
import clsx from "clsx";

// Selection accent is orange everywhere by default; "None of these"-style
// options can opt into the olive/green accent used in the allergy mockup.
const ACCENTS = {
  orange: {
    selected: "border-[#F28C28] shadow-[0_0_0_1px_#F28C28] ring-1 ring-[#F28C28]/40",
    badge: "bg-[#F28C28]",
  },
  olive: {
    selected: "border-olive shadow-[0_0_0_1px_var(--color-olive)] ring-1 ring-olive/40",
    badge: "bg-olive-dark",
  },
};

export default function OptionCard({ option, selected, onSelect }) {
  const Icon = option.icon;
  const accent = ACCENTS[option.accent] || ACCENTS.orange;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(option.value)}
      aria-pressed={selected}
      className={clsx(
        "relative flex flex-col items-start gap-3 rounded-2xl border bg-white p-4 text-left transition-all duration-150",
        selected
          ? accent.selected
          : "border-cream-300 hover:border-[#e0dccd] hover:shadow-soft"
      )}
    >
      {selected && (
        <span
          className={clsx(
            "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-soft",
            accent.badge
          )}
        >
          <Check size={12} strokeWidth={3} />
        </span>
      )}

      <span
        className={clsx(
          "flex h-11 w-11 items-center justify-center rounded-full",
          option.color
        )}
      >
        <Icon size={20} />
      </span>

      <span>
        <span className="block text-[14px] font-semibold text-ink">
          {option.label}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
          {option.sub}
        </span>
      </span>
    </motion.button>
  );
}
