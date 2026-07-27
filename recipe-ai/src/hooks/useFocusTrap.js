import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const getFocusable = (container) =>
  Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )

/**
 * Confines Tab/Shift+Tab to the elements inside `containerRef` while `active`,
 * moves initial focus into it, and restores focus to whatever was focused
 * before (or `restoreRef`, when given) once it deactivates.
 *
 * @param {import('react').RefObject<HTMLElement>} containerRef - the trap boundary.
 * @param {boolean} active - whether the trap is engaged.
 * @param {import('react').RefObject<HTMLElement>} [restoreRef] - element to focus
 *   on release; defaults to the previously focused element.
 */
export default function useFocusTrap(containerRef, active, restoreRef) {
  useEffect(() => {
    const container = containerRef.current
    if (!active || !container) return undefined

    const previouslyFocused = document.activeElement

    // Move focus in, so the first Tab continues from inside the trap.
    const initial = getFocusable(container)[0] ?? container
    initial.focus()

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return

      const focusable = getFocusable(container)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      // Focus escaped the container (or sits on it) — pull it back in.
      if (!container.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Read restoreRef at cleanup time on purpose: we want the element as it
      // exists when the trap releases, not the one captured when it engaged.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const restoreTo = restoreRef?.current ?? previouslyFocused
      if (restoreTo?.isConnected) restoreTo.focus()
    }
  }, [containerRef, active, restoreRef])
}
