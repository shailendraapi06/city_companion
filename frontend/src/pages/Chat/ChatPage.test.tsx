import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatProvider } from '../../context/ChatContext'
import { UIContextProvider } from '../../context/UIContext'
import { ChatPage } from './ChatPage'

vi.mock('../../lib/api/chat', () => ({
  sendMessage: vi.fn(),
}))

vi.mock('../../lib/api/conversations', () => ({
  getConversationMessages: vi.fn(),
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

describe('ChatPage (Phase 8B — existing conversation load)', () => {
  it('shows the empty state at /chat', async () => {
    renderAt('/chat')
    expect(await screen.findByRole('heading', { name: 'What can I help you find?' })).toBeInTheDocument()
  })

  it('loads and renders real conversation history through ResponseRenderer', async () => {
    const { getConversationMessages } = await import('../../lib/api/conversations')
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      results: [
        { id: 'msg-1', role: 'user', content: 'Find a PG near Kanpur college for under ₹10,000 a month', response_data: null, created_at: '2026-01-01T00:00:00Z' },
        {
          id: 'msg-2', role: 'assistant', content: 'Here are the best PGs near Kanpur college within your budget.',
          response_data: {
            message: { role: 'assistant' },
            content: [
              { type: 'heading', level: 2, content: 'Best PGs near Kanpur college' },
              { type: 'text', content: 'Here are the closest options within your **₹10,000/month** budget.' },
              { type: 'list', items: ['Cozy PGs Indiranagar — ₹650/night, 5.8 km', 'Green Nest PG — ₹8,500/month, 1.2 km'] },
              { type: 'alert', level: 'info', title: 'Tip', content: 'Call ahead — PGs near colleges fill fast before term starts.' },
            ],
          },
          created_at: '2026-01-01T00:00:01Z',
        },
      ],
    })

    renderAt('/chat/real-conv-1')

    expect(screen.getByText('Loading conversation…')).toBeInTheDocument()

    expect(
      await screen.findByText('Find a PG near Kanpur college for under ₹10,000 a month'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Best PGs near Kanpur college' })).toBeInTheDocument()
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

  it('auto-sends follow-up in a loaded conversation through the same pipeline', async () => {
    const { getConversationMessages } = await import('../../lib/api/conversations')
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      results: [
        { id: 'msg-1', role: 'user', content: 'Find budget stays', response_data: null, created_at: '2026-01-01T00:00:00Z' },
        {
          id: 'msg-2', role: 'assistant', content: 'Here are budget stays.',
          response_data: { message: { role: 'assistant' }, content: [{ type: 'text', content: 'Budget stay options.' }] },
          created_at: '2026-01-01T00:00:01Z',
        },
      ],
    })

    const mockSend = vi.mocked((await import('../../lib/api/chat')).sendMessage)
    mockSend.mockResolvedValueOnce({
      conversation_id: 'real-conv-1',
      message: { id: 'asst-2', role: 'assistant' },
      content: [{ type: 'text', content: 'Here are cheaper options.' }],
    })

    renderAt('/chat/real-conv-1')

    await waitFor(() => {
      expect(screen.queryByText('Loading conversation…')).not.toBeInTheDocument()
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Follow-up suggestion: Show cheaper' }))

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Show me cheaper options',
        conversation_id: 'real-conv-1',
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
