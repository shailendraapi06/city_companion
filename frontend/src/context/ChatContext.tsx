import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import { mockMessagesByConversation } from '../data/mockChat'
import { visualHierarchyPayload, markdownFeaturesPayload, everyBlockTypePayload } from '../test/mocks/aiResponses'
import type { Block, ChatLocation, ChatStatus, Message } from '../types'

/*
 * Chat/session state per Frontend_Architecture.md §5.2:
 * {
 *   conversationId: string | null,
 *   messages: Message[],   // includes response_data blocks for assistant messages
 *   status: 'idle' | 'sending' | 'streaming' | 'error',   // streaming = V2-ready, unused until V2
 *   location: { lat, lng } | null,
 *   locationOverride: string | null,
 * }
 *
 * Phase 6D: the shell runs against mock conversation data. `openConversation`
 * seeds from mockChat.ts; `sendMessage` simulates the /api/chat/ round-trip
 * (Phase 8 swaps this for the real POST). The append path — user message in,
 * assistant message with content[] blocks out — is the exact code path the
 * real client will reuse, so only the transport changes in Phase 8.
 */

const MOCK_REPLY_DELAY_MS = 500

const MOCK_REPLY_BLOCKS: Block[][] = [visualHierarchyPayload, markdownFeaturesPayload, everyBlockTypePayload]

interface ChatState {
  conversationId: string | null
  messages: Message[]
  status: ChatStatus
  location: ChatLocation | null
  locationOverride: string | null
}

type ChatAction =
  | { type: 'SELECT_CONVERSATION'; conversationId: string; messages: Message[] }
  | { type: 'SET_CONVERSATION_ID'; conversationId: string }
  | { type: 'RESET' }
  | { type: 'APPEND_USER_MESSAGE'; message: Message }
  | { type: 'APPEND_ASSISTANT_MESSAGE'; message: Message }
  | { type: 'SET_STATUS'; status: ChatStatus }
  | { type: 'SET_LOCATION'; location: ChatLocation | null }
  | { type: 'SET_LOCATION_OVERRIDE'; override: string | null }

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SELECT_CONVERSATION':
      return { ...state, conversationId: action.conversationId, messages: action.messages, status: 'idle' }
    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.conversationId }
    case 'RESET':
      return { ...state, conversationId: null, messages: [], status: 'idle' }
    case 'APPEND_USER_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }
    case 'APPEND_ASSISTANT_MESSAGE':
      return { ...state, messages: [...state.messages, action.message], status: 'idle' }
    case 'SET_STATUS':
      return { ...state, status: action.status }
    case 'SET_LOCATION':
      return { ...state, location: action.location }
    case 'SET_LOCATION_OVERRIDE':
      return { ...state, locationOverride: action.override }
    default:
      return state
  }
}

const INITIAL_STATE: ChatState = {
  conversationId: null,
  messages: [],
  status: 'idle',
  location: null,
  locationOverride: null,
}

interface ChatContextType extends ChatState {
  openConversation: (id: string) => void
  startNewChat: () => void
  sendMessage: (text: string) => string
  setLocation: (location: ChatLocation | null) => void
  setLocationOverride: (override: string | null) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

function buildMockReply(userText: string, conversationId: string): Message {
  const blocks = MOCK_REPLY_BLOCKS[conversationId.length % MOCK_REPLY_BLOCKS.length]
  return {
    id: `mock-msg-${Date.now()}`,
    role: 'assistant',
    content: `Here is what I found for "${userText}".`,
    response_data: { message: { role: 'assistant' }, content: blocks },
    created_at: new Date().toISOString(),
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const openConversation = useCallback((id: string) => {
    if (mockMessagesByConversation[id]) {
      dispatch({ type: 'SELECT_CONVERSATION', conversationId: id, messages: mockMessagesByConversation[id] })
    } else {
      dispatch({ type: 'SET_CONVERSATION_ID', conversationId: id })
    }
  }, [])

  const startNewChat = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const setLocation = useCallback((location: ChatLocation | null) => {
    dispatch({ type: 'SET_LOCATION', location })
  }, [])

  const setLocationOverride = useCallback((override: string | null) => {
    dispatch({ type: 'SET_LOCATION_OVERRIDE', override })
  }, [])

  const sendMessage = useCallback(
    (text: string): string => {
      const trimmed = text.trim()
      if (!trimmed) return state.conversationId ?? ''

      const userMessage: Message = {
        id: `mock-msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        response_data: null,
        created_at: new Date().toISOString(),
      }
      dispatch({ type: 'APPEND_USER_MESSAGE', message: userMessage })
      dispatch({ type: 'SET_STATUS', status: 'sending' })

      const conversationId = state.conversationId ?? `mock-conv-${Date.now()}`
      if (!state.conversationId) {
        dispatch({ type: 'SET_CONVERSATION_ID', conversationId })
      }

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'APPEND_ASSISTANT_MESSAGE', message: buildMockReply(trimmed, conversationId) })
      }, MOCK_REPLY_DELAY_MS)

      return conversationId
    },
    [state.conversationId]
  )

  const value = useMemo<ChatContextType>(
    () => ({
      ...state,
      openConversation,
      startNewChat,
      sendMessage,
      setLocation,
      setLocationOverride,
    }),
    [state, openConversation, startNewChat, sendMessage, setLocation, setLocationOverride]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
