import { Leaf } from 'lucide-react'

/**
 * FOODEAT brand logo — a leaf mark plus wordmark where "EAT" is terracotta.
 */
export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-olive-soft text-olive-dark">
        <Leaf className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="font-serif text-2xl font-semibold tracking-[0.12em] text-ink">
        FOOD<span className="text-terracotta">EAT</span>
      </span>
    </div>
  )
}
