import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SavedPlace } from '../../types'
import { listSavedPlaces } from '../../lib/api/savedPlaces'
import { unsavePlace } from '../../lib/api/places'
import { SavedPlacesPage } from './SavedPlacesPage'

vi.mock('../../lib/api/savedPlaces', () => ({
  listSavedPlaces: vi.fn(),
}))

vi.mock('../../lib/api/places', () => ({
  savePlace: vi.fn(),
  unsavePlace: vi.fn(),
}))

const mockedList = vi.mocked(listSavedPlaces)
const mockedUnsave = vi.mocked(unsavePlace)

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

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SavedPlacesPage />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SavedPlacesPage (Phase 6D — real data from GET /api/saved-places/)', () => {
  it('renders saved places grouped by category', async () => {
    mockedList.mockResolvedValue({ results: savedPlaces, count: 2, page: 1, page_size: 20, total_pages: 1 })
    renderPage()
    expect(await screen.findByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.getByText('Cafe Coffee Day')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hostel' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cafe' })).toBeInTheDocument()
    expect(screen.getByText('₹700/night')).toBeInTheDocument()
  })

  it('shows the empty state when there are no saved places', async () => {
    mockedList.mockResolvedValue({ results: [], count: 0, page: 1, page_size: 20, total_pages: 1 })
    renderPage()
    expect(await screen.findByText(/No saved places yet/)).toBeInTheDocument()
  })

  it('shows an error state with Try Again when the request fails', async () => {
    mockedList.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('filters saved places by category through the real ?category= query', async () => {
    mockedList.mockImplementation(async (category?: string) => {
      if (category === 'Hostel') {
        return { results: [savedPlaces[0]], count: 1, page: 1, page_size: 20, total_pages: 1 }
      }
      return { results: savedPlaces, count: 2, page: 1, page_size: 20, total_pages: 1 }
    })
    renderPage()
    await screen.findByText('Zostel Koramangala')

    fireEvent.click(screen.getByRole('button', { name: 'Hostel' }))
    await waitFor(() => expect(mockedList).toHaveBeenCalledWith('Hostel'))
    expect(await screen.findByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.queryByText('Cafe Coffee Day')).not.toBeInTheDocument()
  })

  it('unsaves a place through the real DELETE endpoint from the card', async () => {
    mockedList.mockResolvedValue({ results: savedPlaces, count: 2, page: 1, page_size: 20, total_pages: 1 })
    mockedUnsave.mockResolvedValue(null)
    renderPage()
    await screen.findByText('Zostel Koramangala')

    fireEvent.click(screen.getAllByRole('button', { name: 'Saved' })[0])
    await waitFor(() => expect(mockedUnsave).toHaveBeenCalledWith('plc_001'))
  })
})
