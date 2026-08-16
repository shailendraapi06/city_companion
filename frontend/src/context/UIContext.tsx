import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/*
 * Global UI chrome state per Frontend_Architecture.md §5.3 — kept intentionally
 * small: sidebar/drawer open state and the prefers-reduced-motion preference.
 */

interface UIContextType {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  reduceMotion: boolean
}

const UIContext = createContext<UIContextType | undefined>(undefined)

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function UIContextProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduceMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const value = useMemo<UIContextType>(
    () => ({ sidebarOpen, setSidebarOpen, reduceMotion }),
    [sidebarOpen, reduceMotion]
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUIContext(): UIContextType {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUIContext must be used within a UIContextProvider')
  }
  return context
}
