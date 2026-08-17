import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import { sendMessage as chatApiSendMessage } from '../lib/api/chat'
import { getConversationMessages } from '../lib/api/conversations'
import type { ApiError } from '../lib/api/client'
import type { ChatLocation, ChatStatus, Message, ThinkingStage } from '../types'

/*
 * Chat/session state per Frontend_Architecture.md §5.2.
 *
 * Phase 8A: `sendMessage` calls the real POST /api/chat/ endpoint.
 * Phase 8B: `openConversation` fetches real message history via
 * GET /api/conversations/{id}/messages/ and hydrates the message list.
 * Stored `response_data` on each assistant message renders through the
 * same ResponseRenderer pipeline used for live responses (§11.4).
 */

interface ChatState {
  conversationId: string | null
  messages: Message[]
  status: ChatStatus
  thinkingStage: ThinkingStage | null
  location: ChatLocation | null
  locationOverride: string | null
  locationError: string | null
  locationSupported: boolean
  loadingConversation: boolean
  conversationNotFound: boolean
}

type ChatAction =
  | { type: 'SELECT_CONVERSATION'; conversationId: string; messages: Message[] }
  | { type: 'SET_CONVERSATION_ID'; conversationId: string }
  | { type: 'RESET' }
  | { type: 'LOAD_CONVERSATION_START'; conversationId: string }
  | { type: 'LOAD_CONVERSATION'; conversationId: string; messages: Message[] }
  | { type: 'CONVERSATION_NOT_FOUND' }
  | { type: 'APPEND_USER_MESSAGE'; message: Message }
  | { type: 'APPEND_ASSISTANT_MESSAGE'; message: Message }
  | { type: 'SET_STATUS'; status: ChatStatus }
  | { type: 'SET_THINKING_STAGE'; stage: ThinkingStage | null }
  | { type: 'SET_LOCATION'; location: ChatLocation | null }
  | { type: 'SET_LOCATION_OVERRIDE'; override: string | null }
  | { type: 'SET_LOCATION_ERROR'; error: string | null }
  | { type: 'SET_LOCATION_SUPPORTED'; supported: boolean }

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SELECT_CONVERSATION':
      return { ...state, conversationId: action.conversationId, messages: action.messages, status: 'idle', thinkingStage: null }
    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.conversationId }
    case 'RESET':
      return { ...state, conversationId: null, messages: [], status: 'idle', thinkingStage: null, loadingConversation: false, conversationNotFound: false }
    case 'LOAD_CONVERSATION_START':
      return { ...state, conversationId: action.conversationId, messages: [], status: 'idle', thinkingStage: null, loadingConversation: true, conversationNotFound: false }
    case 'LOAD_CONVERSATION':
      return { ...state, conversationId: action.conversationId, messages: action.messages, status: 'idle', thinkingStage: null, loadingConversation: false }
    case 'CONVERSATION_NOT_FOUND':
      return { ...state, loadingConversation: false, conversationNotFound: true }
    case 'APPEND_USER_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }
    case 'APPEND_ASSISTANT_MESSAGE':
      return { ...state, messages: [...state.messages, action.message], status: 'idle', thinkingStage: null }
    case 'SET_STATUS':
      return { ...state, status: action.status }
    case 'SET_THINKING_STAGE':
      return { ...state, thinkingStage: action.stage }
    case 'SET_LOCATION':
      return { ...state, location: action.location, locationError: null }
    case 'SET_LOCATION_OVERRIDE':
      return { ...state, locationOverride: action.override }
    case 'SET_LOCATION_ERROR':
      return { ...state, locationError: action.error }
    case 'SET_LOCATION_SUPPORTED':
      return { ...state, locationSupported: action.supported }
    default:
      return state
  }
}

const INITIAL_STATE: ChatState = {
  conversationId: null,
  messages: [],
  status: 'idle',
  thinkingStage: null,
  location: null,
  locationOverride: null,
  locationError: null,
  locationSupported: false,
  loadingConversation: false,
  conversationNotFound: false,
}

