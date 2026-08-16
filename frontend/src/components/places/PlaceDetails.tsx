import { useQuery } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePlaceSave } from '../../hooks/usePlaceSave'
import { getPlace } from '../../lib/api/places'
import { formatPrice } from '../../lib/blockUtils'
import type { PlaceDetail } from '../../types'
import { PlaceActionsRow, type PlaceAction } from './PlaceActions'

/*
 * Place details view (UI_UX_Brief §5.7 — no map in MVP, deep links only).
 *
 * One provider is mounted once at the app shell (AppLayout) and renders either
 * a desktop right-side Drawer (≥768px) or a mobile bottom Sheet. Opening is
 * triggered by any place card's "View Details" action, which then fetches the
 * REAL Phase 4B GET /api/places/{id}/ endpoint.
 *
 * The context default is a no-op so cards rendered without the provider (e.g.
 * chat renderer unit tests) never crash at mount time.
 */

export interface PlaceDetailsContextType {
  openPlaceDetails: (placeId: string) => void
  closePlaceDetails: () => void
}

const DEFAULT_PLACE_DETAILS: PlaceDetailsContextType = {
  openPlaceDetails: () => {},
  closePlaceDetails: () => {},
}

const PlaceDetailsContext = createContext<PlaceDetailsContextType>(DEFAULT_PLACE_DETAILS)

export function usePlaceDetails(): PlaceDetailsContextType {
  return useContext(PlaceDetailsContext)
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    return undefined
  }, [])
  return isDesktop
}

function usePlaceDetail(placeId: string) {
  return useQuery({
    queryKey: ['place-detail', placeId],
    queryFn: () => getPlace(placeId),
    enabled: Boolean(placeId),
    retry: false,
  })
}

export function PlaceDetailsProvider({ children }: { children: ReactNode }) {
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const isDesktop = useIsDesktop()

  const openPlaceDetails = useCallback((id: string) => {
    setPlaceId(id)
    setOpen(true)
  }, [])
  const closePlaceDetails = useCallback(() => {
    setOpen(false)
  }, [])

  const value = useMemo(
    () => ({ openPlaceDetails, closePlaceDetails }),
    [openPlaceDetails, closePlaceDetails],
  )

  return (
    <PlaceDetailsContext.Provider value={value}>
      {children}
      {open && placeId ? (
        isDesktop ? (
          <PlaceDetailsDrawer placeId={placeId} onClose={closePlaceDetails} />
        ) : (
          <PlaceDetailsSheet placeId={placeId} onClose={closePlaceDetails} />
        )
      ) : null}
    </PlaceDetailsContext.Provider>
  )
}

/* ---------------------------------------------------------------------------
 * Overlay + panel surfaces
 * ------------------------------------------------------------------------- */

