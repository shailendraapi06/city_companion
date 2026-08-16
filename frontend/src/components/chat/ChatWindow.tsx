import type { Message } from '../../types'
import { ChatEmptyState } from './ChatEmptyState'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

interface ChatWindowProps {
  messages: Message[]
  isSending: boolean
  draft: string
  onDraftChange: (text: string) => void
  onSend: (text: string) => void
  onPickPrompt: (prompt: string) => void
}

/*
 * Orchestrates one conversation's message list + composer (Frontend_Architecture.md §4).
 * A conversation with no messages shows the ChatEmptyState; the composer always
 * stays docked below so quick-prompt chips can pre-fill it.
 */
export function ChatWindow({
  messages,
  isSending,
  draft,
  onDraftChange,
  onSend,
  onPickPrompt,
}: ChatWindowProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length === 0 ? (
        <ChatEmptyState onPickPrompt={onPickPrompt} />
      ) : (
        <MessageList messages={messages} isTyping={isSending} />
      )}
      <Composer draft={draft} onDraftChange={onDraftChange} onSend={onSend} disabled={isSending} />
    </div>
  )
}
