import { useState } from 'react'
import { submitFeedback } from '../../lib/api/feedback'
import type { FeedbackReason, FeedbackType } from '../../types'

export const FEEDBACK_REASONS: { value: FeedbackReason; label: string }[] = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'too_far', label: 'Too far' },
  { value: 'not_available', label: 'Not available' },
  { value: 'wrong_information', label: 'Wrong info' },
  { value: 'other', label: 'Other' },
]

interface MessageActionsProps {
  messageId: string
  content: string
  placeId?: string | null
}

/*
 * UI_UX_Brief.md §6.4 — hover-revealed Copy + 👍/👎 feedback footer on AI
 * messages. Copy is fully wired; 👍 posts immediately, 👎 opens an optional
 * reason picker (too expensive / too far / not available / wrong info / other)
 * and the selected reason is sent to the real POST /api/feedback/ endpoint.
 * Regenerate is 🔵 future work. The picker forces the footer visible so it
 * stays usable when it is not on hover (touch / small screens).
 */
export function MessageActions({ messageId, content, placeId }: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [submitted, setSubmitted] = useState<FeedbackType | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content)
      }
    } catch {
      // Clipboard unavailable (permission / non-secure context) — ignore.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const handleFeedback = async (type: FeedbackType, reason: FeedbackReason | null = null) => {
    if (submitted) return
    setSubmitted(type)
    try {
      await submitFeedback({ message_id: messageId, place_id: placeId ?? null, type, reason })
    } catch {
      setSubmitted(null)
    }
  }

  const handleUpClick = () => {
    setReasonOpen(false)
    void handleFeedback('up')
  }

  const handleDownClick = () => {
    if (submitted) return
    setReasonOpen((open) => !open)
  }

  const visible = reasonOpen || submitted !== null

  return (
    <div
      className={`mt-1.5 pl-1 ${visible ? 'lg:opacity-100' : 'lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100'}`}
    >
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => void handleCopy()} className="btn-ghost px-2 py-1 text-xs">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={handleUpClick}
          disabled={submitted !== null}
          aria-label="Helpful"
          aria-pressed={submitted === 'up'}
          className="btn-ghost px-2 py-1 text-xs"
        >
          <span aria-hidden="true">👍</span>
        </button>
        <button
          type="button"
          onClick={handleDownClick}
          disabled={submitted !== null}
          aria-label="Not helpful"
          aria-pressed={submitted === 'down' || reasonOpen}
          aria-expanded={reasonOpen}
          className="btn-ghost px-2 py-1 text-xs"
        >
          <span aria-hidden="true">👎</span>
        </button>
        {submitted !== null ? (
          <span role="status" className="ml-1 text-xs text-text-tertiary">
            Thanks for the feedback
          </span>
        ) : null}
      </div>

      {reasonOpen && submitted === null ? (
        <div
          role="group"
          aria-label="Why was this not helpful?"
          className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg-2 px-2.5 py-2"
        >
          <span className="text-xs text-text-tertiary">Not helpful because:</span>
          {FEEDBACK_REASONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => void handleFeedback('down', value)}
              aria-label={`Not helpful because ${label}`}
              className="btn-ghost px-2 py-1 text-xs"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void handleFeedback('down', null)}
            aria-label="Submit not helpful without a reason"
            className="btn-ghost px-2 py-1 text-xs"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => setReasonOpen(false)}
            aria-label="Cancel feedback"
            className="btn-ghost px-2 py-1 text-xs"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  )
}
