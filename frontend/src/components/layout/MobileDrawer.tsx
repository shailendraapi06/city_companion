import { useEffect } from 'react'
import { SidebarContent } from './Sidebar'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden${open ? '' : ' pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label="App menu"
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-[var(--motion-base)]${
          open ? ' opacity-100' : ' opacity-0'
        }`}
      />
      <div
        className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-bg-1 shadow-2xl transition-transform duration-[var(--motion-base)]${
          open ? ' translate-x-0' : ' -translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-text-primary">Menu</span>
          <button type="button" onClick={onClose} className="btn-ghost px-2" aria-label="Close menu">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  )
}
