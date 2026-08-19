import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useChat } from '../../context/ChatContext'

interface LocationIndicatorProps {
  className?: string
}

/*
 * UI_UX_Brief.md §8 / APP_FLOW.md §9 — the visible, editable location
 * indicator: "📍 Using current location — Change." The manual city/location
 * override always takes precedence once set for the session (cross-city
 * queries), and clearing it falls back to device location / manual prompt.
 * Device capture itself is owned by ChatProvider (requested once on mount),
 * via `requestLocation` re-requesting the permission.
 */
export function LocationIndicator({ className }: LocationIndicatorProps) {
  const { location, locationOverride, locationError, requestLocation, setLocationOverride } = useChat()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const override = locationOverride != null && locationOverride.trim() !== '' ? locationOverride.trim() : null
  const label = override ?? (location ? 'Using current location' : 'Set location')

  const applyOverride = (event: FormEvent) => {
    event.preventDefault()
    const value = draft.trim()
    if (value) {
      setLocationOverride(value)
      setOpen(false)
      setDraft('')
    }
  }

  const useDeviceLocation = () => {
    setOpen(false)
    requestLocation()
  }

  const clearOverride = () => {
    setLocationOverride(null)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Location: ${label}. Change location.`}
        className="flex min-w-0 max-w-56 items-center gap-1.5 rounded-full border border-border bg-bg-2 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent-1/40"
      >
        <span aria-hidden="true">📍</span>
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-accent-1">Change</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Change location"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-bg-2 p-4 shadow-xl"
        >
          {override ? (
            <p className="text-sm text-text-primary">
              Searching in <span className="font-semibold">{override}</span> until you change it.
            </p>
          ) : location ? (
            <p className="text-sm text-text-primary">Using your device's current location.</p>
          ) : locationError ? (
            <p className="text-sm leading-relaxed text-text-secondary">
              We couldn't access your location. Choose a city to search in instead.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-text-secondary">
              Set a city or area to search in. Your device location will be used automatically when available.
            </p>
          )}

          <form onSubmit={applyOverride} className="mt-3">
            <label htmlFor="location-city" className="field-label">
              City or area
            </label>
            <input
              id="location-city"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="e.g. Lucknow"
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-bg-1 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-1/60 focus-visible:ring-2 focus-visible:ring-accent-1/40"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply manual location
            </button>
          </form>

          <div className="mt-2 flex flex-col gap-1">
            <button type="button" onClick={useDeviceLocation} className="btn-ghost justify-center text-xs">
              Use my current location
            </button>
            {override ? (
              <button type="button" onClick={clearOverride} className="btn-ghost justify-center text-xs">
                Clear manual location
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
