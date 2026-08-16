import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { savePlace, unsavePlace } from '../../lib/api/places'
import type { Block, PlaceResult } from '../../types'
import { PlaceCard } from './PlaceCard'

vi.mock('../../lib/api/places', () => ({
  getPlace: vi.fn(),
  savePlace: vi.fn(),
  unsavePlace: vi.fn(),
}))

const mockedSavePlace = vi.mocked(savePlace)
const mockedUnsavePlace = vi.mocked(unsavePlace)

const richPlace: PlaceResult = {
  place_id: 'plc_001',
  name: 'Zostel Koramangala',
  category: 'Hostel',
  address: '17, 5th Block, Koramangala, Bengaluru 560095',
  latitude: 12.9352,
  longitude: 77.6245,
  price_range: { amount: 700, unit: 'night' },
  rating: 4.5,
  distance_km: 2.1,
  match_score: 92,
  amenities: ['food', 'wifi'],
  phone: '+91 99000 12345',
  website: 'https://zostel.com',
  source: 'mock',
  verified: false,
  last_updated: '2026-01-01T00:00:00Z',
  score_breakdown: { budget: 26, requirement: 24, distance: 22, rating: 20, quality: 0 },
}

const freshVerifiedPlace: PlaceResult = {
  ...richPlace,
  place_id: 'plc_100',
  verified: true,
  last_updated: new Date().toISOString(),
  amenities: ['wifi'],
  score_breakdown: null,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PlaceCard (Phase 7C — generic, category-aware)', () => {
  it('renders name, category, price and facts from real fields', () => {
    render(<PlaceCard place={richPlace} />)

    expect(screen.getByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.getByText('PG / Hostel')).toBeInTheDocument()
    expect(screen.getByText('₹700/night')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('2.1 km away')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('match')).toBeInTheDocument()
  })

  it('renders a data-driven "Why this?" checklist from score_breakdown and amenities', () => {
    render(<PlaceCard place={richPlace} />)

    expect(screen.getByText('Why this?')).toBeInTheDocument()
    expect(screen.getByText('✓ Within budget')).toBeInTheDocument()
    expect(screen.getByText('✓ Meets your requirements')).toBeInTheDocument()
    expect(screen.getByText('✓ Near your location')).toBeInTheDocument()
    expect(screen.getByText('✓ Highly rated')).toBeInTheDocument()
    expect(screen.getByText('✓ Food available')).toBeInTheDocument()
    expect(screen.queryByText('✓ Quality listing')).toBeNull()
  })

  it('shows the price caveat when data is stale or unverified, and hides it when fresh + verified', () => {
    const { rerender } = render(<PlaceCard place={richPlace} />)
    expect(
      screen.getByText(/Prices are indicative — confirm with the place before you book\./),
    ).toBeInTheDocument()

    rerender(<PlaceCard place={freshVerifiedPlace} />)
    expect(
      screen.queryByText(/Prices are indicative — confirm with the place before you book\./),
    ).toBeNull()
  })

  it('wires Directions / Call / Website as plain deep links and View Details + Save as buttons', () => {
    render(<PlaceCard place={richPlace} />)

    const directions = screen.getByRole('link', { name: 'Directions' })
    expect(directions).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=12.9352,77.6245',
    )
    expect(directions).toHaveAttribute('target', '_blank')

    const call = screen.getByRole('link', { name: 'Call' })
    expect(call).toHaveAttribute('href', 'tel:+919900012345')

    const website = screen.getByRole('link', { name: 'Website' })
    expect(website).toHaveAttribute('href', 'https://zostel.com')
    expect(website).toHaveAttribute('target', '_blank')

    expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('hides Directions / Call / Website when the payload has no coords / phone / website', () => {
    const minimal: PlaceResult = {
      place_id: 'plc_002',
      name: 'Cozy PGs Indiranagar',
      category: 'PG',
      price_range: { amount: 650, unit: 'night' },
      rating: 3.9,
      distance_km: 5.8,
    }
    render(<PlaceCard place={minimal} />)

    expect(screen.queryByRole('link', { name: 'Directions' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Call' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Website' })).toBeNull()
    expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('toggles Save → Saved via the real save/unsave endpoints (optimistic)', async () => {
    mockedSavePlace.mockResolvedValue({ id: 'sv-1', place_id: 'plc_001', created_at: '2026-01-01T00:00:00Z' })
    render(<PlaceCard place={richPlace} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument()
    expect(mockedSavePlace).toHaveBeenCalledWith('plc_001')

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saved' })).toBeEnabled()
    })

    mockedUnsavePlace.mockResolvedValue(null)
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }))
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })
    expect(mockedUnsavePlace).toHaveBeenCalledWith('plc_001')
  })

  it('rolls back the toggle when the save request fails', async () => {
    mockedSavePlace.mockRejectedValue(new Error('network'))
    render(<PlaceCard place={richPlace} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument()

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })
    expect(
      screen.getByText('Could not update saved places. Please try again.'),
    ).toBeInTheDocument()
  })

  it('renders from a legacy nested {type:place, place} block and a flat items block', () => {
    const blockWithPlace: Block = { type: 'place', place: richPlace }
    const { rerender } = render(<PlaceCard block={blockWithPlace} />)
    expect(screen.getByText('Zostel Koramangala')).toBeInTheDocument()

    const blockWithItems: Block = { type: 'place', items: [freshVerifiedPlace] }
    rerender(<PlaceCard block={blockWithItems} />)
    expect(screen.getByText('Zostel Koramangala')).toBeInTheDocument()
  })

  it('renders nothing when no place can be resolved', () => {
    const { container } = render(<PlaceCard block={{ type: 'place' }} />)
    expect(container.textContent).toBe('')
  })
})
