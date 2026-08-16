import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChatWindow } from '../../components/chat/ChatWindow'
import { useChat } from '../../context/ChatContext'
import { useConversation } from '../../hooks/useConversation'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useSendMessage } from '../../hooks/useSendMessage'

/*
 * Handles both /chat (fresh) and /chat/:conversationId. Phase 6D: conversation
 * history comes from mock data seeded into ChatContext; geolocation is captured
 * once and surfaced to the shell (Frontend_Architecture.md §6.4). Sending works
 * against the mock round-trip until Phase 8 wires POST /api/chat/.
 */
export function ChatPage() {
  const { conversationId: paramId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { messages, status } = useConversation(paramId ?? null)
  const { send, isSending } = useSendMessage()
  const { setLocation, thinkingStage } = useChat()
  const { location } = useGeolocation()
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (location) setLocation(location)
  }, [location, setLocation])

  const handleSend = (text: string) => {
    const id = send(text)
    if (id && id !== paramId) {
      navigate(`/chat/${id}`)
    }
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
      />
    </div>
  )
}
