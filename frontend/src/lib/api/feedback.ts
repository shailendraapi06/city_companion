import type { FeedbackPayload, FeedbackResult } from '../../types'
import { apiRequest } from './client'

export function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
  return apiRequest<FeedbackResult>('/api/feedback/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
