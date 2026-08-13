import { motion } from "framer-motion";
import {
  Eye,
  Bookmark,
  ArrowRight,
  Dumbbell,
  Leaf,
  Salad,
} from "lucide-react";

const cardVariant = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
    },
  },
};

export default function RecipeCard({
  image,
  title,
  subtitle,
  viewedLabel = "Viewed",
  timeAgo = "2 days ago",
  description,
  onOpen,
  onSave,
  saved = false,
}) {
  return (
    <motion.article
      variants={cardVariant}
      initial="hidden"
      animate="show"
      whileHover={{ y: -8 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 22,
      }}
      className="
      group
      flex
      flex-col
      snap-start
      shrink-0
      w-[258px]
      rounded-[28px]
      border
      border-cream-300
      bg-cream
      p-4
      shadow-sm
      transition-[box-shadow,border-color]
      duration-300
      hover:border-olive/40
      hover:shadow-lift
      "
    >
      {/* ---------- Top ---------- */}

      <div className="flex items-start justify-between">

        <div className="flex items-start gap-1.5">

          <Eye
            size={14}
            className="mt-[2px] text-ink-muted"
          />

          <div>

            <p className="text-[11px] font-semibold text-ink-soft">
              {viewedLabel}
            </p>

            <p className="text-[10px] text-ink-muted">
              {timeAgo}
            </p>

          </div>

        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onSave}
          title={saved ? "Remove bookmark" : "Bookmark recipe"}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            saved
              ? "bg-olive-soft text-olive-dark"
              : "text-ink-muted hover:bg-olive-soft hover:text-olive-dark"
          }`}
        >
          <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
        </motion.button>

      </div>

      {/* ---------- Image ---------- */}

      <button
        onClick={onOpen}
        className="
        mt-3
        block
        h-[168px]
        w-full
        shrink-0
        overflow-hidden
        rounded-[20px]
        "
      >
        <img
          src={image}
          alt={title}
          className="
          h-full
          w-full
          object-cover
          transition-transform
          duration-500
          ease-out
          group-hover:scale-110
          "
        />
      </button>

      {/* ---------- Title + description (grows to push tags to the bottom) ---------- */}

      <div className="flex flex-1 flex-col">

        <div className="mt-4">

          <h3
            className="
            font-serif
            text-[19px]
            font-bold
            leading-[1.15]
            text-ink
            "
          >
            {title}
          </h3>

          {subtitle && (
            <p
              className="
              mt-0.5
              text-[13px]
              italic
              text-ink-muted
              "
            >
              {subtitle}
            </p>
          )}

        </div>

        {/* ---------- Divider ---------- */}

        <div className="my-3.5 h-px bg-cream-300" />

        {/* ---------- Description ---------- */}

        {description && (
          <div className="flex gap-2">

            <ArrowRight
              size={12}
              className="mt-0.75 shrink-0 text-olive"
            />

            <p
              className="
              line-clamp-3
              text-[12px]
              leading-[1.4]
              text-ink-soft
              "
            >
              {description}
            </p>

          </div>
        )}

      </div>

      {/* ---------- Bottom Tags ---------- */}

      <div className="mt-4 grid grid-cols-3 gap-2">

        <Tag
          icon={<Dumbbell size={13} />}
          title="High"
          sub="Protein"
        />

        <Tag
          icon={<Leaf size={13} />}
          title="Low"
          sub="Carb"
        />

        <Tag
          icon={<Salad size={13} />}
          title="Diet"
          sub="Friendly"
        />

      </div>

    </motion.article>
  );
}

function Tag({
  icon,
  title,
  sub,
}) {
  return (
    <div
      className="
      rounded-2xl
      border
      border-cream-300
      bg-cream-100
      py-2.5
      flex
      flex-col
      items-center
      justify-center
      transition-colors
      duration-300
      group-hover:border-olive-soft
      "
    >
      <div className="text-olive-dark">
        {icon}
      </div>

      <p className="mt-1 text-[10px] font-semibold text-ink">
        {title}
      </p>

      <p className="text-[9px] text-ink-muted">
        {sub}
      </p>
    </div>
  );
}
