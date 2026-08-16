import { useEffect } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useChat } from '../../context/ChatContext'
import { ChatProvider } from '../../context/ChatContext'
import { restoreGeolocation, stubGeolocation } from '../../test/geolocation'
import { LocationIndicator } from './LocationIndicator'

/*
 * jsdom lacks geolocation, so device-capture assertions stub it; the "no
 * location" assertions rely on the real jsdom (supported=false, non-fatal).
 */

function WithLocation({ children }: { children: ReactNode }) {
  const { setLocation } = useChat()
  useEffect(() => {
    setLocation({ lat: 26.9, lng: 80.9 })
  }, [setLocation])
  return <>{children}</>
}

function renderIndicator(location: boolean) {
  const inner = <LocationIndicator />
  return render(<ChatProvider>{location ? <WithLocation>{inner}</WithLocation> : inner}</ChatProvider>)
}

afterEach(() => {
  cleanup()
  restoreGeolocation()
  vi.clearAllMocks()
})

describe('LocationIndicator (Phase 7E — editable location, §8 / §9)', () => {
  it('shows the device-location label when a location is captured', () => {
    renderIndicator(true)
    expect(screen.getByRole('button', { name: /Using current location/ })).toBeInTheDocument()
    expect(screen.getByText('Change')).toBeInTheDocument()
  })

  it('shows a set-location label when no location is available', () => {
    renderIndicator(false)
    expect(screen.getByRole('button', { name: /Set location/ })).toBeInTheDocument()
  })

  it('applies a manual city override which takes precedence over the device location', () => {
    renderIndicator(true)
    fireEvent.click(screen.getByRole('button', { name: /Using current location/ }))
    expect(screen.getByRole('dialog', { name: 'Change location' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('City or area'), { target: { value: 'Lucknow' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply manual location' }))

    expect(screen.getByRole('button', { name: /Location: Lucknow/ })).toBeInTheDocument()
  })

  it('clears a manual override and falls back to the device location', () => {
    renderIndicator(true)
    fireEvent.click(screen.getByRole('button', { name: /Using current location/ }))
    fireEvent.change(screen.getByLabelText('City or area'), { target: { value: 'Lucknow' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply manual location' }))
    expect(screen.getByRole('button', { name: /Location: Lucknow/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Location: Lucknow/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear manual location' }))

    expect(screen.getByRole('button', { name: /Using current location/ })).toBeInTheDocument()
  })

  it('requests the device location from the dropdown', async () => {
    renderIndicator(false)
    fireEvent.click(screen.getByRole('button', { name: /Set location/ }))
    stubGeolocation({ lat: 12.9, lng: 77.6 })
    fireEvent.click(screen.getByRole('button', { name: 'Use my current location' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Using current location/ })).toBeInTheDocument(),
    )
  })

  it('closes the dropdown on Escape', () => {
    renderIndicator(true)
    fireEvent.click(screen.getByRole('button', { name: /Using current location/ }))
    expect(screen.getByRole('dialog', { name: 'Change location' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Change location' })).not.toBeInTheDocument()
  })
})