function PlaceDetailsOverlay({
  children,
  onClose,
  label,
  className,
}: {
  children: ReactNode
  onClose: () => void
  label: string
  className: string
}) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative flex flex-col bg-bg-1 ${className}`}
      >
        {children}
      </section>
    </div>
  )
}

function DetailsCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close place details"
      className="rounded-full border border-border px-2.5 py-1 text-sm text-text-secondary transition-colors hover:border-accent-1/60 hover:text-accent-1"
    >
      ✕
    </button>
  )
}

function PlaceDetailsPanel({ detail }: { detail: PlaceDetail }) {
  const { isSaved, saving, toggleSave } = usePlaceSave(detail.id, detail.is_saved)

  const actions: PlaceAction[] = []
  if (detail.latitude != null && detail.longitude != null) {
    actions.push({
      key: 'directions',
      label: 'Directions',
      href: `https://www.google.com/maps/dir/?api=1&destination=${detail.latitude},${detail.longitude}`,
      external: true,
    })
  }
  if (detail.phone) {
    actions.push({
      key: 'call',
      label: 'Call',
      href: `tel:${String(detail.phone).replace(/[^+\d]/g, '')}`,
    })
  }
  if (detail.website) {
    actions.push({ key: 'website', label: 'Website', href: detail.website, external: true })
  }
  actions.push({
    key: 'save',
    label: isSaved ? 'Saved' : 'Save',
    onClick: toggleSave,
    disabled: saving,
  })

  const openingHours = detail.opening_hours
    ? Object.entries(detail.opening_hours).map(([day, hours]) => ({ day, hours: String(hours) }))
    : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-text-primary">{detail.name}</h3>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-text-tertiary">
              {detail.category}
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
          {detail.rating != null ? <span>★ {detail.rating.toFixed(1)}</span> : null}
          {detail.price_range ? <span>{formatPrice(detail)}</span> : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 p-5">
        {detail.description ? (
          <p className="text-sm leading-relaxed text-text-secondary">{detail.description}</p>
        ) : null}

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Information
          </h4>
          {detail.address ? (
            <p className="text-sm text-text-primary">
              <span className="font-medium text-text-secondary">Address: </span>
              {detail.address}
            </p>
          ) : null}
          {detail.phone ? (
            <p className="text-sm text-text-primary">
              <span className="font-medium text-text-secondary">Phone: </span>
              <a
                href={`tel:${String(detail.phone).replace(/[^+\d]/g, '')}`}
                className="text-accent-1 hover:underline"
              >
                {detail.phone}
              </a>
            </p>
          ) : null}
          {detail.website ? (
            <p className="text-sm text-text-primary">
              <span className="font-medium text-text-secondary">Website: </span>
              <a
                href={detail.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-1 hover:underline"
              >
                {detail.website}
              </a>
            </p>
          ) : null}
        </section>

        {openingHours && openingHours.length > 0 ? (
          <section className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Opening hours
            </h4>
            <ul className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm text-text-secondary">
              {openingHours.map(({ day, hours }) => (
                <li key={day} className="contents">
                  <span className="font-medium text-text-primary">{day}</span>
                  <span>{hours}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {detail.amenities && detail.amenities.length > 0 ? (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Amenities
            </h4>
            <div className="flex flex-wrap gap-2">
              {detail.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-text-tertiary">
          Source: {detail.source} · {detail.verified ? 'Verified' : 'Not verified'}
          {detail.last_updated ? ` · Updated ${detail.last_updated.slice(0, 10)}` : ''}
        </p>
      </div>

      <div className="border-t border-border p-4">
        <PlaceActionsRow actions={actions} />
      </div>
    </div>
  )
}

function PlaceDetailsDrawer({ placeId, onClose }: { placeId: string; onClose: () => void }) {
  const { data, isLoading, isError } = usePlaceDetail(placeId)
  return (
    <PlaceDetailsOverlay onClose={onClose} label="Place details" className="h-full w-full max-w-md">
      <PlaceDetailsBody
        isLoading={isLoading}
        isError={isError}
        detail={data}
        onClose={onClose}
      />
    </PlaceDetailsOverlay>
  )
}

function PlaceDetailsSheet({ placeId, onClose }: { placeId: string; onClose: () => void }) {
  const { data, isLoading, isError } = usePlaceDetail(placeId)
  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Place details"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-bg-1 shadow-2xl"
      >
        <PlaceDetailsBody
          isLoading={isLoading}
          isError={isError}
          detail={data}
          onClose={onClose}
        />
      </section>
    </div>
  )
}

function PlaceDetailsBody({
  isLoading,
  isError,
  detail,
  onClose,
}: {
  isLoading: boolean
  isError: boolean
  detail: PlaceDetail | undefined
  onClose: () => void
}) {
  const header = (
    <div className="flex items-center justify-between border-b border-border p-4">
      <p className="text-sm font-semibold text-text-primary">Place details</p>
      <DetailsCloseButton onClose={onClose} />
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-tertiary">
          Loading details…
        </div>
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-text-tertiary">
          <p>We couldn't load these details right now.</p>
          <p>Please try again in a moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {header}
      <PlaceDetailsPanel detail={detail} />
    </div>
  )
}
