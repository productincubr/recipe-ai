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
  tags = [],
  onOpen,
  onSave,
}) {
  return (
    <motion.article
      variants={cardVariant}
      whileHover={{
        y: -8,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 22,
      }}
      className="
      snap-start
      shrink-0
      w-[185px]
      rounded-[24px]
      border
      border-[#61B8B1]
      bg-white
      p-3
      shadow-sm
      hover:shadow-xl
      transition-all
      "
    >
      {/* ---------- Top ---------- */}

      <div className="flex items-start justify-between">

        <div className="flex items-start gap-1">

          <Eye
            size={15}
            className="mt-[1px] text-gray-700"
          />

          <div>

            <p className="text-[10px] font-medium text-gray-700">
              {viewedLabel}
            </p>

            <p className="text-[9px] text-gray-400">
              {timeAgo}
            </p>

          </div>

        </div>

        <button
          onClick={onSave}
          className="text-gray-700 hover:text-black"
        >
          <Bookmark size={16} />
        </button>

      </div>

      {/* ---------- Image ---------- */}

      <button
        onClick={onOpen}
        className="
        mt-3
        block
        h-[178px]
        w-full
        overflow-hidden
        rounded-[18px]
        "
      >
        <img
          src={image}
          alt={title}
          className="
          h-full
          w-full
          object-cover
          transition
          duration-500
          hover:scale-110
          "
        />
      </button>

      {/* ---------- Title ---------- */}

      <div className="mt-4">

        <h3
          className="
          font-serif
          text-[18px]
          font-bold
          leading-5
          text-[#252B3B]
          "
        >
          {title}
        </h3>

        <p
          className="
          text-[14px]
          italic
          text-gray-500
          "
        >
          {subtitle}
        </p>

      </div>

      {/* ---------- Divider ---------- */}

      <div className="my-3 h-px bg-[#ECECEC]" />

      {/* ---------- Description ---------- */}

      <div className="flex gap-2">

        <ArrowRight
          size={12}
          className="mt-1 text-gray-500"
        />

        <p
          className="
          text-[10px]
          leading-4
          text-gray-500
          "
        >
          {description}
        </p>

      </div>

      {/* ---------- Bottom Tags ---------- */}

      <div className="mt-4 grid grid-cols-3 gap-2">

        <Tag
          icon={<Dumbbell size={12} />}
          title="High"
          sub="Protein"
        />

        <Tag
          icon={<Leaf size={12} />}
          title="Low"
          sub="Carb"
        />

        <Tag
          icon={<Salad size={12} />}
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
      rounded-xl
      border
      border-[#EAEAEA]
      py-2
      flex
      flex-col
      items-center
      justify-center
      "
    >
      <div className="text-[#1A8B84]">
        {icon}
      </div>

      <p className="mt-1 text-[9px] font-semibold">
        {title}
      </p>

      <p className="text-[8px] text-gray-500">
        {sub}
      </p>
    </div>
  );
}