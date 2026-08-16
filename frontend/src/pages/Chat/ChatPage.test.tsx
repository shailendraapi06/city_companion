import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ChatProvider } from '../../context/ChatContext'
import { UIContextProvider } from '../../context/UIContext'
import { ChatPage } from './ChatPage'

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

afterEach(cleanup)

describe('ChatPage (Phase 6D — chat shell)', () => {
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

  it('pre-fills the composer from a quick-prompt chip', async () => {
    renderAt('/chat')
    fireEvent.click(await screen.findByRole('button', { name: /Find affordable food/ }))
    expect(screen.getByRole('textbox', { name: 'Message composer' })).toHaveValue('Find affordable food')
  })
})
