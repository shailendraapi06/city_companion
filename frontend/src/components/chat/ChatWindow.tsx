import type { Message, ThinkingStage } from '../../types'
import { ChatEmptyState } from './ChatEmptyState'
import { ChatErrorBanner } from './ChatErrorBanner'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

interface ChatWindowProps {
  messages: Message[]
  isSending: boolean
  thinkingStage?: ThinkingStage | null
  draft: string
  onDraftChange: (text: string) => void
  onSend: (text: string) => void
  onPickPrompt: (prompt: string) => void
  onPickFollowUp?: (prompt: string) => void
  /** True when the transport reported a failure (ChatContext status='error'). */
  error?: boolean
  onRetry?: () => void
  onStartNewChat?: () => void
}

/*
 * Orchestrates one conversation's message list + composer (Frontend_Architecture.md §4).
 * A conversation with no messages shows the ChatEmptyState; the composer always
 * stays docked below so quick-prompt and follow-up chips can pre-fill it. A
 * transport error surfaces the generic ChatErrorBanner instead of an empty or
 * stale view, with Try Again / Start New Chat per §7.
 */
export function ChatWindow({
  messages,
  isSending,
  thinkingStage,
  draft,
  onDraftChange,
  onSend,
  onPickPrompt,
  onPickFollowUp,
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

      {messages.length === 0 && !error ? (
        <ChatEmptyState onPickPrompt={onPickPrompt} />
      ) : null}

      {messages.length > 0 ? (
        <MessageList
          messages={messages}
          isTyping={isSending}
          thinkingStage={thinkingStage}
          onPickFollowUp={onPickFollowUp}
        />
      ) : null}

      <Composer draft={draft} onDraftChange={onDraftChange} onSend={onSend} disabled={isSending} />
    </div>
  )
}
