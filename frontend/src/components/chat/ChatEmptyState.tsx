interface QuickPrompt {
  emoji: string
  label: string
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { emoji: '🏠', label: 'Find a place to stay' },
  { emoji: '🍽', label: 'Find affordable food' },
  { emoji: '🏥', label: 'Find a nearby hospital' },
]

interface ChatEmptyStateProps {
  onPickPrompt: (prompt: string) => void
}

/*
 * UI_UX_Brief.md §4.4 — "What can I help you find?" centerpiece plus
 * quick-prompt chips. Chips PRE-FILL the composer; they never force a
 * selection and free typing always stays available.
 */
export function ChatEmptyState({ onPickPrompt }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-1/20 bg-accent-1/10 text-xl">
        <span aria-hidden="true">💬</span>
      </div>
      <h1 className="text-2xl font-bold text-text-primary">What can I help you find?</h1>
      <p className="max-w-md text-sm leading-relaxed text-text-secondary">
        Ask about places to stay, affordable food, hospitals and more in your city. Answers arrive
        as rich cards, tables and alerts — not walls of text.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            type="button"
            onClick={() => onPickPrompt(prompt.label)}
            className="rounded-full border border-border bg-bg-2 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent-1/40 hover:bg-bg-3"
          >
            <span aria-hidden="true">{prompt.emoji}</span> {prompt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
