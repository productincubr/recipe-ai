import { Leaf } from 'lucide-react'

/**
 * LEANMENU brand logo — a leaf mark plus wordmark where "MENU" is terracotta.
 */
export default function Logo({ className = '', wordmarkClassName = '' }) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-olive-soft text-olive-dark">
        <Leaf className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className={`font-serif text-2xl font-semibold tracking-[0.12em] text-ink ${wordmarkClassName}`}>
        LEAN<span className="text-terracotta">MENU</span>
      </span>
    </div>
  )
}
