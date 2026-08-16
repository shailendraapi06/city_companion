import { useState } from 'react'
import { submitFeedback } from '../../lib/api/feedback'
import type { FeedbackType } from '../../types'

interface MessageActionsProps {
  messageId: string
  content: string
  placeId?: string | null
}

/*
 * UI_UX_Brief.md §6.4 — hover-revealed Copy + 👍/👎 feedback footer on AI
 * messages. Copy is fully wired; 👍/👎 posts to the real POST /api/feedback/
 * endpoint. Regenerate is 🔵 future work.
 */
export function MessageActions({ messageId, content, placeId }: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [submitted, setSubmitted] = useState<FeedbackType | null>(null)

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

  const handleFeedback = async (type: FeedbackType) => {
    if (submitted) return
    setSubmitted(type)
    try {
      await submitFeedback({ message_id: messageId, place_id: placeId ?? null, type })
    } catch {
      setSubmitted(null)
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-1 pl-1 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
      <button type="button" onClick={() => void handleCopy()} className="btn-ghost px-2 py-1 text-xs">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button
        type="button"
        onClick={() => void handleFeedback('up')}
        disabled={submitted !== null}
        aria-label="Helpful"
        aria-pressed={submitted === 'up'}
        className="btn-ghost px-2 py-1 text-xs"
      >
        <span aria-hidden="true">👍</span>
      </button>
      <button
        type="button"
        onClick={() => void handleFeedback('down')}
        disabled={submitted !== null}
        aria-label="Not helpful"
        aria-pressed={submitted === 'down'}
        className="btn-ghost px-2 py-1 text-xs"
      >
        <span aria-hidden="true">👎</span>
      </button>
    </div>
  )
}
