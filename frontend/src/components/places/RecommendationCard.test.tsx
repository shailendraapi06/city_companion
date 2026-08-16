import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Block, PlaceResult } from '../../types'
import { RecommendationCard } from './RecommendationCard'

vi.mock('../../lib/api/places', () => ({
  getPlace: vi.fn(),
  savePlace: vi.fn(),
  unsavePlace: vi.fn(),
}))

const basePlaces: PlaceResult[] = [
  { place_id: 'plc_001', name: 'Place One', category: 'Hostel', price_range: { amount: 700, unit: 'night' } },
  { place_id: 'plc_002', name: 'Place Two', category: 'Hostel', price_range: { amount: 900, unit: 'night' } },
  { place_id: 'plc_003', name: 'Place Three', category: 'Hostel', price_range: { amount: 800, unit: 'night' } },
]

function longBlock(items: PlaceResult[]): Block {
  return { type: 'recommendation', summary: 'Budget stays', items }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RecommendationCard (Phase 7C — ranked list)', () => {
  it('renders "#1 Best Match" for the top pick and numeric badges after it', () => {
    const block: Block = {
      type: 'recommendation',
      summary: 'Top 3 picks',
      items: [
        { place: basePlaces[0], rank: 1, reason: 'Closest.' },
        { place: basePlaces[1], rank: 2, reason: 'Solid.' },
        { place: basePlaces[2], rank: 3, reason: 'Cheap.' },
      ],
    }
    render(<RecommendationCard block={block} />)

    expect(screen.getByText('#1 Best Match')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
    expect(screen.queryByText('🏅')).toBeNull()
  })

  it('renders each rank reason verbatim from the payload', () => {
    const block: Block = {
      type: 'recommendation',
      summary: 'Top picks',
      items: [
        { place: basePlaces[0], rank: 1, reason: 'Best balance of price, rating and distance.' },
      ],
    }
    render(<RecommendationCard block={block} />)
    expect(screen.getByText('Best balance of price, rating and distance.')).toBeInTheDocument()
  })

  it('supports flat engine-shaped items with rank/reason embedded on the place', () => {
    const block: Block = {
      type: 'recommendation',
      summary: 'Top picks',
      items: [
        { ...basePlaces[0], rank: 1, reason: 'Engine pick.' },
        { ...basePlaces[1], rank: 2, reason: 'Second best.' },
      ],
    }
    render(<RecommendationCard block={block} />)

    expect(screen.getByText('#1 Best Match')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('Engine pick.')).toBeInTheDocument()
    expect(screen.getByText('Second best.')).toBeInTheDocument()
  })

  it('collapses long result sets to the top 5 with a working Show more toggle', () => {
    const sevenPlaces = Array.from({ length: 7 }, (_, index) => ({
      place_id: `plc_long_${index + 1}`,
      name: `Candidate ${index + 1}`,
      category: 'Hostel',
      rank: index + 1,
      reason: `Reason ${index + 1}`,
    })) as PlaceResult[]

    render(<RecommendationCard block={longBlock(sevenPlaces)} />)

    for (let index = 1; index <= 5; index += 1) {
      expect(screen.getByText(`Candidate ${index}`)).toBeInTheDocument()
    }
    expect(screen.queryByText('Candidate 6')).toBeNull()
    expect(screen.queryByText('Candidate 7')).toBeNull()

    const toggle = screen.getByRole('button', { name: 'Show more (2 more)' })
    fireEvent.click(toggle)
    expect(screen.getByText('Candidate 6')).toBeInTheDocument()
    expect(screen.getByText('Candidate 7')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }))
    expect(screen.queryByText('Candidate 6')).toBeNull()
  })

  it('does not show the toggle when at or below the limit', () => {
    render(<RecommendationCard block={longBlock(basePlaces)} />)
    expect(screen.queryByRole('button', { name: /Show more/ })).toBeNull()
  })

  it('shows a friendly no-results panel with an actionable suggestion when there are no items', () => {
    render(<RecommendationCard block={{ type: 'recommendation' }} />)

    expect(screen.getByRole('status', { name: 'No exact matches' })).toBeInTheDocument()
    expect(
      screen.getByText("We couldn't find exact matches for that."),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Try a nearby area, a different category, or a higher budget/),
    ).toBeInTheDocument()
    expect(screen.queryByText('No results found')).toBeNull()
  })

  it('shows the engine explanation when the no-results payload provides one', () => {
    render(
      <RecommendationCard
        block={{ type: 'recommendation', explanation: 'No stays under ₹500 in Indiranagar.' }}
      />,
    )

    expect(screen.getByRole('status', { name: 'No exact matches' })).toBeInTheDocument()
    expect(screen.getByText('No stays under ₹500 in Indiranagar.')).toBeInTheDocument()
  })

  it('shows the summary and places inside the section', () => {
    render(<RecommendationCard block={longBlock(basePlaces)} />)
    const section = screen.getByText('Budget stays').closest('section')
    expect(section).not.toBeNull()
    expect(within(section as HTMLElement).getByText('Place One')).toBeInTheDocument()
  })
})
