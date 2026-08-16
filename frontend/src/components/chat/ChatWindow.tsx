import type { Message, ThinkingStage } from '../../types'
import { ChatEmptyState } from './ChatEmptyState'
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
}

/*
 * Orchestrates one conversation's message list + composer (Frontend_Architecture.md §4).
 * A conversation with no messages shows the ChatEmptyState; the composer always
 * stays docked below so quick-prompt and follow-up chips can pre-fill it.
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
}: ChatWindowProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length === 0 ? (
        <ChatEmptyState onPickPrompt={onPickPrompt} />
      ) : (
        <MessageList
          messages={messages}
          isTyping={isSending}
          thinkingStage={thinkingStage}
          onPickFollowUp={onPickFollowUp}
        />
      )}
      <Composer draft={draft} onDraftChange={onDraftChange} onSend={onSend} disabled={isSending} />
    </div>
  )
}
