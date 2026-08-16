import { useChat } from '../context/ChatContext'

/*
 * Sends a message for the active conversation. Phase 6D simulates the round
 * trip in ChatContext; Phase 8 swaps the transport for POST /api/chat/ without
 * changing this hook's contract: `send` returns the conversation id to adopt.
 */
export function useSendMessage(): { send: (text: string) => string; isSending: boolean } {
  const { sendMessage, status } = useChat()
  return { send: sendMessage, isSending: status === 'sending' }
}
