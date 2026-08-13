import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Camera,
  Upload,
  Compass,
  Search,
  FlaskConical,
  ArrowRightLeft,
  ChefHat,
  ShieldCheck,
  Salad,
  Drumstick,
  Globe,
  Sun,
  Flame,
  TrendingUp,
  History,
  BookOpen,
  Video,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const ENTRY_POINTS = [
  {
    icon: Camera,
    title: "Scan a Recipe",
    description:
      "Snap a photo of any dish or recipe card. Our AI reads it, understands the ingredients and method, then rebuilds it into a healthier version — with the swaps explained.",
    to: "/scan",
    cta: "Try scanning",
    color: "bg-terracotta/10 text-terracotta",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop",
  },
  {
    icon: Upload,
    title: "Create From Ingredients",
    description:
      "List what's already in your kitchen. Pick a cuisine, meal type and health goal, and we design a complete recipe built around what you have.",
    to: "/create",
    state: { mode: "ingredients" },
    cta: "Use my ingredients",
    color: "bg-olive/10 text-olive-dark",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop",
  },
  {
    icon: Compass,
    title: "Cook With Superfoods",
    description:
      "Choose from chia, quinoa, millets, moringa and more. We weave your picks into a full recipe that still tastes like something you'd actually crave.",
    to: "/create",
    state: { mode: "superfoods" },
    cta: "Pick a superfood",
    color: "bg-amber/15 text-amber",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&auto=format&fit=crop",
  },
];

const PIPELINE = [
  {
    icon: Search,
    title: "You tell us what you want",
    description:
      "Type a dish in the search bar, scan a photo, list your ingredients, or start from a superfood. Add your health goals, allergies, cuisine and spice level along the way.",
  },
  {
    icon: FlaskConical,
    title: "We check the evidence",
    description:
      "Before touching a single ingredient, we cross-reference nutrition science relevant to your goals — high protein, diabetes-friendly, heart healthy and more.",
  },
  {
    icon: ArrowRightLeft,
    title: "We plan smart swaps",
    description:
      "We decide exactly what needs to change to hit your goals safely, and what should stay untouched so the dish still tastes like what you asked for.",
  },
  {
    icon: ChefHat,
    title: "We build the full recipe",
    description:
      "A complete ingredient list, step-by-step method, nutrition breakdown, and chef tips — matched to the cuisine and meal type you chose.",
  },
  {
    icon: ShieldCheck,
    title: "We double-check it",
    description:
      "One last pass against your allergies and diet preference before the recipe reaches you, so nothing unsafe slips through.",
  },
];

const PERSONALIZATION = [
  { icon: Salad, label: "Health Goals", sub: "High protein, weight loss, heart healthy…" },
  { icon: ShieldCheck, label: "Allergies", sub: "Steer clear of what you can't eat" },
  { icon: Drumstick, label: "Veg / Non-Veg", sub: "A real toggle that shapes the recipe" },
  { icon: Globe, label: "Cuisine", sub: "Indian, Italian, Thai, Mexican & more" },
  { icon: Sun, label: "Meal Type", sub: "Breakfast, lunch, dinner, snack, dessert" },
  { icon: Flame, label: "Spice Level", sub: "From mild to extra spicy" },
];

const DISCOVER = [
  { icon: TrendingUp, label: "Trending Recipes", sub: "See what everyone's cooking", to: "/" },
  { icon: History, label: "Recently Searched", sub: "Reopen anything you've made", to: "/history" },
  { icon: Video, label: "Chef Video Library", sub: "Watch techniques in action", to: "/" },
  { icon: BookOpen, label: "The Blog", sub: "Nutrition & cooking reads", to: "/blog" },
];

function SectionEyebrow({ children }) {
  return <p className="type-eyebrow text-center">{children}</p>;
}

