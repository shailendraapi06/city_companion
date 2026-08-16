import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitFeedback } from '../../lib/api/feedback'
import { MessageActions } from './MessageActions'

vi.mock('../../lib/api/feedback', () => ({
  submitFeedback: vi.fn(),
}))

const mockedSubmitFeedback = vi.mocked(submitFeedback)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MessageActions (Phase 7D — §6.4)', () => {
  it('posts up-vote feedback without a reason', async () => {
    mockedSubmitFeedback.mockResolvedValue({
      id: 'fb-1',
      message_id: 'm-1',
      place_id: null,
      type: 'up',
      reason: null,
      created_at: '2026-01-01T00:00:00Z',
    })
    render(<MessageActions messageId="m-1" content="hello" />)
    fireEvent.click(screen.getByRole('button', { name: 'Helpful' }))
    expect(await screen.findByText('Thanks for the feedback')).toBeInTheDocument()
    expect(mockedSubmitFeedback).toHaveBeenCalledWith({ message_id: 'm-1', place_id: null, type: 'up', reason: null })
  })

  it('opens the reason picker on 👎 and submits the chosen reason to the real endpoint', async () => {
    mockedSubmitFeedback.mockResolvedValue({
      id: 'fb-2',
      message_id: 'm-1',
      place_id: null,
      type: 'down',
      reason: 'too_far',
      created_at: '2026-01-01T00:00:00Z',
    })
    render(<MessageActions messageId="m-1" content="hello" />)
    fireEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    expect(screen.getByRole('group', { name: 'Why was this not helpful?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Not helpful because Too far' }))
    expect(await screen.findByText('Thanks for the feedback')).toBeInTheDocument()
    expect(mockedSubmitFeedback).toHaveBeenCalledWith({
      message_id: 'm-1',
      place_id: null,
      type: 'down',
      reason: 'too_far',
    })
  })

  it('submits a down-vote without a reason via Skip', async () => {
    mockedSubmitFeedback.mockResolvedValue({
      id: 'fb-3',
      message_id: 'm-1',
      place_id: null,
      type: 'down',
      reason: null,
      created_at: '2026-01-01T00:00:00Z',
    })
    render(<MessageActions messageId="m-1" content="hello" />)
    fireEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit not helpful without a reason' }))
    expect(await screen.findByText('Thanks for the feedback')).toBeInTheDocument()
    expect(mockedSubmitFeedback).toHaveBeenCalledWith({
      message_id: 'm-1',
      place_id: null,
      type: 'down',
      reason: null,
    })
  })

  it('cancels the reason picker without submitting', () => {
    render(<MessageActions messageId="m-1" content="hello" />)
    fireEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel feedback' }))
    expect(screen.queryByRole('group', { name: 'Why was this not helpful?' })).not.toBeInTheDocument()
    expect(mockedSubmitFeedback).not.toHaveBeenCalled()
  })

  it('copies the message content to the clipboard', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    render(<MessageActions messageId="m-1" content="copy this" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy this')
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  it('shows a friendly error (no technical detail) and re-enables the button when feedback fails', async () => {
    mockedSubmitFeedback.mockRejectedValue(new Error('500: upstream timeout'))
    render(<MessageActions messageId="m-1" content="hello" />)

    fireEvent.click(screen.getByRole('button', { name: 'Helpful' }))

    expect(await screen.findByText("Couldn't send feedback. Try again.")).toBeInTheDocument()
    expect(screen.queryByText(/500: upstream timeout/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Helpful' })).toBeEnabled()
    expect(screen.queryByText('Thanks for the feedback')).toBeNull()
  })

  it('keeps the action row visible on touch (no lg hover) and only hides it behind the lg hover-reveal', () => {
    const { container } = render(<MessageActions messageId="m-1" content="hello" />)

    const row = container.querySelector('[class*="mt-1.5 pl-1"]')
    expect(row?.className).toContain('lg:opacity-0')
    expect(row?.className).toContain('lg:group-hover:opacity-100')
    expect(screen.getByRole('button', { name: 'Helpful' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not helpful' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })
})
