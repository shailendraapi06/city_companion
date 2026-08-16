import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { savePlace } from '../../lib/api/places'
import type { Block } from '../../types'
import { PlaceActions } from './PlaceActions'

vi.mock('../../lib/api/places', () => ({
  getPlace: vi.fn(),
  savePlace: vi.fn(),
  unsavePlace: vi.fn(),
}))

const mockedSavePlace = vi.mocked(savePlace)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PlaceActions (Phase 7C — block mode)', () => {
  it('renders legacy string-list actions as chips with the block title', () => {
    const block: Block = {
      type: 'action',
      title: 'What next?',
      actions: ['view_details', 'directions', 'call', 'website', 'save'],
    }
    render(<PlaceActions block={block} />)

    expect(screen.getByText('What next?')).toBeInTheDocument()
    for (const label of ['view_details', 'directions', 'call', 'website', 'save']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('renders a payload-driven directions action as a maps deep link', () => {
    const block: Block = {
      type: 'action',
      title: 'Quick actions',
      label: 'Get directions',
      action_type: 'directions',
      payload: { latitude: 12.9352, longitude: 77.6245 },
    }
    render(<PlaceActions block={block} />)

    const link = screen.getByRole('link', { name: 'Get directions' })
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=12.9352,77.6245',
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders a payload-driven call action as a tel: link', () => {
    const block: Block = {
      type: 'action',
      title: 'Quick actions',
      label: 'Call the front desk',
      action_type: 'call',
      payload: { phone: '+91 99000 12345' },
    }
    render(<PlaceActions block={block} />)

    expect(screen.getByRole('link', { name: 'Call the front desk' })).toHaveAttribute(
      'href',
      'tel:+919900012345',
    )
  })

  it('renders a payload-driven save_place action wired to the real save endpoint', async () => {
    mockedSavePlace.mockResolvedValue({ id: 'sv-1', place_id: 'plc_001', created_at: '2026-01-01T00:00:00Z' })
    const block: Block = {
      type: 'action',
      title: 'Quick actions',
      label: 'Save this stay',
      action_type: 'save_place',
      payload: { place_id: 'plc_001' },
    }
    render(<PlaceActions block={block} />)

    const saveButton = screen.getByRole('button', { name: 'Save this stay' })
    fireEvent.click(saveButton)
    expect(mockedSavePlace).toHaveBeenCalledWith('plc_001')
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument()
    })
  })

  it('renders nothing for a block with no actions and no payload', () => {
    const { container } = render(<PlaceActions block={{ type: 'action' }} />)
    expect(container.textContent).toBe('')
  })
})
