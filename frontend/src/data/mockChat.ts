import { everyBlockTypePayload, markdownFeaturesPayload, visualHierarchyPayload } from '../test/mocks/aiResponses'
import type { BlockResponse, Conversation, Message, PlaceResult } from '../types'

/*
 * Phase 6D mock data — drives the chat shell until Phase 8 wires the real
 * /api/chat/ + GET /api/conversations/ flows. Timestamps are relative so the
 * Today / Yesterday / Older sidebar grouping stays meaningful at any time.
 */

const HOUR = 60 * 60 * 1000
const now = Date.now()

function iso(hoursAgo: number): string {
  return new Date(now - hoursAgo * HOUR).toISOString()
}

export const mockConversations: Conversation[] = [
  {
    id: 'mock-conv-1',
    title: 'PG near Kanpur college',
    city: 'Kanpur',
    created_at: iso(26),
    updated_at: iso(1),
  },
  {
    id: 'mock-conv-2',
    title: 'Budget hotel near railway station',
    city: 'Kanpur',
    created_at: iso(27),
    updated_at: iso(3),
  },
  {
    id: 'mock-conv-3',
    title: 'Affordable food near Mall Road',
    city: 'Kanpur',
    created_at: iso(50),
    updated_at: iso(26),
  },
  {
    id: 'mock-conv-4',
    title: 'Hospital open at night',
    city: 'Kanpur',
    created_at: iso(52),
    updated_at: iso(27),
  },
  {
    id: 'mock-conv-5',
    title: 'Hostel vs PG comparison',
    city: 'Kanpur',
    created_at: iso(200),
    updated_at: iso(72),
  },
]

const mockPlace: PlaceResult = {
  name: 'Cozy PGs Indiranagar',
  category: 'PG',
  place_id: 'plc_003',
  price_range: { amount: 650, unit: 'night' },
  source: 'mock',
  verified: false,
  last_updated: '2026-01-01T00:00:00Z',
  rating: 3.9,
  distance_km: 5.8,
  match_score: 76,
}

function asAssistant(content: BlockResponse['content'], id: string, hoursAgo: number, text: string): Message {
  return {
    id,
    role: 'assistant',
    content: text,
    response_data: { message: { role: 'assistant' }, content },
    created_at: iso(hoursAgo),
  }
}

function asUser(content: string, id: string, hoursAgo: number): Message {
  return { id, role: 'user', content, response_data: null, created_at: iso(hoursAgo) }
}

export const mockMessagesByConversation: Record<string, Message[]> = {
  'mock-conv-1': [
    asUser('Find a PG near Kanpur college for under ₹10,000 a month', 'mock-msg-1', 2),
    asAssistant(
      [
        {
          type: 'heading',
          level: 2,
          content: 'Best PGs near Kanpur college',
        },
        {
          type: 'text',
          content: 'Here are the closest options within your **₹10,000/month** budget.',
        },
        {
          type: 'list',
          items: ['Cozy PGs Indiranagar — ₹650/night, 5.8 km', 'Green Nest PG — ₹8,500/month, 1.2 km'],
        },
        {
          type: 'place',
          place: mockPlace,
        },
        {
          type: 'alert',
          level: 'info',
          title: 'Tip',
          content: 'Call ahead — PGs near colleges fill fast before term starts.',
        },
      ],
      'mock-msg-2',
      1,
      'Here are the best PGs near Kanpur college within your budget.'
    ),
  ],
  'mock-conv-2': [
    asUser('Show me a budget hotel near the railway station', 'mock-msg-3', 4),
    asAssistant(markdownFeaturesPayload, 'mock-msg-4', 3, 'Budget hotels near the railway station, with details.'),
  ],
  'mock-conv-3': [
    asUser('Where can I get affordable food near Mall Road?', 'mock-msg-5', 27),
    asAssistant(visualHierarchyPayload, 'mock-msg-6', 26, 'Affordable food options near Mall Road.'),
  ],
  'mock-conv-4': [
    asUser('Which hospital is open 24 hours nearby?', 'mock-msg-7', 28),
    asAssistant(
      [
        {
          type: 'text',
          content: 'These hospitals are confirmed **open 24×7** near you.',
        },
        {
          type: 'place',
          place: {
            name: 'Kailash Hospital',
            category: 'Hospital',
            place_id: 'plc_004',
            price_range: null,
            source: 'mock',
            verified: true,
            last_updated: '2026-01-01T00:00:00Z',
            rating: 4.1,
            distance_km: 2.4,
          },
        },
        {
          type: 'alert',
          level: 'warning',
          title: 'Emergency',
          content: 'For a medical emergency, call local emergency services immediately.',
        },
      ],
      'mock-msg-8',
      27,
      'Hospitals open at night near you.'
    ),
  ],
  'mock-conv-5': [
    asUser('Compare hostels and PGs for a 3-month stay', 'mock-msg-9', 74),
    asAssistant(everyBlockTypePayload, 'mock-msg-10', 72, 'Hostel vs PG comparison for a 3-month stay.'),
  ],
}
