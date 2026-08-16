import { useEffect, useRef, useState } from 'react'
import { useUIContext } from '../../context/UIContext'
import type { Message } from '../../types'
import { AIMessage } from './AIMessage'
import { UserMessage } from './UserMessage'

interface MessageListProps {
  messages: Message[]
  isTyping?: boolean
}

function isAtBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 48
}

function scrollToBottom(el: HTMLElement, smooth: boolean): void {
  if (!smooth) {
    el.scrollTop = el.scrollHeight
    return
  }
  try {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  } catch {
    el.scrollTop = el.scrollHeight
  }
}

/*
 * UI_UX_Brief.md §6.3 — auto-scroll only when the user is already at the bottom
 * of the chat; otherwise surface a "↓ New response" affordance instead of
 * yanking their scroll position. Phase 6D scaffold works against the mock list.
 */
export function MessageList({ messages, isTyping = false }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { reduceMotion } = useUIContext()
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || messages.length === 0) {
      setShowJumpToLatest(false)
      return
    }
    if (isAtBottom(el)) {
      scrollToBottom(el, !reduceMotion)
      setShowJumpToLatest(false)
    } else {
      setShowJumpToLatest(true)
    }
  }, [messages.length, isTyping, reduceMotion])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    setShowJumpToLatest(messages.length > 0 && !isAtBottom(el))
  }

  const jumpToLatest = () => {
    const el = containerRef.current
    if (!el) return
    scrollToBottom(el, !reduceMotion)
    setShowJumpToLatest(false)
  }

  return (
    <div ref={containerRef} data-testid="message-list" onScroll={handleScroll} className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {messages.map((message) =>
          message.role === 'user' ? (
            <UserMessage key={message.id} message={message} />
          ) : (
            <AIMessage key={message.id} message={message} />
          )
        )}
        {isTyping ? (
          <div className="flex items-center gap-2 text-sm text-text-tertiary" role="status" aria-live="polite">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-1" />
            Thinking…
          </div>
        ) : null}
      </div>

      {showJumpToLatest ? (
        <button
          type="button"
          onClick={jumpToLatest}
          aria-label="New response — jump to latest"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border-strong bg-bg-2 px-4 py-1.5 text-xs font-medium text-text-primary shadow-xl transition-colors hover:border-accent-1/40"
        >
          ↓ New response
        </button>
      ) : null}
    </div>
  )
}
