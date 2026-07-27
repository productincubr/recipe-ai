import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tracks whether a CSS media query currently matches.
 *
 * Layout itself stays CSS-driven; this is only for behaviour that CSS cannot
 * express — e.g. deciding whether the navbar hamburger should collapse the
 * desktop sidebar or open the mobile drawer.
 *
 * @param {string} query - a media query string, e.g. '(min-width: 1024px)'.
 * @returns {boolean} whether the query matches (false during SSR/first paint).
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
