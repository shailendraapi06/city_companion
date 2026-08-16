import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SavedPlace } from '../../types'
import { SavedPlacesList, savedPlaceToPlaceResult } from './SavedPlacesList'

vi.mock('../../lib/api/places', () => ({
  savePlace: vi.fn(),
  unsavePlace: vi.fn(),
}))

const savedPlaces: SavedPlace[] = [
  {
    saved_id: 'sv-1',
    place: {
      id: 'plc_001',
      name: 'Zostel Koramangala',
      category: 'Hostel',
      price_range: { amount: 700, unit: 'night' },
      rating: 4.5,
    },
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    saved_id: 'sv-2',
    place: {
      id: 'plc_002',
      name: 'Cafe Coffee Day',
      category: 'Cafe',
      price_range: { amount: 150, unit: 'person' },
      rating: 4.0,
    },
    created_at: '2026-01-01T00:00:00Z',
  },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SavedPlacesList (Phase 7E — saved cards reuse PlaceCard)', () => {
  it('groups saved places by category and renders real place cards in Saved state', () => {
    render(<SavedPlacesList savedPlaces={savedPlaces} />)
    expect(screen.getByRole('heading', { name: 'Hostel' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cafe' })).toBeInTheDocument()
    expect(screen.getByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.getByText('Cafe Coffee Day')).toBeInTheDocument()
    expect(screen.getByText('₹700/night')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Saved' }).length).toBeGreaterThan(0)
  })

  it('maps a SavedPlace summary onto the PlaceResult contract', () => {
    expect(savedPlaceToPlaceResult(savedPlaces[0])).toEqual({
      place_id: 'plc_001',
      name: 'Zostel Koramangala',
      category: 'Hostel',
      price_range: { amount: 700, unit: 'night' },
      rating: 4.5,
    })
  })

  it('renders nothing when there are no saved places', () => {
    const { container } = render(<SavedPlacesList savedPlaces={[]} />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })
})
