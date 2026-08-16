import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThinkingIndicator, THINKING_STAGES } from './ThinkingIndicator'

afterEach(cleanup)

describe('ThinkingIndicator (Phase 7D — §6.1)', () => {
  it('renders the full stage path in an accessible live region', () => {
    render(<ThinkingIndicator stage="understanding" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    for (const { label } of THINKING_STAGES) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('marks the provided stage as active and everything before it as done', () => {
    render(<ThinkingIndicator stage="ranking" />)
    const active = screen.getByText('Ranking the best matches').closest('[data-stage-state]')
    expect(active).toHaveAttribute('data-stage-state', 'active')
    expect(active).toHaveAttribute('data-stage', 'ranking')
    expect(screen.getByText('Understanding your request').closest('[data-stage-state]')).toHaveAttribute(
      'data-stage-state',
      'done',
    )
    expect(screen.getByText('Finding nearby options').closest('[data-stage-state]')).toHaveAttribute(
      'data-stage-state',
      'done',
    )
    expect(screen.getByText('Preparing your answer').closest('[data-stage-state]')).toHaveAttribute(
      'data-stage-state',
      'upcoming',
    )
  })

  it('falls back to the first stage when no stage is provided', () => {
    render(<ThinkingIndicator />)
    expect(screen.getByText('Understanding your request').closest('[data-stage-state]')).toHaveAttribute(
      'data-stage-state',
      'active',
    )
  })
})
