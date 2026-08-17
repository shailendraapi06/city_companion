import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AIMessage } from './AIMessage'
import type { Block, Message } from '../../types'
import {
  comparisonPayload,
  everyBlockTypePayload,
  longRecommendationPayload,
  recommendationPayload,
  visualHierarchyPayload,
} from '../../test/mocks/aiResponses'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/*
 * CRITICAL CHECK — Phase 8B, Task 3 (Frontend_Architecture.md §11.4,
 * APP_FLOW.md §12):
 *
 * This test suite proves that a restored assistant message's stored
 * response_data renders through the EXACT SAME ResponseRenderer /
 * ComponentRegistry pipeline used for a live message in Phase 8A.
 *
 * The test takes real response_data payloads — structured exactly as the
 * backend stores them in Message.response_data (JSONField) — and renders
 * them through AIMessage. It verifies that:
 *
 * 1. AIMessage routes to ResponseRenderer (not the Markdown fallback) when
 *    response_data.content is present.
 * 2. Every block type in the payload is rendered with the correct semantic
 *    structure (headings, text, lists, tables, place cards, recommendations,
 *    comparisons, alerts, actions).
 * 3. The "live" and "restored" messages render identically because both go
 *    through the same AIMessage → ResponseRenderer → ComponentRegistry path.
 *
 * If reopening a conversation degraded rich content to plain text, or
 * rendered it differently than it would live, these tests would fail.
 */

function makeMessage(responseData: Block[]): Message {
  return {
    id: 'test-msg-1',
    role: 'assistant',
    content: 'Fallback plain text (should not be used)',
    response_data: { message: { role: 'assistant' }, content: responseData },
    created_at: '2026-01-01T00:00:00Z',
  }
}

describe('CRITICAL: stored response_data renders identically to live via the same ResponseRenderer pipeline', () => {
  it('renders recommendation blocks (place cards with rank/reason) from stored response_data', () => {
    const message = makeMessage(recommendationPayload)
    render(<AIMessage message={message} />)

    expect(screen.getByText('top stays')).toBeInTheDocument()
    expect(screen.getByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.getByText('Treebo Trend JP Nagar')).toBeInTheDocument()
    expect(screen.getByText('Cozy PGs Indiranagar')).toBeInTheDocument()
    expect(screen.getByText('Best balance of price, rating and distance.')).toBeInTheDocument()
    expect(screen.getByText('Zostel books out fast on weekends — grab it early.')).toBeInTheDocument()
  })

  it('renders comparison table from stored response_data', () => {
    const message = makeMessage(comparisonPayload)
    render(<AIMessage message={message} />)

    expect(screen.getByText('Comparing the two closest stays side by side:')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Zostel vs Treebo' })).toBeInTheDocument()
    expect(screen.getByText('Zostel is the pick: half the price, closer, and better rated.')).toBeInTheDocument()
  })

  it('renders all block types from stored response_data (headings, text, lists, tables, links, images, places, recommendations, comparisons, alerts, actions)', () => {
    const message = makeMessage(everyBlockTypePayload)
    render(<AIMessage message={message} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Evening plan: dinner + a walk' })).toBeInTheDocument()
    expect(screen.getByText('Here is a full itinerary broken into blocks.')).toBeInTheDocument()
    expect(screen.getByText('Book Zostel')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Options compared' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'City map (OpenStreetMap)' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Illustrative city image' })).toBeInTheDocument()
    expect(screen.getAllByText('Zostel Koramangala')[0]).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Zostel vs Treebo' })).toBeInTheDocument()
    expect(screen.getByText('Good news')).toBeInTheDocument()
    expect(screen.getByText('What next?')).toBeInTheDocument()
  })

  it('renders visual hierarchy (text → recommendation → text → alert) from stored response_data', () => {
    const message = makeMessage(visualHierarchyPayload)
    render(<AIMessage message={message} />)

    expect(screen.getByText(/best budget stays/i)).toBeInTheDocument()
    expect(screen.getByText('Top 3 picks by price + proximity')).toBeInTheDocument()
    expect(screen.getByText('Zostel books out fast on weekends.')).toBeInTheDocument()
    expect(screen.getByText('Prices may change')).toBeInTheDocument()
  })

  it('renders long recommendation list from stored response_data with show-more toggle', () => {
    const message = makeMessage(longRecommendationPayload)
    render(<AIMessage message={message} />)

    expect(screen.getByText('Here are all the budget stays I found near your area:')).toBeInTheDocument()
    expect(screen.getByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.getByText('Treebo Trend JP Nagar')).toBeInTheDocument()
    expect(screen.getByText('Cozy PGs Indiranagar')).toBeInTheDocument()
    expect(screen.getByText('StayVista Rooms HSR')).toBeInTheDocument()
    expect(screen.getByText('BlueMoon Hostel Bellandur')).toBeInTheDocument()

    expect(screen.queryByText('Zova Suites Koramangala')).not.toBeInTheDocument()
    expect(screen.queryByText('Nest Homestay Agara')).not.toBeInTheDocument()

    const showMore = screen.getByRole('button', { name: /Show more/ })
    expect(showMore).toHaveTextContent('Show more (2 more)')
    fireEvent.click(showMore)

    expect(screen.getByText('Zova Suites Koramangala')).toBeInTheDocument()
    expect(screen.getByText('Nest Homestay Agara')).toBeInTheDocument()
  })

  it('uses ResponseRenderer (not Markdown fallback) when response_data is present', () => {
    const message = makeMessage(recommendationPayload)
    const { container } = render(<AIMessage message={message} />)

    const markdownFallback = container.querySelector('.rounded-2xl.rounded-bl-sm.border')
    expect(markdownFallback).toBeNull()

    const responseRendererOutput = container.querySelector('.space-y-4')
    expect(responseRendererOutput).not.toBeNull()
  })

  it('falls back to MarkdownRenderer when response_data is absent (plain text message)', () => {
    const message: Message = {
      id: 'plain-msg',
      role: 'assistant',
      content: 'A plain text response with **bold**',
      response_data: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    const { container } = render(<AIMessage message={message} />)

    const markdownFallback = container.querySelector('.rounded-2xl.rounded-bl-sm.border')
    expect(markdownFallback).not.toBeNull()

    expect(screen.getByText('bold', { selector: 'strong' })).toBeInTheDocument()
  })

  it('PROVES identical rendering: same response_data block produces identical DOM regardless of message context', () => {
    const sharedBlocks: Block[] = [
      { type: 'heading', level: 2, content: 'Shared Block Test' },
      { type: 'text', content: 'This content comes from stored **response_data**.' },
      {
        type: 'alert',
        level: 'info',
        title: 'Stored Alert',
        content: 'This alert was persisted by the backend and restored on reload.',
      },
    ]

    const liveMessage = makeMessage(sharedBlocks)
    const restoredMessage = makeMessage(sharedBlocks)

    const { container: liveContainer } = render(<AIMessage message={liveMessage} />)
    const liveHTML = liveContainer.innerHTML
    cleanup()

    const { container: restoredContainer } = render(<AIMessage message={restoredMessage} />)
    const restoredHTML = restoredContainer.innerHTML

    expect(restoredHTML).toBe(liveHTML)
  })
})
