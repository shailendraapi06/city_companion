import { useChat } from '../context/ChatContext'

/*
 * Sends a message for the active conversation via POST /api/chat/ (Phase 8A).
 * `send` returns a promise that resolves to the conversation id to adopt
 * (the backend's id, whether pre-existing or newly created).
 */
export function useSendMessage(): { send: (text: string) => Promise<string>; isSending: boolean } {
  const { sendMessage, status } = useChat()
  return { send: sendMessage, isSending: status === 'sending' }
}
