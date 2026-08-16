import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Block } from '../../types'
import { ComparisonTable } from './ComparisonTable'

vi.mock('../../lib/api/places', () => ({
  getPlace: vi.fn(),
  savePlace: vi.fn(),
  unsavePlace: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ComparisonTable (Phase 7C)', () => {
  it('renders the engine headers/rows shape with the title as the accessible name', () => {
    const block: Block = {
      type: 'comparison',
      title: 'Zostel vs Treebo',
      headers: ['Place', 'Price/night', 'Distance', 'Food', 'Rating'],
      rows: [
        ['Zostel Koramangala', '₹700', '2.1 km', 'Yes', '4.5'],
        ['Treebo Trend JP Nagar', '₹1,800', '3.4 km', 'Breakfast', '4.2'],
      ],
      explanation: 'Zostel is the pick: half the price, closer, and better rated.',
    }
    render(<ComparisonTable block={block} />)

    const table = screen.getByRole('table', { name: 'Zostel vs Treebo' })
    expect(within(table).getByText('Price/night')).toBeInTheDocument()
    expect(within(table).getByText('Zostel Koramangala')).toBeInTheDocument()
    expect(within(table).getByText('₹1,800')).toBeInTheDocument()
    expect(
      screen.getByText('Zostel is the pick: half the price, closer, and better rated.'),
    ).toBeInTheDocument()
  })

  it('derives aligned Price / Distance / Food / Rating rows from legacy items', () => {
    const block: Block = {
      type: 'comparison',
      title: 'Zostel vs Treebo',
      items: [
        {
          place_id: 'plc_001',
          name: 'Zostel Koramangala',
          category: 'Hostel',
          price_range: { amount: 700, unit: 'night' },
          rating: 4.5,
          distance_km: 2.1,
          amenities: ['food', 'wifi'],
        },
        {
          place_id: 'plc_002',
          name: 'Treebo Trend JP Nagar',
          category: 'Budget Hotel',
          price_range: { amount: 1800, unit: 'night' },
          rating: 4.2,
          distance_km: 3.4,
          amenities: ['wifi'],
        },
      ],
      summary: 'Zostel is the cheaper, closer pick.',
    }
    render(<ComparisonTable block={block} />)

    const table = screen.getByRole('table', { name: 'Zostel vs Treebo' })
    expect(within(table).getByText('Price')).toBeInTheDocument()
    expect(within(table).getByText('Distance')).toBeInTheDocument()
    expect(within(table).getByText('Food')).toBeInTheDocument()
    expect(within(table).getByText('Rating')).toBeInTheDocument()
    expect(within(table).getByText('₹700/night')).toBeInTheDocument()
    expect(within(table).getByText('2.1 km away')).toBeInTheDocument()
    expect(within(table).getByText('4.5')).toBeInTheDocument()
    expect(within(table).getAllByText('No')).toHaveLength(1)
    expect(screen.getByText('Zostel is the cheaper, closer pick.')).toBeInTheDocument()
  })

  it('renders nothing when an items block has no items and no rows', () => {
    const { container } = render(<ComparisonTable block={{ type: 'comparison' }} />)
    expect(container.textContent).toBe('')
  })
})
