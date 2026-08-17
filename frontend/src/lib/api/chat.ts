import { apiRequest } from './client'
import type { Block, ChatLocation } from '../../types'

/*
 * POST /api/chat/ — the central product endpoint (API_Specification.md §5.1).
 * The backend IMPLICITLY creates a conversation when conversation_id is null
 * and returns the new id (services/chat/service.py §3.2 [TBD] resolution).
 * Streaming is 🔵 Version 2; MVP uses a single blocking JSON response.
 */

export interface ChatRequest {
  conversation_id: string | null
  message: string
  location?: ChatLocation | null
}

export interface ChatResponse {
  conversation_id: string
  message: { id: string; role: 'assistant' }
  content: Block[]
}

export function sendMessage(payload: ChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/api/chat/', {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: payload.conversation_id,
      message: payload.message,
      ...(payload.location ? { location: payload.location } : {}),
    }),
  })
}
