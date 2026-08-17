import { useEffect, useRef, useState } from 'react'
import { useUIContext } from '../../context/UIContext'
import type { Message, ThinkingStage } from '../../types'
import { AIMessage } from './AIMessage'
import { FollowUpChips } from './FollowUpChips'
import { ThinkingIndicator, THINKING_STAGES } from './ThinkingIndicator'
import { UserMessage } from './UserMessage'

interface MessageListProps {
  messages: Message[]
  isTyping?: boolean
  thinkingStage?: ThinkingStage | null
  onPickFollowUp?: (prompt: string) => void
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
 * yanking their scroll position. §6.1 thinking state renders the stage-aware
 * ThinkingIndicator; §4.5 follow-up chips appear after the latest AI turn and
 * auto-send through the real pipeline.
 */
export function MessageList({ messages, isTyping = false, thinkingStage = null, onPickFollowUp }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { reduceMotion } = useUIContext()
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)

  const isThinking = isTyping || thinkingStage !== null
  const activeStage = thinkingStage ?? (isTyping ? THINKING_STAGES[0].key : null)
  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'

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
  }, [messages.length, isTyping, thinkingStage, reduceMotion])

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
        {messages.map((message) => (
          <div key={message.id} className="anim-fade-up">
            {message.role === 'user' ? <UserMessage message={message} /> : <AIMessage message={message} />}
          </div>
        ))}
        {isThinking ? (
          <ThinkingIndicator stage={activeStage} />
        ) : lastIsAssistant && onPickFollowUp ? (
          <FollowUpChips onPick={onPickFollowUp} />
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
