import { useEffect, useState } from 'react'
import type { ChatLocation } from '../types'

interface GeolocationState {
  location: ChatLocation | null
  error: string | null
  supported: boolean
}

/*
 * Requests geolocation once on mount (Frontend_Architecture.md §6.4). The
 * browser permission prompt is only ever shown a single time; denial or lack
 * of support resolves to a non-error `supported: false` state so the chat
 * shell keeps working without location.
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({ location: null, error: null, supported: false })

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return
    }
    setState((prev) => ({ ...prev, supported: true }))
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          error: null,
          supported: true,
        })
      },
      (err) => {
        setState({ location: null, error: err.message, supported: true })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  return state
}
