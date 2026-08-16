export interface FollowUpSuggestion {
  label: string
  prompt: string
}

/*
 * Default quick-action suggestions (APP_FLOW.md §6 note — Show cheaper /
 * Closer / Compare / More options). In the mock flow these are static; Phase 8
 * may pass per-response suggestions from the assistant payload instead.
 */
export const DEFAULT_FOLLOW_UPS: FollowUpSuggestion[] = [
  { label: 'Show cheaper', prompt: 'Show me cheaper options' },
  { label: 'Closer', prompt: 'Show me options closer to me' },
  { label: 'Compare', prompt: 'Compare the top options side by side' },
  { label: 'More options', prompt: 'Show me more options' },
]

interface FollowUpChipsProps {
  onPick: (prompt: string) => void
  suggestions?: FollowUpSuggestion[]
}

/*
 * UI_UX_Brief.md §4.5 / APP_FLOW.md §6 — quick-action chips after an AI
 * response. Like ChatEmptyState quick prompts, chips PRE-FILL the composer's
 * draft (never auto-send); the message stays submit-ready for when Phase 8
 * wires POST /api/chat/. Subtle hover-only transition, no extra animation.
 */
export function FollowUpChips({ onPick, suggestions = DEFAULT_FOLLOW_UPS }: FollowUpChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {suggestions.map(({ label, prompt }) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(prompt)}
          aria-label={`Follow-up suggestion: ${label}`}
          className="rounded-full border border-border bg-bg-2 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent-1/40 hover:bg-bg-3"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
