/*
 * jsdom has no navigator.geolocation, so Phase 7E location tests stub it with a
 * controllable implementation. `position` omitted → the error path runs, so
 * callers can exercise the denied/unavailable flow.
 */
export function stubGeolocation(position?: { lat: number; lng: number }): void {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (
        onSuccess: (position: { coords: { latitude: number; longitude: number } }) => void,
        onError?: (error: Error) => void,
      ) => {
        if (position) {
          onSuccess({ coords: { latitude: position.lat, longitude: position.lng } })
        } else if (onError) {
          onError(new Error('User denied geolocation'))
        }
      },
    },
  })
}

export function restoreGeolocation(): void {
  delete (navigator as { geolocation?: unknown }).geolocation
}
