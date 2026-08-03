import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChefHat, Sparkles, Leaf, Flame } from "lucide-react";

const MESSAGES = [
  "Analyzing your preferences...",
  "Balancing nutrition & flavour...",
  "Swapping in healthier ingredients...",
  "Perfecting the cooking steps...",
  "Plating it up for you...",
];

export default function GeneratingOverlay({ show }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!show) {
      setMessageIndex(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-cream/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mx-4 flex w-full max-w-sm flex-col items-center gap-7 rounded-[28px] border border-cream-300 bg-white px-10 py-12 text-center shadow-lift"
          >
            {/* Animated icon cluster */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-[42%_58%_55%_45%/48%_42%_58%_52%] bg-gradient-to-br from-[#FBE3CE] to-[#E7EAD1]"
              />

              {/* Orbiting accents */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <motion.span
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2"
                >
                  <Sparkles size={16} className="text-[#F28C28]" strokeWidth={2} />
                </motion.span>
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-0 right-1"
                >
                  <Leaf size={14} className="text-olive" strokeWidth={2} />
                </motion.span>
              </motion.div>

              {/* Center icon */}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-soft"
              >
                <ChefHat size={30} strokeWidth={1.75} className="text-olive-dark" />
              </motion.div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="font-serif text-2xl font-bold text-ink">
                Cooking up your recipe
              </h2>
              <div className="h-5 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm text-ink-soft"
                  >
                    {MESSAGES[messageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Indeterminate progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
              <motion.div
                animate={{ x: ["-100%", "250%"] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-1/3 rounded-full bg-olive"
              />
            </div>

            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              <Flame size={12} className="text-amber" />
              This can take up to a minute
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
