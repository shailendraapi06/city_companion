import type { Message, ThinkingStage } from '../../types'
import { ChatEmptyState } from './ChatEmptyState'
import { ChatErrorBanner } from './ChatErrorBanner'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

interface ChatWindowProps {
  messages: Message[]
  isSending: boolean
  isLoading?: boolean
  thinkingStage?: ThinkingStage | null
  draft: string
  onDraftChange: (text: string) => void
  onSend: (text: string) => void
  onPickPrompt: (prompt: string) => void
  onPickFollowUp?: (prompt: string) => void
  /** Called by chips and quick-prompts to send immediately through the real pipeline. */
  onAutoSend?: (text: string) => void
  /** True when the transport reported a failure (ChatContext status='error'). */
  error?: boolean
  onRetry?: () => void
  onStartNewChat?: () => void
}

/*
 * Orchestrates one conversation's message list + composer (Frontend_Architecture.md §4).
 * A conversation with no messages shows the ChatEmptyState; the composer always
 * stays docked below so quick-prompt and follow-up chips can pre-fill or auto-send.
 * A transport error surfaces the generic ChatErrorBanner instead of an empty or
 * stale view, with Try Again / Start New Chat per §7.
 *
 * Phase 8B: shows a loading skeleton while the conversation history is being
 * fetched from GET /api/conversations/{id}/messages/.
 */
export function ChatWindow({
  messages,
  isSending,
  isLoading = false,
  thinkingStage,
  draft,
  onDraftChange,
  onSend,
  onPickPrompt,
  onPickFollowUp,
  onAutoSend,
  error = false,
  onRetry,
  onStartNewChat,
}: ChatWindowProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && onRetry && onStartNewChat ? (
        <div className="shrink-0 px-4 pt-4 sm:px-6">
          <ChatErrorBanner onRetry={onRetry} onStartNewChat={onStartNewChat} />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-text-tertiary">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-accent-1" />
            <p className="text-sm">Loading conversation…</p>
          </div>
        </div>
      ) : messages.length === 0 && !error ? (
        <ChatEmptyState onPickPrompt={onAutoSend ?? onPickPrompt} />
      ) : messages.length > 0 ? (
        <MessageList
          messages={messages}
          isTyping={isSending}
          thinkingStage={thinkingStage}
          onPickFollowUp={onAutoSend ?? onPickFollowUp}
        />
      ) : null}

      {!isLoading ? (
        <Composer draft={draft} onDraftChange={onDraftChange} onSend={onSend} disabled={isSending} />
      ) : null}
    </div>
  )
}
