import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

/**
 * A single sidebar navigation row. Highlights an active pill state and can
 * render an optional numeric badge (e.g. saved recipes count).
 */
export default function NavItem({ to, icon: Icon, label, badge, onNavigate }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-colors',
          isActive
            ? 'bg-olive-soft font-normal text-olive-deep'
            : 'text-ink-soft hover:bg-cream-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={clsx(
              'h-5 w-5 shrink-0',
              isActive ? 'text-olive-dark' : 'text-ink-muted',
            )}
            strokeWidth={2}
          />
          <span className="flex-1">{label}</span>
          {badge != null && (
            <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-cream-100">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
