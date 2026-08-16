import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlace } from '../../lib/api/places'
import type { PlaceDetail } from '../../types'
import { PlaceDetailsProvider, usePlaceDetails } from './PlaceDetails'

vi.mock('../../lib/api/places', () => ({
  getPlace: vi.fn(),
  savePlace: vi.fn(),
  unsavePlace: vi.fn(),
}))

const mockedGetPlace = vi.mocked(getPlace)
const originalMatchMedia = window.matchMedia

const detail: PlaceDetail = {
  id: 'plc_001',
  name: 'Zostel Koramangala',
  category: 'Hostel',
  description: 'A friendly backpacker hostel in the heart of Koramangala.',
  address: '17, 5th Block, Koramangala, Bengaluru 560095',
  latitude: 12.9352,
  longitude: 77.6245,
  phone: '+91 99000 12345',
  website: 'https://zostel.com',
  rating: 4.5,
  price_range: { amount: 700, unit: 'night' },
  amenities: ['food', 'wifi', 'hot water'],
  opening_hours: { Monday: 'Open 24 hours', Tuesday: '6:00 AM – 11:00 PM' },
  images: [],
  source: 'mock',
  verified: false,
  last_updated: '2026-01-01T00:00:00Z',
  is_saved: false,
}

function Trigger() {
  const { openPlaceDetails } = usePlaceDetails()
  return (
    <button type="button" onClick={() => openPlaceDetails('plc_001')}>
      Open details
    </button>
  )
}

function renderDetails() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PlaceDetailsProvider>
        <Trigger />
      </PlaceDetailsProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PlaceDetails (Phase 7C — real GET /api/places/{id}/)', () => {
  it('opens a details panel fetched from the real endpoint when a card triggers it', async () => {
    mockedGetPlace.mockResolvedValue(detail)
    renderDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    expect(mockedGetPlace).toHaveBeenCalledWith('plc_001')

    expect(await screen.findByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Place details' })).toBeInTheDocument()
    expect(screen.getByText(/friendly backpacker hostel/)).toBeInTheDocument()
    expect(screen.getByText('17, 5th Block, Koramangala, Bengaluru 560095')).toBeInTheDocument()
    expect(screen.getByText('food')).toBeInTheDocument()
    expect(screen.getByText('Open 24 hours')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Directions' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=12.9352,77.6245',
    )
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute(
      'href',
      'tel:+919900012345',
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('closes on the close button and hides the dialog', async () => {
    mockedGetPlace.mockResolvedValue(detail)
    renderDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    await screen.findByText('Zostel Koramangala')

    fireEvent.click(screen.getByRole('button', { name: 'Close place details' }))
    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Place details' })).toBeNull()
    })
  })

  it('shows a friendly fallback when the detail request fails', async () => {
    mockedGetPlace.mockRejectedValue(new Error('network'))
    renderDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    expect(await screen.findByText(/We couldn't load these details right now\./)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Place details' })).toBeInTheDocument()
  })

  it('refetches the detail when Try Again is clicked after a failure', async () => {
    mockedGetPlace.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(detail)
    renderDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    await screen.findByText(/We couldn't load these details right now\./)

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByText('Zostel Koramangala')).toBeInTheDocument()
    expect(mockedGetPlace).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(/We couldn't load these details right now\./)).toBeNull()
  })

  it('uses a bottom sheet on mobile and a right drawer on desktop', async () => {
    mockedGetPlace.mockResolvedValue(detail)

    const { unmount } = renderDetails()
    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    await screen.findByText('Zostel Koramangala')
    expect(screen.getByRole('dialog', { name: 'Place details' }).className).toContain('rounded-t-2xl')
    unmount()
    cleanup()

    window.matchMedia = (query: string) =>
      ({
        matches: query.includes('min-width: 768px'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList

    renderDetails()
    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    await screen.findByText('Zostel Koramangala')
    expect(screen.getByRole('dialog', { name: 'Place details' }).className).toContain('max-w-md')

    window.matchMedia = originalMatchMedia
  })
})
