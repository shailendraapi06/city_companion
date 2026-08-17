import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatProvider } from '../../context/ChatContext'
import { UIContextProvider } from '../../context/UIContext'
import { ChatPage } from './ChatPage'

vi.mock('../../lib/api/chat', () => ({
  sendMessage: vi.fn(),
}))

function renderAt(path: string) {
  return render(
    <UIContextProvider>
      <ChatProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
          </Routes>
        </MemoryRouter>
      </ChatProvider>
    </UIContextProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ChatPage (Phase 8A — real send pipeline)', () => {
  it('shows the empty state at /chat', async () => {
    renderAt('/chat')
    expect(await screen.findByRole('heading', { name: 'What can I help you find?' })).toBeInTheDocument()
  })

  it('renders mock conversation history through the ResponseRenderer at /chat/:id', async () => {
    renderAt('/chat/mock-conv-1')
    expect(
      await screen.findByText('Find a PG near Kanpur college for under ₹10,000 a month'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Best PGs near Kanpur college' })).toBeInTheDocument()
    expect(screen.getByText('Cozy PGs Indiranagar')).toBeInTheDocument()
    expect(screen.getByText(/Call ahead — PGs near colleges fill fast/)).toBeInTheDocument()
  })

  it('auto-sends when a quick-prompt chip is clicked (not just fills the composer)', async () => {
    const mockSend = vi.mocked((await import('../../lib/api/chat')).sendMessage)
    mockSend.mockResolvedValueOnce({
      conversation_id: 'new-conv-from-prompt',
      message: { id: 'asst-1', role: 'assistant' },
      content: [{ type: 'text', content: 'Sure, here are some options!' }],
    })

    renderAt('/chat')

    fireEvent.click(await screen.findByRole('button', { name: /Find affordable food/ }))

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Find affordable food',
        conversation_id: null,
      }))
    })
  })

  it('auto-sends when a follow-up chip is clicked', async () => {
    const mockSend = vi.mocked((await import('../../lib/api/chat')).sendMessage)
    mockSend.mockResolvedValueOnce({
      conversation_id: 'mock-conv-1',
      message: { id: 'asst-2', role: 'assistant' },
      content: [{ type: 'text', content: 'Here are cheaper options.' }],
    })

    renderAt('/chat/mock-conv-1')

    fireEvent.click(await screen.findByRole('button', { name: 'Follow-up suggestion: Show cheaper' }))

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Show me cheaper options',
        conversation_id: 'mock-conv-1',
      }))
    })
  })

  it('navigates to /chat/:conversationId after a successful new-conversation send', async () => {
    const mockSend = vi.mocked((await import('../../lib/api/chat')).sendMessage)
    mockSend.mockResolvedValueOnce({
      conversation_id: 'created-conv-id',
      message: { id: 'asst-3', role: 'assistant' },
      content: [{ type: 'text', content: 'Response' }],
    })

    renderAt('/chat')

    fireEvent.change(screen.getByRole('textbox', { name: 'Message composer' }), {
      target: { value: 'Find hospitals near me' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Find hospitals near me',
        conversation_id: null,
      }))
    })
  })
})
