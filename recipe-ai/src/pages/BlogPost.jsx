import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, User } from "lucide-react";
import { getBlogPostBySlug, getRelatedPosts } from "../data/blog";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = getBlogPostBySlug(slug);

  useDocumentTitle(post ? post.title : "Blog");

  if (!post) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16 text-center">
        <p className="text-ink-soft">This article doesn't exist.</p>
        <Link
          to="/blog"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-olive-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <ArrowLeft size={16} />
          Back to Blog
        </Link>
      </div>
    );
  }

  const related = getRelatedPosts(post.slug);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-6 sm:px-8">
      <button
        type="button"
        onClick={() => navigate("/blog")}
        className="flex items-center gap-2 rounded-full bg-cream-100 px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-cream-200"
      >
        <ArrowLeft size={16} />
        Back to Blog
      </button>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-6"
      >
        <span className="rounded-full bg-olive-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-olive-deep">
          {post.category}
        </span>
        <h1 className="mt-4 font-serif text-[30px] font-bold leading-tight text-ink sm:text-[42px]">
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <User size={14} />
            {post.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {post.readTime}
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-300">
          <img
            src={post.coverImage}
            alt={post.title}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>

        <div className="mt-8 space-y-5">
          {post.body.map((block, i) => {
            if (block.type === "h2") {
              return (
                <h2 key={i} className="font-serif text-2xl font-bold text-ink pt-2">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "quote") {
              return (
                <blockquote
                  key={i}
                  className="border-l-4 border-olive bg-cream-100 rounded-r-2xl py-4 pl-5 pr-4 italic text-ink-soft"
                >
                  {block.text}
                </blockquote>
              );
            }
            return (
              <p key={i} className="text-[16px] leading-relaxed text-ink-soft">
                {block.text}
              </p>
            );
          })}
        </div>
      </motion.article>

      {related.length > 0 && (
        <div className="mt-14 border-t border-cream-300 pt-8">
          <p className="type-eyebrow mb-4">Related articles</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/blog/${r.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 transition-shadow hover:shadow-card"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={r.coverImage}
                    alt={r.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold leading-snug text-ink line-clamp-2">
                    {r.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
