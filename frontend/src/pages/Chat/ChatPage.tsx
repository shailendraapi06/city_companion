import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChatWindow } from '../../components/chat/ChatWindow'
import { useChat } from '../../context/ChatContext'
import { useConversation } from '../../hooks/useConversation'
import { useSendMessage } from '../../hooks/useSendMessage'

/*
 * Handles both /chat (fresh) and /chat/:conversationId. Phase 8A: sending a
 * first message calls POST /api/chat/, the backend returns the new
 * conversation_id, and we navigate to /chat/:conversationId. Chips (quick-
 * prompt and follow-up) auto-send through the same real pipeline.
 *
 * Existing-conversation loading is Phase 8B territory — openConversation
 * currently seeds from mock data and will be swapped then.
 */
export function ChatPage() {
  const { conversationId: paramId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { messages, status } = useConversation(paramId ?? null)
  const { send, isSending } = useSendMessage()
  const { thinkingStage, startNewChat } = useChat()
  const [draft, setDraft] = useState('')

  const handleSend = async (text: string) => {
    const id = await send(text)
    if (id && id !== paramId) {
      navigate(`/chat/${id}`, { replace: true })
    }
  }

  const handleRetry = () => {
    const lastUserText = [...messages].reverse().find((message) => message.role === 'user')?.content
    if (lastUserText) void handleSend(lastUserText)
  }

  const handleStartNewChat = () => {
    startNewChat()
    navigate('/chat')
  }

  const handlePickPrompt = (prompt: string) => {
    setDraft(prompt)
  }

  const handleAutoSend = (text: string) => {
    void handleSend(text)
  }

  return (
    <div className="h-[calc(100dvh-4rem)]">
      <ChatWindow
        messages={messages}
        isSending={isSending || status === 'sending'}
        thinkingStage={thinkingStage}
        draft={draft}
        onDraftChange={setDraft}
        onSend={handleSend}
        onPickPrompt={handlePickPrompt}
        onPickFollowUp={handleAutoSend}
        onAutoSend={handleAutoSend}
        error={status === 'error'}
        onRetry={handleRetry}
        onStartNewChat={handleStartNewChat}
      />
    </div>
  )
}
