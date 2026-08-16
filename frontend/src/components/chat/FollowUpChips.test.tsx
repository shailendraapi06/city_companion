import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FOLLOW_UPS, FollowUpChips } from './FollowUpChips'

afterEach(cleanup)

describe('FollowUpChips (Phase 7D — §4.5)', () => {
  it('renders the default quick-action chips after an AI response', () => {
    render(<FollowUpChips onPick={vi.fn()} />)
    for (const { label } of DEFAULT_FOLLOW_UPS) {
      expect(screen.getByRole('button', { name: `Follow-up suggestion: ${label}` })).toBeInTheDocument()
    }
  })

  it('pre-fills the composer prompt when a chip is picked', () => {
    const onPick = vi.fn()
    render(<FollowUpChips onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Follow-up suggestion: Show cheaper' }))
    expect(onPick).toHaveBeenCalledWith('Show me cheaper options')
  })

  it('renders per-response suggestions when provided', () => {
    const onPick = vi.fn()
    render(<FollowUpChips onPick={onPick} suggestions={[{ label: 'Budget', prompt: 'Show budget picks' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Follow-up suggestion: Budget' }))
    expect(onPick).toHaveBeenCalledWith('Show budget picks')
  })
})
