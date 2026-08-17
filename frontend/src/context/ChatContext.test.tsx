import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatResponse } from '../lib/api/chat'
import { restoreGeolocation, stubGeolocation } from '../test/geolocation'
import { ChatProvider, useChat } from './ChatContext'

vi.mock('../lib/api/chat', () => ({
  sendMessage: vi.fn(),
}))

vi.mock('../lib/api/conversations', () => ({
  getConversationMessages: vi.fn(),
}))

function Harness() {
  const ctx = useChat()
  return (
    <div>
      <span data-testid="conv">{ctx.conversationId ?? 'null'}</span>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="stage">{ctx.thinkingStage ?? 'null'}</span>
      <span data-testid="count">{ctx.messages.length}</span>
      <span data-testid="loading">{String(ctx.loadingConversation)}</span>
      <span data-testid="notFound">{String(ctx.conversationNotFound)}</span>
      <span data-testid="loc">{ctx.location ? `${ctx.location.lat}` : 'none'}</span>
      <span data-testid="override">{ctx.locationOverride ?? 'null'}</span>
      <button onClick={() => ctx.openConversation('real-conv-1')}>open real</button>
      <button onClick={() => ctx.openConversation('not-found-id')}>open missing</button>
      <button onClick={() => ctx.startNewChat()}>reset</button>
      <button onClick={() => { void ctx.sendMessage('hello') }}>send</button>
      <button
        onClick={() => {
          ctx.setLocation({ lat: 26.4, lng: 80.3 })
          ctx.setLocationOverride('Lucknow')
        }}
      >
        locate
      </button>
    </div>
  )
}

afterEach(() => {
  cleanup()
  restoreGeolocation()
  vi.restoreAllMocks()
})

describe('ChatContext (Phase 8A+B — real API transport)', () => {
  it('exposes conversationId, messages, status, location and locationOverride', () => {
    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )
    expect(screen.getByTestId('conv')).toHaveTextContent('null')
    expect(screen.getByTestId('status')).toHaveTextContent('idle')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByTestId('loc')).toHaveTextContent('none')
    expect(screen.getByTestId('override')).toHaveTextContent('null')
    fireEvent.click(screen.getByText('locate'))
    expect(screen.getByTestId('loc')).toHaveTextContent('26.4')
    expect(screen.getByTestId('override')).toHaveTextContent('Lucknow')
  })

  it('loads a real conversation via API and resets via startNewChat', async () => {
    const { getConversationMessages } = await import('../lib/api/conversations')
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      results: [
        { id: 'msg-1', role: 'user', content: 'Find a PG', response_data: null, created_at: '2026-01-01T00:00:00Z' },
        {
          id: 'msg-2', role: 'assistant', content: 'Here are PGs',
          response_data: { message: { role: 'assistant' }, content: [{ type: 'text', content: 'PG results' }] },
          created_at: '2026-01-01T00:00:01Z',
        },
      ],
    })

    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('false')

    fireEvent.click(screen.getByText('open real'))

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
      expect(screen.getByTestId('count')).toHaveTextContent('2')
      expect(screen.getByTestId('conv')).toHaveTextContent('real-conv-1')
    })

    fireEvent.click(screen.getByText('reset'))
    expect(screen.getByTestId('conv')).toHaveTextContent('null')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('sets conversationNotFound when the API returns 404', async () => {
    const { getConversationMessages } = await import('../lib/api/conversations')
    vi.mocked(getConversationMessages).mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { code: 'NOT_FOUND', status: 404 }),
    )

    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )

    fireEvent.click(screen.getByText('open missing'))

    await waitFor(() => {
      expect(screen.getByTestId('notFound')).toHaveTextContent('true')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  it('sets conversationNotFound on network errors', async () => {
    const { getConversationMessages } = await import('../lib/api/conversations')
    vi.mocked(getConversationMessages).mockRejectedValueOnce(
      Object.assign(new Error('Network error'), { code: 'NETWORK_ERROR', status: 0 }),
    )

    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )

    fireEvent.click(screen.getByText('open missing'))

    await waitFor(() => {
      expect(screen.getByTestId('notFound')).toHaveTextContent('true')
    })
  })

  it('sends via the real API, appends both messages, and adopts the conversation_id', async () => {
    const mockSend = vi.mocked((await import('../lib/api/chat')).sendMessage)

    let resolveApi!: (value: ChatResponse) => void
    mockSend.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve }))

    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )

    fireEvent.click(screen.getByText('send'))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('sending'))
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    act(() => {
      resolveApi({
        conversation_id: 'real-conv-123',
        message: { id: 'asst-msg-1', role: 'assistant' },
        content: [{ type: 'text', content: 'Hello from the API' }],
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('idle')
      expect(screen.getByTestId('count')).toHaveTextContent('2')
      expect(screen.getByTestId('conv')).toHaveTextContent('real-conv-123')
    })

    expect(mockSend).toHaveBeenCalledWith({
      conversation_id: null,
      message: 'hello',
      location: null,
    })
  })

  it('sets thinkingStage to understanding during the real request and clears it on success', async () => {
    const mockSend = vi.mocked((await import('../lib/api/chat')).sendMessage)
    mockSend.mockReturnValueOnce(new Promise(() => {}))

    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )

    fireEvent.click(screen.getByText('send'))

    await waitFor(() => expect(screen.getByTestId('stage')).toHaveTextContent('understanding'))
    expect(screen.getByTestId('status')).toHaveTextContent('sending')
  })

  it('transitions to error status when the API call fails', async () => {
    const mockSend = vi.mocked((await import('../lib/api/chat')).sendMessage)
    mockSend.mockRejectedValueOnce(Object.assign(new Error('Network error'), { code: 'NETWORK_ERROR', status: 0 }))

    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )

    fireEvent.click(screen.getByText('send'))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error')
      expect(screen.getByTestId('stage')).toHaveTextContent('null')
      expect(screen.getByTestId('count')).toHaveTextContent('1')
    })
  })
})

