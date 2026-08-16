import { asString, asStringArray } from '../../lib/blockUtils'
import type { Block } from '../../types'

const actionLabels: Record<string, string> = {
  view_details: 'View details',
  directions: 'Directions',
  call: 'Call',
  website: 'Website',
  save: 'Save',
}

/*
 * PLACEHOLDER — Phase 6C foundation only.
 * Renders a row of primary/secondary action chips parsed from `block.actions`.
 * Interactive behavior (navigation, dialing, persistence) is Phase 7 work.
 */
interface PlaceActionsProps {
  block: Block
}

export function PlaceActions({ block }: PlaceActionsProps) {
  const actions = asStringArray(block.actions)
  if (actions.length === 0) return null

  const label = asString(block.title) || 'Actions'

  return (
    <div className="rounded-xl border border-border bg-bg-2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-1/60 hover:text-accent-1"
          >
            {actionLabels[action] ?? action}
          </button>
        ))}
      </div>
      <p className="mt-2 rounded-md bg-bg-3/60 px-2 py-1 text-xs text-text-tertiary">
        Placeholder actions — wired interactions ship in Phase 7.
      </p>
    </div>
  )
}
