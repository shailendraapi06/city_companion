import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { restoreGeolocation, stubGeolocation } from '../test/geolocation'
import { ChatProvider, useChat } from './ChatContext'

function Harness() {
  const ctx = useChat()
  return (
    <div>
      <span data-testid="conv">{ctx.conversationId ?? 'null'}</span>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="stage">{ctx.thinkingStage ?? 'null'}</span>
      <span data-testid="count">{ctx.messages.length}</span>
      <span data-testid="loc">{ctx.location ? `${ctx.location.lat}` : 'none'}</span>
      <span data-testid="override">{ctx.locationOverride ?? 'null'}</span>
      <button onClick={() => ctx.openConversation('mock-conv-1')}>open mock</button>
      <button onClick={() => ctx.openConversation('unknown-id')}>open unknown</button>
      <button onClick={() => ctx.startNewChat()}>reset</button>
      <button onClick={() => ctx.sendMessage('hello')}>send</button>
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
  vi.useRealTimers()
})

describe('ChatContext (Phase 6D — §5.2 documented state shape)', () => {
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

  it('opens a mock conversation with seeded history and resets via startNewChat', () => {
    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )
    fireEvent.click(screen.getByText('open mock'))
    expect(screen.getByTestId('conv')).toHaveTextContent('mock-conv-1')
    expect(screen.getByTestId('count')).toHaveTextContent('2')
    fireEvent.click(screen.getByText('reset'))
    expect(screen.getByTestId('conv')).toHaveTextContent('null')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('keeps an unknown conversation id without seeding or clearing messages', () => {
    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )
    fireEvent.click(screen.getByText('open unknown'))
    expect(screen.getByTestId('conv')).toHaveTextContent('unknown-id')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('appends the user message in sending state, then simulates an assistant reply', async () => {
    vi.useFakeTimers()
    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )
    fireEvent.click(screen.getByText('send'))
    expect(screen.getByTestId('status')).toHaveTextContent('sending')
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByTestId('status')).toHaveTextContent('idle')
    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })

  it('steps through the §6.1 thinking stages during a mock reply, then clears them', async () => {
    vi.useFakeTimers()
    render(
      <ChatProvider>
        <Harness />
      </ChatProvider>,
    )
    fireEvent.click(screen.getByText('send'))
    expect(screen.getByTestId('stage')).toHaveTextContent('understanding')
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByTestId('stage')).toHaveTextContent('ranking')
    await act(async () => {
      vi.advanceTimersByTime(350)
    })
    expect(screen.getByTestId('status')).toHaveTextContent('idle')
    expect(screen.getByTestId('stage')).toHaveTextContent('null')
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