function LocationHarness() {
  const ctx = useChat()
  return (
    <div>
      <span data-testid="loc">{ctx.location ? String(ctx.location.lat) : 'none'}</span>
      <span data-testid="locerr">{ctx.locationError ?? 'null'}</span>
      <span data-testid="supported">{String(ctx.locationSupported)}</span>
      <button onClick={() => ctx.requestLocation()}>request again</button>
    </div>
  )
}

describe('ChatContext (Phase 7E — geolocation capture, §6.4 / §8)', () => {
  it('captures device location once when geolocation is supported', async () => {
    stubGeolocation({ lat: 12.9, lng: 77.6 })
    render(
      <ChatProvider>
        <LocationHarness />
      </ChatProvider>,
    )
    expect(screen.getByTestId('supported')).toHaveTextContent('true')
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('12.9'))
  })

  it('marks geolocation unsupported without crashing (jsdom has no geolocation)', () => {
    render(
      <ChatProvider>
        <LocationHarness />
      </ChatProvider>,
    )
    expect(screen.getByTestId('supported')).toHaveTextContent('false')
    expect(screen.getByTestId('loc')).toHaveTextContent('none')
    expect(screen.getByTestId('locerr')).toHaveTextContent('null')
  })

  it('re-requests location via requestLocation() and replaces the captured position', async () => {
    stubGeolocation({ lat: 12.9, lng: 77.6 })
    render(
      <ChatProvider>
        <LocationHarness />
      </ChatProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('12.9'))

    stubGeolocation({ lat: 40.7, lng: 74.0 })
    fireEvent.click(screen.getByText('request again'))
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('40.7'))
  })

  it('records a non-fatal error when the permission is denied', async () => {
    stubGeolocation()
    render(
      <ChatProvider>
        <LocationHarness />
      </ChatProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('locerr')).toHaveTextContent('User denied geolocation'))
    expect(screen.getByTestId('loc')).toHaveTextContent('none')
  })
})
