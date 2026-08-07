import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { blogPosts } from "../data/blog";
import useDocumentTitle from "../hooks/useDocumentTitle";

const list = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Blog() {
  useDocumentTitle("Blog");
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 pb-20 pt-6 sm:px-8">
      <div>
        <p className="type-eyebrow">RecipeAI Blog</p>
        <h1 className="mt-2 font-serif text-[32px] font-bold leading-tight text-ink sm:text-[44px]">
          Food, nutrition & practical cooking advice
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          Short, useful reads on eating better without giving up flavour —
          written to go with every recipe you generate.
        </p>
      </div>

      <motion.div
        variants={list}
        initial="hidden"
        animate="show"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {blogPosts.map((post) => (
          <motion.article
            key={post.slug}
            variants={cardVariant}
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/blog/${post.slug}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/blog/${post.slug}`);
              }
            }}
            className="flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-cream-300 bg-cream-100 shadow-card transition-shadow duration-300 hover:shadow-lift"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <span className="absolute left-4 top-4 rounded-full bg-cream/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-olive-dark shadow-soft">
                {post.category}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h2 className="font-serif text-xl font-bold leading-snug text-ink">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {post.excerpt}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-cream-300 pt-3 text-[13px] text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {post.readTime}
                </span>
                <span className="flex items-center gap-1 font-medium text-olive-dark">
                  Read
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}
