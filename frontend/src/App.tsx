import { useEffect, useState } from 'react'

import { ApiError, getHealth } from './lib/api/client'
import { AppRoutes } from './routes/AppRoutes'

type ConnectionState = 'checking' | 'connected' | 'failed'

function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    void getHealth().then(() => setConnectionState('connected')).catch((error: unknown) => {
      setConnectionState('failed')
      setErrorMessage(error instanceof ApiError ? error.message : 'Unable to reach the backend.')
    })
  }, [])

  return <main className="connection-check" aria-live="polite"><p>Backend connection: {connectionState}</p>{errorMessage && <p role="alert">{errorMessage}</p>}<AppRoutes /></main>
}

export default App
