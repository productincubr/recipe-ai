import { motion } from "framer-motion";

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: .45 }
  }
};

export default function FeatureCard({
  title,
  description,
  cta,
  icon: Icon,
  bg,
  image,
  onAction,
}) {
  return (
    <motion.div
      variants={cardVariant}
      whileHover={{
        y: -5,
        scale: 1.02,
      }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 20,
      }}
      className="relative min-h-67.5 overflow-hidden rounded-[26px] p-7 shadow-lg"
      style={{ background: bg }}
    >
      {/* Decorative Image */}

      <img
        src={image}
        alt={title}
        className="
        absolute
        right-[-10px]
        top-5
        w-[140px]
        h-[140px]
        rounded-full
        object-cover
        shadow-lg
        "
      />

      <div className="relative z-10 flex h-full flex-col">

        <h2
          className="
          max-w-[62%]
          text-white
          text-[31px]
          leading-[38px]
          font-bold
          tracking-[-1px]
          font-serif
          "
        >
          {title}
        </h2>

        <p
          className="
          mt-5
          max-w-[58%]
          text-[16px]
          leading-6
          text-white/90
          mb-3
          "
        >
          {description}
        </p>

        <button
          onClick={onAction}
          className="
          mt-auto
          flex
          w-fit
          items-center
          gap-2
          whitespace-nowrap
          rounded-xl
          bg-[#014E49]
          px-5
          py-3
          text-[15px]
          font-medium
          text-white
          transition-all
          duration-300
          hover:scale-105
          hover:bg-[#013B38]
          "
        >
          <Icon size={17} />
          {cta}
        </button>

      </div>
    </motion.div>
  );
}