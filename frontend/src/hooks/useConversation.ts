import { useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import type { ChatStatus, Message } from '../types'

/*
 * Binds a conversation route param to ChatContext. When `conversationId` is
 * null (route `/chat`) a fresh chat is started; when a mock id is present it
 * seeds the documented mock conversation history (Phase 8 loads it from
 * GET /api/conversations/{id}/ + messages instead).
 */
export function useConversation(conversationId: string | null): { messages: Message[]; status: ChatStatus } {
  const { messages, status, openConversation, startNewChat } = useChat()

  useEffect(() => {
    if (conversationId) {
      openConversation(conversationId)
    } else {
      startNewChat()
    }
  }, [conversationId, openConversation, startNewChat])

  return { messages, status }
}
