import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { UIContextProvider } from '../../context/UIContext'
import { ChatErrorBanner } from './ChatErrorBanner'
import { ChatWindow } from './ChatWindow'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ChatErrorBanner (Phase 7F — §9 generic chat error)', () => {
  it('renders the generic copy with Try Again and Start New Chat wired to callbacks', () => {
    const onRetry = vi.fn()
    const onStartNewChat = vi.fn()
    render(<ChatErrorBanner onRetry={onRetry} onStartNewChat={onStartNewChat} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.queryByText(/500|timeout|failed|error:/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Start New Chat' }))
    expect(onStartNewChat).toHaveBeenCalledTimes(1)
  })
})

describe('ChatWindow error wiring (Phase 7F)', () => {
  const baseProps = {
    messages: [],
    isSending: false,
    draft: '',
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
    onPickPrompt: vi.fn(),
  }

  function renderWindow(ui: ReactNode) {
    return render(<UIContextProvider>{ui}</UIContextProvider>)
  }

  it('shows the error banner instead of the empty state and keeps the composer docked', () => {
    renderWindow(
      <ChatWindow {...baseProps} error onRetry={vi.fn()} onStartNewChat={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.queryByText(/What can I help you find/)).toBeNull()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders messages plus the error banner above them when a failed conversation has history', () => {
    const messages = [
      { id: 'm-1', role: 'user' as const, content: 'Hostels near Koramangala', response_data: null, created_at: '2026-01-01T00:00:00Z' },
      {
        id: 'm-2',
        role: 'assistant' as const,
        content: 'Here are the best options.',
        response_data: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    renderWindow(
      <ChatWindow {...baseProps} messages={messages} error onRetry={vi.fn()} onStartNewChat={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Hostels near Koramangala')).toBeInTheDocument()
    expect(screen.getByText('Here are the best options.')).toBeInTheDocument()
  })
})
