import { Leaf, Sparkles } from "lucide-react";

// Self-contained decorative header graphic (no external image assets) —
// a soft peach blob with the step's icon plus small leaf/sparkle accents,
// echoing the illustration shown next to each step's heading in the mockup.
export default function StepIllustration({ icon: Icon }) {
  if (!Icon) return null;

  return (
    <div className="relative hidden h-32 w-32 shrink-0 sm:block md:h-36 md:w-36">
      <div className="absolute inset-0 rounded-[42%_58%_55%_45%/48%_42%_58%_52%] bg-gradient-to-br from-[#FBE3CE] to-[#F7D3B3]" />

      <Leaf
        size={18}
        className="absolute -left-2 bottom-3 rotate-[-15deg] text-olive"
        strokeWidth={2}
      />
      <Sparkles
        size={16}
        className="absolute -right-1 top-1 text-[#F28C28]"
        strokeWidth={2}
      />

      <div className="relative flex h-full items-center justify-center">
        <Icon size={56} strokeWidth={1.5} className="text-[#1E2432]" />
      </div>
    </div>
  );
}
