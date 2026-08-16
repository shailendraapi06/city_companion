import { usePlaceSave } from '../../hooks/usePlaceSave'
import { asString, asStringArray } from '../../lib/blockUtils'
import type { Block, PlaceResult } from '../../types'

/*
 * Place action row (UI_UX_Brief §5.4.5 "Action buttons"):
 *
 *   View Details · Directions · Call · Website (if available) · Save
 *
 * Interactions per Frontend_Architecture.md §11.5:
 *  - View Details      → openPlaceDetails() (real GET /api/places/{id}/)
 *  - Directions        → google.com/maps/dir deep link (lat,lng — no map MVP)
 *  - Call              → tel: deep link
 *  - Website           → external link (new tab)
 *  - Save / Saved      → POST/DELETE /api/places/{id}/save/ (optimistic)
 *
 * The block-mode default export also renders backend `action` blocks
 * (payload-driven: directions / call / website / save_place / share_location)
 * and the legacy Phase 6C string-list shape.
 */

export interface PlaceAction {
  key: string
  label: string
  href?: string
  onClick?: () => void
  disabled?: boolean
  external?: boolean
}

export function directionsUrl(place: PlaceResult): string | null {
  if (place.latitude == null || place.longitude == null) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
}

export function callHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

export interface BuildPlaceActionsOptions {
  onViewDetails?: () => void
  isSaved: boolean
  saving?: boolean
  onToggleSave?: () => void
}

export function buildPlaceActions(
  place: PlaceResult,
  options: BuildPlaceActionsOptions,
): PlaceAction[] {
  const actions: PlaceAction[] = []

  if (options.onViewDetails) {
    actions.push({ key: 'view_details', label: 'View Details', onClick: options.onViewDetails })
  }

  const directions = directionsUrl(place)
  if (directions) {
    actions.push({ key: 'directions', label: 'Directions', href: directions, external: true })
  }

  if (place.phone) {
    actions.push({ key: 'call', label: 'Call', href: callHref(place.phone) })
  }

  if (place.website) {
    actions.push({ key: 'website', label: 'Website', href: place.website, external: true })
  }

  if (options.onToggleSave && place.place_id) {
    actions.push({
      key: 'save',
      label: options.isSaved ? 'Saved' : 'Save',
      onClick: options.onToggleSave,
      disabled: options.saving,
    })
  }

  return actions
}

export function PlaceActionsRow({
  actions,
  className,
}: {
  actions: PlaceAction[]
  className?: string
}) {
  if (actions.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {actions.map((action) =>
        action.href ? (
          <a
            key={action.key}
            href={action.href}
            target={action.external ? '_blank' : undefined}
            rel={action.external ? 'noopener noreferrer' : undefined}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-1/60 hover:text-accent-1"
          >
            {action.label}
          </a>
        ) : (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-1/60 hover:text-accent-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action.label}
          </button>
        ),
      )}
    </div>
  )
}

interface PlaceActionsProps {
  block: Block
}

export function PlaceActions({ block }: PlaceActionsProps) {
  const title = asString(block.title) || 'Actions'
  const actionType = asString(block.action_type)
  const payload =
    block.payload && typeof block.payload === 'object'
      ? (block.payload as Record<string, unknown>)
      : null

  const savePlaceId = actionType === 'save_place' && payload ? asString(payload.place_id) : null
  const save = usePlaceSave(savePlaceId)

  const legacyActions = asStringArray(block.actions)

  if (!payload) {
    if (legacyActions.length === 0) return null
    return (
      <div className="rounded-xl border border-border bg-bg-2 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {legacyActions.map((action) => (
            <span
              key={action}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary"
            >
              {action}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const actions: PlaceAction[] = []
  if (actionType === 'directions') {
    const lat = payload.latitude
    const lng = payload.longitude
    if (typeof lat === 'number' && typeof lng === 'number') {
      actions.push({
        key: 'directions',
        label: asString(block.label) || 'Directions',
        href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        external: true,
      })
    } else {
      actions.push({ key: 'directions', label: asString(block.label) || 'Directions' })
    }
  } else if (actionType === 'call' && payload.phone) {
    actions.push({
      key: 'call',
      label: asString(block.label) || 'Call',
      href: callHref(asString(payload.phone)),
    })
  } else if (actionType === 'website' && payload.url) {
    actions.push({
      key: 'website',
      label: asString(block.label) || 'Website',
      href: asString(payload.url),
      external: true,
    })
  } else if (actionType === 'save_place') {
    if (savePlaceId) {
      actions.push({
        key: 'save_place',
        label: save.isSaved ? 'Saved' : asString(block.label) || 'Save',
        onClick: save.toggleSave,
        disabled: save.saving,
      })
    }
  } else {
    actions.push({ key: actionType, label: asString(block.label) || actionType })
  }

  return (
    <div className="rounded-xl border border-border bg-bg-2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{title}</p>
      <PlaceActionsRow actions={actions} className="mt-2" />
      {save.error ? (
        <p className="mt-2 text-xs text-error" role="alert">
          {save.error}
        </p>
      ) : null}
    </div>
  )
}

export default PlaceActions

