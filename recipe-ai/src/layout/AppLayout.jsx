import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import Navbar from '../components/Navbar/Navbar'
import useFocusTrap from '../hooks/useFocusTrap'
import useMediaQuery from '../hooks/useMediaQuery'

/**
 * App shell: a fixed left sidebar and a scrolling content column.
 *
 * Layout is driven by CSS breakpoints (not JS) so there is no first-paint
 * flash:
 *
 * - Desktop (>=lg): a permanently fixed sidebar on the left; the content
 *   column is offset by its width (lg:ml-72) so only the content scrolls.
 *   The navbar hamburger collapses it — the sidebar slides out to the left
 *   and the content drops the offset to fill the width.
 * - Mobile/tablet (<lg): the fixed sidebar is hidden and replaced by an
 *   animated drawer + backdrop, toggled from the same hamburger.
 *
 * The two behaviours share one button; matchMedia only decides which piece of
 * state that button drives, never how the layout renders.
 */
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const drawerRef = useRef(null)
  const menuButtonRef = useRef(null)

  const handleMenuClick = () => {
    if (isDesktop) setSidebarCollapsed((collapsed) => !collapsed)
    else setDrawerOpen((open) => !open)
  }

  // Derived, not synced: crossing into desktop retires the drawer (and its
  // scroll lock) without leaving it mounted-but-hidden behind the CSS.
  const drawerVisible = drawerOpen && !isDesktop

  // While open, keep Tab inside the drawer and hand focus back to the
  // hamburger once it closes.
  useFocusTrap(drawerRef, drawerVisible, menuButtonRef)

  // Close the drawer on Escape, and stop the page behind it from scrolling
  // while it is open.
  useEffect(() => {
    if (!drawerVisible) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [drawerVisible])

  return (
    <div className="min-h-screen bg-cream">
      {/* Fixed desktop sidebar (CSS-hidden below lg) */}
      <aside
        id="app-sidebar"
        inert={sidebarCollapsed || undefined}
        className={clsx(
          'fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-cream-300 transition-transform duration-300 ease-in-out lg:block',
          sidebarCollapsed && '-translate-x-full',
        )}
      >
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerVisible && (
          <div className="lg:hidden">
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-olive-deep/30 backdrop-blur-sm"
            />
            <motion.aside
              key="drawer"
              ref={drawerRef}
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              id="mobile-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-cream-300 shadow-lift"
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-5 z-10 grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-cream-200"
              >
                <X className="h-5 w-5" />
              </button>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Content column — offset by the sidebar on desktop unless collapsed */}
      <div
        className={clsx(
          'flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out',
          !sidebarCollapsed && 'lg:ml-72',
        )}
      >
        <Navbar
          onMenuClick={handleMenuClick}
          menuOpen={isDesktop ? !sidebarCollapsed : drawerVisible}
          menuControls={isDesktop ? 'app-sidebar' : 'mobile-sidebar'}
          menuButtonRef={menuButtonRef}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
