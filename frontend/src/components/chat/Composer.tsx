import { useRef } from 'react'

interface ComposerProps {
  onSend: (text: string) => void
  draft: string
  onDraftChange: (text: string) => void
  disabled?: boolean
}

/*
 * UI_UX_Brief.md §4.5 — multiline auto-expanding composer. Enter sends,
 * Shift+Enter adds a newline, Send disables while empty or in flight. Voice
 * input and attachment buttons are inert placeholders (🔵 future work).
 */
export function Composer({ onSend, draft, onDraftChange, disabled = false }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = draft.trim().length > 0 && !disabled

  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, 160)
    if (next > 0) el.style.height = `${next}px`
  }

  const handleSubmit = () => {
    if (!canSend) return
    onSend(draft.trim())
    onDraftChange('')
    const el = textareaRef.current
    if (el) el.style.height = 'auto'
  }

  return (
    <div className="border-t border-border bg-bg-1/80 px-3 py-3 sm:px-4">
      <div className="mx-auto flex max-w-3xl items-end gap-1.5 rounded-2xl border border-border-strong bg-bg-2 px-2.5 py-2 focus-within:border-accent-1/50">
        <button
          type="button"
          disabled
          title="Attach file — coming soon"
          aria-label="Attach file (coming soon)"
          className="btn-ghost shrink-0 px-2 disabled:opacity-40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value)
            resize()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSubmit()
            }
          }}
          placeholder="Ask about places, food, or hospitals…"
          aria-label="Message composer"
          className="max-h-40 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />

        <button
          type="button"
          disabled
          title="Voice input — coming soon"
          aria-label="Voice input (coming soon)"
          className="btn-ghost shrink-0 px-2 disabled:opacity-40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M12 7a3 3 0 0 0-3 3v3a3 3 0 0 0 6 0v-3a3 3 0 0 0-3-3Z" />
            <path d="M8 10v3a4 4 0 0 0 8 0v-3" />
            <line x1="12" x2="12" y1="17" y2="21" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-accent-1 to-accent-2 text-[#081018] transition-opacity disabled:opacity-40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-text-tertiary">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  )
}
