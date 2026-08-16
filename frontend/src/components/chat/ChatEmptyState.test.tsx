import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatEmptyState } from './ChatEmptyState'

afterEach(cleanup)

describe('ChatEmptyState (Phase 6D — §4.4)', () => {
  it('renders the centerpiece heading, subtext and all three quick-prompt chips', () => {
    render(<ChatEmptyState onPickPrompt={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'What can I help you find?' })).toBeInTheDocument()
    expect(screen.getByText(/Ask about places to stay/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Find a place to stay/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Find affordable food/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Find a nearby hospital/ })).toBeInTheDocument()
  })

  it('reports the prompt via onPickPrompt — the shell pre-fills the composer', () => {
    const onPickPrompt = vi.fn()
    render(<ChatEmptyState onPickPrompt={onPickPrompt} />)
    fireEvent.click(screen.getByRole('button', { name: /Find a nearby hospital/ }))
    expect(onPickPrompt).toHaveBeenCalledWith('Find a nearby hospital')
  })
})
