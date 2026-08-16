import type { Conversation, ConversationMessagesData, Paginated } from '../../types'
import { apiRequest } from './client'

export interface ConversationListParams {
  page?: number
  page_size?: number
}

export function listConversations(params: ConversationListParams = {}): Promise<Paginated<Conversation>> {
  const query = new URLSearchParams()
  if (params.page != null) query.set('page', String(params.page))
  if (params.page_size != null) query.set('page_size', String(params.page_size))
  const qs = query.toString()
  return apiRequest<Paginated<Conversation>>(`/api/conversations/${qs ? `?${qs}` : ''}`)
}

export function createConversation(city?: string | null): Promise<Conversation> {
  return apiRequest<Conversation>('/api/conversations/', {
    method: 'POST',
    body: JSON.stringify({ city: city ?? null }),
  })
}

export function getConversation(id: string): Promise<Conversation> {
  return apiRequest<Conversation>(`/api/conversations/${id}/`)
}

export function getConversationMessages(id: string): Promise<ConversationMessagesData> {
  return apiRequest<ConversationMessagesData>(`/api/conversations/${id}/messages/`)
}
