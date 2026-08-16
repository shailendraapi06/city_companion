import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatProvider, useChat } from './ChatContext'

function Harness() {
  const ctx = useChat()
  return (
    <div>
      <span data-testid="conv">{ctx.conversationId ?? 'null'}</span>
      <span data-testid="status">{ctx.status}</span>
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
})