export default function HowItWorks() {
  useDocumentTitle("How It Works");
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-24 px-5 pb-24 pt-10 sm:px-8">
      {/* Hero */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={list}
        className="mx-auto flex max-w-2xl flex-col items-center text-center"
      >
        <motion.span
          variants={fadeUp}
          animate={{ y: [0, -6, 0] }}
          transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
          className="grid h-16 w-16 place-items-center rounded-3xl bg-olive-soft text-olive-dark shadow-soft"
        >
          <Sparkles className="h-8 w-8" />
        </motion.span>
        <motion.h1
          variants={fadeUp}
          className="mt-6 font-serif text-[36px] font-bold leading-[1.1] text-ink sm:text-[52px]"
        >
          How RecipeAI works
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft sm:text-[17px]"
        >
          Every recipe on this site is generated for you — built from clinical
          nutrition evidence, tuned to your goals, allergies and taste, and
          explained one swap at a time. Here's exactly what happens.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-full bg-olive-dark px-6 py-3 text-sm font-semibold text-cream shadow-lift transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Start a recipe
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate("/blog")}
            className="rounded-full border border-cream-300 bg-cream-100 px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-olive/40 hover:text-ink"
          >
            Read the blog
          </button>
        </motion.div>
      </motion.div>

      {/* Three entry points */}
      <section>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="flex flex-col items-center"
        >
          <motion.div variants={fadeUp}>
            <SectionEyebrow>Three ways to start</SectionEyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-2 text-center font-serif text-[26px] font-bold text-ink sm:text-[34px]"
          >
            Pick whatever's easiest right now
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="mt-10 grid gap-6 md:grid-cols-3"
        >
          {ENTRY_POINTS.map((item) => (
            <motion.div
              key={item.title}
              variants={cardVariant}
              whileHover={{ y: -10, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="group relative isolate flex flex-col overflow-hidden rounded-3xl border border-cream-300 bg-cream-100 p-6 shadow-card transition-[box-shadow,border-color] duration-300 hover:border-olive/40 hover:shadow-lift"
            >
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                loading="eager"
                className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45 transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 -z-10 bg-linear-to-b from-cream-100/60 via-cream-100/75 to-cream-100/90" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-olive-soft/0 transition-colors duration-500 group-hover:bg-olive-soft/60"
              />
              <motion.span
                whileHover={{ rotate: -8, scale: 1.12 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className={`relative grid h-12 w-12 place-items-center rounded-2xl ${item.color}`}
              >
                <item.icon className="h-6 w-6" />
              </motion.span>
              <h3 className="relative mt-4 font-serif text-xl font-bold text-ink">{item.title}</h3>
              <p className="relative mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {item.description}
              </p>
              <button
                onClick={() => navigate(item.to, item.state ? { state: item.state } : undefined)}
                className="relative mt-5 flex items-center gap-1.5 text-sm font-semibold text-olive-dark transition-colors hover:text-olive-deep"
              >
                {item.cta}
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pipeline timeline */}
      <section>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="flex flex-col items-center"
        >
          <motion.div variants={fadeUp}>
            <SectionEyebrow>Behind the scenes</SectionEyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-2 max-w-xl text-center font-serif text-[26px] font-bold text-ink sm:text-[34px]"
          >
            What happens the moment you hit generate
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={list}
          className="relative mx-auto mt-14 max-w-2xl"
        >
          {/* base line */}
          <span
            aria-hidden="true"
            className="absolute left-6 top-2 bottom-2 w-px bg-cream-300 sm:left-7"
          />
          {/* animated fill line */}
          <motion.span
            aria-hidden="true"
            variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 1.1, ease: "easeInOut" } } }}
            style={{ transformOrigin: "top" }}
            className="absolute left-6 top-2 bottom-2 w-px bg-olive sm:left-7"
          />

          <div className="space-y-10">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                whileHover="hover"
                className="group relative flex gap-5 pl-0"
              >
                <motion.span
                  variants={{ hover: { scale: 1.15, backgroundColor: "#6f7d33", color: "#faf6ec" } }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-olive bg-cream text-olive-dark shadow-soft sm:h-14 sm:w-14"
                >
                  <step.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.span>
                <motion.div
                  variants={{ hover: { y: -4 } }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="flex-1 rounded-2xl border border-cream-300 bg-cream-100 p-5 pt-4 transition-[border-color,box-shadow] duration-300 group-hover:border-olive/40 group-hover:shadow-card"
                >
                  <p className="type-eyebrow-muted">Step {i + 1}</p>
                  <h3 className="mt-1 font-serif text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {step.description}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Reasoning demo */}
      <section>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="grid items-center gap-10 md:grid-cols-2"
        >
          <motion.div variants={fadeUp}>
            <SectionEyebrow>Not a black box</SectionEyebrow>
            <h2 className="mt-2 font-serif text-[26px] font-bold text-ink sm:text-[32px]">
              You see the reasoning, not just the recipe
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              Every swap on your recipe page comes with a plain-English reason
              and the clinical benefit behind it — so you know exactly why an
              ingredient or technique changed, not just that it did.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            <div className="rounded-2xl border border-cream-300 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-600">White Rice</span>
                <ArrowRightLeft size={14} className="text-ink-muted" />
                <span className="rounded-full bg-olive-soft px-3 py-1 text-olive-deep">Brown Rice</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Chosen to fit your Diabetes-Friendly goal.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Higher fibre slows sugar absorption and improves glycemic response.
              </p>
            </div>
            <div className="rounded-2xl border border-cream-300 bg-cream-100/60 p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                <span>Deep Frying</span>
                <ArrowRightLeft size={14} className="text-ink-muted" />
                <span className="text-olive-deep">Pan-Searing</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Cuts added oil while keeping the same texture and crust.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Personalization grid */}
      <section>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="flex flex-col items-center"
        >
          <motion.div variants={fadeUp}>
            <SectionEyebrow>Tuned to you</SectionEyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-2 max-w-lg text-center font-serif text-[26px] font-bold text-ink sm:text-[34px]"
          >
            Every recipe is filtered through your preferences
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          {PERSONALIZATION.map((item) => (
            <motion.div
              key={item.label}
              variants={cardVariant}
              whileHover={{ y: -5, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-cream-300 bg-cream-100 p-5 transition-[border-color,box-shadow] duration-300 hover:border-olive/40 hover:shadow-card"
            >
              <motion.span
                whileHover={{ scale: 1.15, rotate: 8 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
                className="grid h-10 w-10 place-items-center rounded-xl bg-olive-soft text-olive-dark transition-colors duration-300 group-hover:bg-olive-dark group-hover:text-cream"
              >
                <item.icon className="h-5 w-5" />
              </motion.span>
              <div>
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Discover section */}
      <section>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="flex flex-col items-center"
        >
          <motion.div variants={fadeUp}>
            <SectionEyebrow>After you generate</SectionEyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-2 max-w-lg text-center font-serif text-[26px] font-bold text-ink sm:text-[34px]"
          >
            Keep discovering
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={list}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {DISCOVER.map((item) => (
            <motion.button
              key={item.label}
              variants={cardVariant}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={() => navigate(item.to)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-cream-300 bg-cream-100 p-5 text-left transition-[border-color,box-shadow] duration-300 hover:border-olive/40 hover:shadow-card"
            >
              <motion.span
                whileHover={{ scale: 1.15, rotate: -8 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
                className="grid h-10 w-10 place-items-center rounded-xl bg-amber/15 text-amber transition-colors duration-300 group-hover:bg-amber group-hover:text-cream"
              >
                <item.icon className="h-5 w-5" />
              </motion.span>
              <div>
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{item.sub}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Final CTA */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
        className="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-3xl border border-cream-300 px-6 py-14 text-center"
      >
        <motion.img
          src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1400&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0, scale: 1.15 }}
          whileInView={{ opacity: 0.90, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-olive-soft/90 via-olive-soft/70 to-olive-soft/90" />

        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-6 w-6 text-olive-dark" />
        </motion.span>
        <h2 className="max-w-md font-serif text-[26px] font-bold text-ink sm:text-[32px]">
          Ready to cook something healthier?
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">
          Head back to the search bar, type any dish, and watch the whole
          pipeline run for you.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 flex items-center gap-2 rounded-full bg-olive-dark px-7 py-3.5 text-sm font-semibold text-cream shadow-lift transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Start cooking smarter
          <ArrowRight size={16} />
        </button>
      </motion.section>
    </div>
  );
}
