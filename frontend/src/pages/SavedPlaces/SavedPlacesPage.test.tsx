import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SavedPlace } from '../../types'
import { listSavedPlaces } from '../../lib/api/savedPlaces'
import { SavedPlacesPage } from './SavedPlacesPage'

vi.mock('../../lib/api/savedPlaces', () => ({
  listSavedPlaces: vi.fn(),
}))

const mockedList = vi.mocked(listSavedPlaces)

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
})