interface ChatContextType extends ChatState {
  openConversation: (id: string) => void
  startNewChat: () => void
  sendMessage: (text: string) => Promise<string>
  setLocation: (location: ChatLocation | null) => void
  setLocationOverride: (override: string | null) => void
  requestLocation: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE)
  const inFlightRef = useRef<AbortController | null>(null)
  const loadIdRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      inFlightRef.current?.abort()
    }
  }, [])

  /*
   * Phase 8B — real conversation loading (Frontend_Architecture.md §11.4).
   *
   * Fetches GET /api/conversations/{id}/messages/ to hydrate the message list.
   * A `loadIdRef` tracks the most recently requested conversation so stale
   * responses from an earlier navigation don't overwrite a newer one.
   *
   * Errors:
   *   - 404 / 403 → CONVERSATION_NOT_FOUND (graceful redirect in ChatPage)
   *   - Network / 5xx → CONVERSATION_NOT_FOUND (same graceful treatment)
   */
  const openConversation = useCallback((id: string) => {
    loadIdRef.current = id
    dispatch({ type: 'LOAD_CONVERSATION_START', conversationId: id })

    void (async () => {
      try {
        const data = await getConversationMessages(id)

        if (loadIdRef.current !== id) return

        const messages: Message[] = (data.results ?? []).map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          response_data: msg.response_data ?? null,
          created_at: msg.created_at,
        }))

        dispatch({ type: 'LOAD_CONVERSATION', conversationId: id, messages })
      } catch (err) {
        if (loadIdRef.current !== id) return

        const apiErr = err as ApiError
        if (apiErr.status === 404 || apiErr.status === 403) {
          dispatch({ type: 'CONVERSATION_NOT_FOUND' })
        } else {
          dispatch({ type: 'CONVERSATION_NOT_FOUND' })
        }
      }
    })()
  }, [])

  const startNewChat = useCallback(() => {
    inFlightRef.current?.abort()
    inFlightRef.current = null
    loadIdRef.current = null
    dispatch({ type: 'RESET' })
  }, [])

  const setLocation = useCallback((location: ChatLocation | null) => {
    dispatch({ type: 'SET_LOCATION', location })
  }, [])

  const setLocationOverride = useCallback((override: string | null) => {
    dispatch({ type: 'SET_LOCATION_OVERRIDE', override })
  }, [])

  /*
   * Geolocation capture (UI_UX_Brief.md §8 / APP_FLOW.md §9 / Frontend_Architecture.md
   * §6.4). The permission prompt is only ever requested once per app-shell mount;
   * denial or lack of support resolves to a non-fatal state so the shell keeps
   * working without location. The captured lat/lng is sent with POST /api/chat/.
   */
  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      dispatch({ type: 'SET_LOCATION_SUPPORTED', supported: false })
      return
    }
    dispatch({ type: 'SET_LOCATION_SUPPORTED', supported: true })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        dispatch({
          type: 'SET_LOCATION',
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
        })
      },
      (err) => {
        dispatch({ type: 'SET_LOCATION_ERROR', error: err.message })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  /*
   * Phase 8A — real POST /api/chat/ (Frontend_Architecture.md §11.3).
   *
   * 1. Append the user message immediately (optimistic UI).
   * 2. Transition to 'sending' with a single "understanding" stage driven by the
   *    real pending request — no fabricated intermediate stages.
   * 3. On success: adopt the backend's conversation_id (implicit creation) and
   *    append the assistant message. The ResponseRenderer pipeline in AIMessage
   *    renders the real content[] blocks.
   * 4. On error: transition to 'error' so ChatErrorBanner surfaces.
   * 5. On unmount / new send: abort the in-flight request.
   */
  const sendMessage = useCallback(
    async (text: string): Promise<string> => {
      const trimmed = text.trim()
      if (!trimmed) return state.conversationId ?? ''

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        response_data: null,
        created_at: new Date().toISOString(),
      }
      dispatch({ type: 'APPEND_USER_MESSAGE', message: userMessage })
      dispatch({ type: 'SET_STATUS', status: 'sending' })
      dispatch({ type: 'SET_THINKING_STAGE', stage: 'understanding' })

      inFlightRef.current?.abort()
      const controller = new AbortController()
      inFlightRef.current = controller

      try {
        const response = await chatApiSendMessage({
          conversation_id: state.conversationId,
          message: trimmed,
          location: state.location,
        })

        if (controller.signal.aborted) return state.conversationId ?? ''

        if (!state.conversationId) {
          dispatch({ type: 'SET_CONVERSATION_ID', conversationId: response.conversation_id })
        }

        const assistantMessage: Message = {
          id: response.message.id,
          role: 'assistant',
          content: '',
          response_data: { message: response.message, content: response.content },
          created_at: new Date().toISOString(),
        }
        dispatch({ type: 'APPEND_ASSISTANT_MESSAGE', message: assistantMessage })

        return response.conversation_id
      } catch (err) {
        if (controller.signal.aborted) return state.conversationId ?? ''

        const apiErr = err as ApiError
        dispatch({ type: 'SET_STATUS', status: 'error' })
        dispatch({ type: 'SET_THINKING_STAGE', stage: null })

        console.error('Chat send failed:', apiErr.code ?? apiErr.message)
        return state.conversationId ?? ''
      } finally {
        if (inFlightRef.current === controller) {
          inFlightRef.current = null
        }
      }
    },
    [state.conversationId, state.location]
  )

  const value = useMemo<ChatContextType>(
    () => ({
      ...state,
      openConversation,
      startNewChat,
      sendMessage,
      setLocation,
      setLocationOverride,
      requestLocation,
    }),
    [state, openConversation, startNewChat, sendMessage, setLocation, setLocationOverride, requestLocation]
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
