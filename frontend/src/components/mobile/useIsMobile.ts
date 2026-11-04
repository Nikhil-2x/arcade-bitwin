import { useSyncExternalStore } from 'react'

/** Touch-only devices at phone size, in either orientation (a landscape phone is wide but short). */
export const MOBILE_QUERY =
  '(hover: none) and (pointer: coarse) and (max-width: 1024px), (hover: none) and (pointer: coarse) and (max-height: 600px)'

const media = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null

/** Non-React callers (game loops, event handlers) can ask directly. */
export const isMobileUI = () => media?.matches ?? false

const subscribe = (cb: () => void) => {
  media?.addEventListener('change', cb)
  return () => media?.removeEventListener('change', cb)
}

/** True on phones; on-screen controls only render when this is. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, isMobileUI, () => false)
}
