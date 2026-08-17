import { useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import type { ChatStatus, Message } from '../types'

/*
 * Binds a conversation route param to ChatContext. When `conversationId` is
 * null (route `/chat`) a fresh chat is started; when an id is present it
 * triggers a real GET /api/conversations/{id}/messages/ fetch (Phase 8B,
 * Frontend_Architecture.md §11.4). Race conditions from rapid navigation
 * are handled inside ChatContext.openConversation via a loadIdRef.
 */
export function useConversation(conversationId: string | null): {
  messages: Message[]
  status: ChatStatus
  loadingConversation: boolean
  conversationNotFound: boolean
} {
  const { messages, status, loadingConversation, conversationNotFound, openConversation, startNewChat } = useChat()

  useEffect(() => {
    if (conversationId) {
      openConversation(conversationId)
    } else {
      startNewChat()
    }
  }, [conversationId, openConversation, startNewChat])

  return { messages, status, loadingConversation, conversationNotFound }
}
