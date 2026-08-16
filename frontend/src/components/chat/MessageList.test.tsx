import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UIContextProvider } from '../../context/UIContext'
import type { Message } from '../../types'
import { MessageList } from './MessageList'

const iso = '2026-01-01T00:00:00Z'

function makeMessages(count: number): Message[] {
  const messages: Message[] = []
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `m-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message ${i}`,
      response_data:
        i % 2 === 1
          ? { message: { role: 'assistant' }, content: [{ type: 'text', content: `blocks ${i}` }] }
          : null,
      created_at: iso,
    })
  }
  return messages
}

function setGeometry(list: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number) {
  Object.defineProperty(list, 'scrollHeight', { configurable: true, get: () => scrollHeight })
  Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => clientHeight })
  list.scrollTop = scrollTop
}

const jumpButton = () => screen.queryByRole('button', { name: /jump to latest/ })

afterEach(cleanup)

describe('MessageList (Phase 6D — §6.3 auto-scroll)', () => {
  it('renders user messages and assistant response_data blocks via the ResponseRenderer', () => {
    render(
      <UIContextProvider>
        <MessageList messages={makeMessages(2)} />
      </UIContextProvider>,
    )
    expect(screen.getByText('message 0')).toBeInTheDocument()
    expect(screen.getByText('blocks 1')).toBeInTheDocument()
  })

  it('shows "↓ New response" when scrolled up and hides it when jumping to latest', () => {
    const { container } = render(
      <UIContextProvider>
        <MessageList messages={makeMessages(4)} />
      </UIContextProvider>,
    )
    const list = container.querySelector('[data-testid="message-list"]') as HTMLElement
    setGeometry(list, 800, 400, 100)
    fireEvent.scroll(list)
    const button = screen.getByRole('button', { name: /jump to latest/ })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(jumpButton()).not.toBeInTheDocument()
  })

  it('does not show the jump button while the user is already at the bottom', () => {
    const { container } = render(
      <UIContextProvider>
        <MessageList messages={makeMessages(2)} />
      </UIContextProvider>,
    )
    const list = container.querySelector('[data-testid="message-list"]') as HTMLElement
    setGeometry(list, 800, 400, 400)
    fireEvent.scroll(list)
    expect(jumpButton()).not.toBeInTheDocument()
  })

  it('stays bottom-anchored when a new message arrives while scrolled to the bottom', () => {
    const { container, rerender } = render(
      <UIContextProvider>
        <MessageList messages={makeMessages(1)} />
      </UIContextProvider>,
    )
    const list = container.querySelector('[data-testid="message-list"]') as HTMLElement
    setGeometry(list, 800, 400, 400)
    fireEvent.scroll(list)
    expect(jumpButton()).not.toBeInTheDocument()
    rerender(
      <UIContextProvider>
        <MessageList messages={makeMessages(2)} />
      </UIContextProvider>,
    )
    expect(jumpButton()).not.toBeInTheDocument()
  })

  it('stays anchored on a long scrollable list, then surfaces the jump affordance when scrolled up', () => {
    const { container, rerender } = render(
      <UIContextProvider>
        <MessageList messages={makeMessages(30)} />
      </UIContextProvider>,
    )
    const list = container.querySelector('[data-testid="message-list"]') as HTMLElement
    setGeometry(list, 5000, 400, 4600)
    fireEvent.scroll(list)
    expect(jumpButton()).not.toBeInTheDocument()
    rerender(
      <UIContextProvider>
        <MessageList messages={makeMessages(31)} />
      </UIContextProvider>,
    )
    expect(jumpButton()).not.toBeInTheDocument()
    setGeometry(list, 5000, 400, 100)
    fireEvent.scroll(list)
    expect(jumpButton()).toBeInTheDocument()
  })

  it('renders the ThinkingIndicator with the active backend stage while thinking', () => {
    render(
      <UIContextProvider>
        <MessageList messages={makeMessages(2)} isTyping thinkingStage="ranking" />
      </UIContextProvider>,
    )
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status.querySelector('[data-stage="ranking"]')).toHaveAttribute('data-stage-state', 'active')
  })

  it('renders FollowUpChips after an assistant reply and pre-fills via onPickFollowUp', () => {
    const onPickFollowUp = vi.fn()
    render(
      <UIContextProvider>
        <MessageList messages={makeMessages(2)} onPickFollowUp={onPickFollowUp} />
      </UIContextProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Follow-up suggestion: Show cheaper' }))
    expect(onPickFollowUp).toHaveBeenCalledWith('Show me cheaper options')
  })

  it('hides FollowUpChips while the next reply is being generated', () => {
    const messages = makeMessages(4).slice(1)
    const { container, rerender } = render(
      <UIContextProvider>
        <MessageList messages={messages} isTyping onPickFollowUp={vi.fn()} />
      </UIContextProvider>,
    )
    expect(screen.queryByRole('button', { name: /Follow-up suggestion/ })).not.toBeInTheDocument()
    const list = container.querySelector('[data-testid="message-list"]') as HTMLElement
    setGeometry(list, 800, 400, 400)
    fireEvent.scroll(list)
    rerender(
      <UIContextProvider>
        <MessageList messages={messages} onPickFollowUp={vi.fn()} />
      </UIContextProvider>,
    )
    expect(screen.getByRole('button', { name: 'Follow-up suggestion: Show cheaper' })).toBeInTheDocument()
  })
})
