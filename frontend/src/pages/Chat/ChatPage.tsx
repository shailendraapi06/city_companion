import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChatWindow } from '../../components/chat/ChatWindow'
import { useChat } from '../../context/ChatContext'
import { useConversation } from '../../hooks/useConversation'
import { useSendMessage } from '../../hooks/useSendMessage'

/*
 * Handles both /chat (fresh) and /chat/:conversationId. Phase 6D: conversation
 * history comes from mock data seeded into ChatContext. Geolocation capture
 * lives in ChatProvider (requested once per app-shell mount, §6.4) — this page
 * only consumes the captured/overridden location. Sending works against the
 * mock round-trip until Phase 8 wires POST /api/chat/.
 */
export function ChatPage() {
  const { conversationId: paramId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { messages, status } = useConversation(paramId ?? null)
  const { send, isSending } = useSendMessage()
  const { thinkingStage, startNewChat } = useChat()
  const [draft, setDraft] = useState('')

  const handleSend = (text: string) => {
    const id = send(text)
    if (id && id !== paramId) {
      navigate(`/chat/${id}`)
    }
  }

  const handleRetry = () => {
    const lastUserText = [...messages].reverse().find((message) => message.role === 'user')?.content
    if (lastUserText) handleSend(lastUserText)
  }

  const handleStartNewChat = () => {
    startNewChat()
    navigate('/chat')
  }

  const handlePickPrompt = (prompt: string) => {
    setDraft(prompt)
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
        onPickFollowUp={handlePickPrompt}
        error={status === 'error'}
        onRetry={handleRetry}
        onStartNewChat={handleStartNewChat}
      />
    </div>
  )
}
