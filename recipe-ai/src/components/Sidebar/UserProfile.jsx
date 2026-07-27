import { ChevronDown } from 'lucide-react'
import { currentUser } from '../../data/navigation'

/**
 * Bottom-of-sidebar user card: avatar, name, plan and a dropdown affordance.
 */
export default function UserProfile() {
  return (
    <button
      type="button"
      onClick={() => console.log('Open profile menu')}
      className="flex w-full items-center gap-3 rounded-2xl border border-cream-300 bg-cream-100 px-3 py-2.5 text-left transition-colors hover:bg-cream-200"
    >
      <img
        src={currentUser.avatar}
        alt={currentUser.name}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-cream-300"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-ink">
          {currentUser.name}
        </span>
        <span className="block truncate text-xs text-ink-muted">
          {currentUser.plan}
        </span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2} />
    </button>
  )
}
