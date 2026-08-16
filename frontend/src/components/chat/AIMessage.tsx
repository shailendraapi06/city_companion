import { MarkdownRenderer } from '../renderer/MarkdownRenderer'
import { ResponseRenderer } from '../renderer/ResponseRenderer'
import type { Message } from '../../types'
import { MessageActions } from './MessageActions'

interface AIMessageProps {
  message: Message
}

/*
 * One assistant turn. When the message carries structured `response_data`
 * (Backend_Schema.md §9), the block list is rendered by the 6C ResponseRenderer
 * — the same code path used for live responses. Fallback is sanitized Markdown.
 * Content column is capped to a readable width (UI_UX_Brief.md §5.3).
 */
export function AIMessage({ message }: AIMessageProps) {
  const blocks = message.response_data?.content

  return (
    <div className="group max-w-full">
      {blocks && blocks.length > 0 ? (
        <div className="w-full max-w-3xl">
          <ResponseRenderer blocks={blocks} />
        </div>
      ) : (
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-bg-2 px-4 py-2.5 text-sm leading-relaxed text-text-primary">
          <MarkdownRenderer block={{ type: 'text', content: message.content }} />
        </div>
      )}
      <MessageActions messageId={message.id} content={message.content} />
    </div>
  )
}
