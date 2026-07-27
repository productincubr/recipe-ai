import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Sparkles, UserRound, Menu } from 'lucide-react'
import { navLinks } from '../../data/navigation'

/**
 * Top navigation bar for the content area.
 * Left: primary links. Right: Demo + Sign in actions.
 *
 * @param {() => void} [onMenuClick] - toggles the sidebar: collapses/restores the
 *   fixed sidebar on desktop, opens/closes the drawer below lg.
 * @param {boolean} [menuOpen] - whether the sidebar is currently showing.
 * @param {string} [menuControls] - id of the element the hamburger controls.
 * @param {import('react').RefObject<HTMLButtonElement>} [menuButtonRef] - lets the
 *   layout restore focus to the hamburger when the drawer closes.
 */
export default function Navbar({
  onMenuClick,
  menuOpen = false,
  menuControls = 'app-sidebar',
  menuButtonRef,
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
      {/* Left cluster: hamburger + primary links */}
      <div className="flex items-center gap-4 md:gap-8">
        {/* Hamburger — collapses the sidebar on desktop, opens the drawer below lg */}
        <button
          type="button"
          ref={menuButtonRef}
          onClick={onMenuClick}
          aria-label={menuOpen ? 'Hide menu' : 'Show menu'}
          aria-expanded={menuOpen}
          aria-controls={menuControls}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cream-300 bg-cream-100 text-ink-soft"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Primary links (hidden on small screens) */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end
              className={({ isActive }) =>
                clsx(
                  'relative font-serif text-[17px] transition-colors',
                  isActive
                    ? 'text-ink'
                    : 'text-ink-soft hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-olive"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => console.log('Demo clicked')}
          className="flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-100 px-4 py-2.5 text-[15px] font-normal text-ink shadow-soft transition-colors hover:bg-cream-200"
        >
          <Sparkles className="h-4 w-4 text-amber" strokeWidth={2} />
          Demo
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => console.log('Sign in clicked')}
          className="flex items-center gap-2 rounded-xl bg-olive-dark px-4 py-2.5 text-[15px] font-normal text-cream-100 shadow-soft transition-colors hover:bg-olive-deep"
        >
          <UserRound className="h-4 w-4" strokeWidth={2} />
          Sign in
        </motion.button>
      </div>
    </header>
  )
}
