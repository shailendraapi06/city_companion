import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../context/AuthContext'
import { AppRoutes } from '../../routes/AppRoutes'

vi.mock('../../lib/api/client', () => ({
  getStoredAccessToken: () => null,
  getStoredRefreshToken: () => null,
  setStoredTokens: () => {},
  clearStoredTokens: () => {},
  getMeApi: async () => {
    throw new Error('no session')
  },
  loginApi: async () => {
    throw new Error('no session')
  },
  registerApi: async () => {
    throw new Error('no session')
  },
  refreshApi: async () => {
    throw new Error('no session')
  },
  logoutApi: async () => ({ success: true, data: null, error: null }),
  ApiError: class ApiError extends Error {},
}))

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING

afterEach(() => {
  cleanup()
})

describe('Phase 6B — landing page sections', () => {
  it('renders exactly the six sections, in order', async () => {
    renderAt('/')

    const hero = await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })
    const howItWorks = screen.getByRole('heading', { name: /From “I need a place” to a plan in seconds/ })
    const liveDemo = screen.getByRole('heading', { name: /This is what an answer actually looks like/ })
    const featureStrip = screen.getByText('Budget-aware')
    const contact = screen.getByRole('heading', { name: /Found something out of date/ })
    const footer = screen.getByRole('contentinfo')

    expect(hero.compareDocumentPosition(howItWorks) & FOLLOWING).toBeTruthy()
    expect(howItWorks.compareDocumentPosition(liveDemo) & FOLLOWING).toBeTruthy()
    expect(liveDemo.compareDocumentPosition(featureStrip) & FOLLOWING).toBeTruthy()
    expect(featureStrip.compareDocumentPosition(contact) & FOLLOWING).toBeTruthy()
    expect(contact.compareDocumentPosition(footer) & FOLLOWING).toBeTruthy()
  })

  it('shows the How it works steps (Tell us → We understand → We find → You decide)', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    const stepTitles = ['Tell us', 'We understand', 'We find', 'You decide']
    for (const title of stepTitles) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
  })

  it('shows the live example mock conversation with ranked place cards', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    expect(screen.getByText('Here are 3 good matches for you')).toBeInTheDocument()
    expect(screen.getByText('Shyam PG & Mess')).toBeInTheDocument()
    expect(screen.getByText('Green Residency PG')).toBeInTheDocument()
    expect(screen.getByText('Swastik Boys PG')).toBeInTheDocument()
    expect(screen.getByText('#1 Best match')).toBeInTheDocument()
    expect(screen.getAllByText(/Verified listing/).length).toBeGreaterThan(0)
  })

  it('shows the four-item feature strip, not a feature grid', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    for (const label of ['Budget-aware', 'Location-aware', 'Personalized', 'Actionable']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows the minimal contact section with a mailto link and no separate page', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    const mailto = screen.getByRole('link', { name: 'hello@citycompanion.app' })
    expect(mailto).toHaveAttribute('href', 'mailto:hello@citycompanion.app')
  })

  it('does not introduce corporate sections (About/Services/Blog/Team/Gallery/FAQ)', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    for (const text of ['About', 'Services', 'Blog', 'Team', 'Gallery', 'FAQ']) {
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    }
  })
})

describe('Phase 6B — navigation', () => {
  it('Start Exploring links to /chat', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    expect(screen.getByRole('link', { name: /Start Exploring/ })).toHaveAttribute('href', '/chat')
  })

  it('routes Start Exploring through the auth guard to /login for guests', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    fireEvent.click(screen.getByRole('link', { name: /Start Exploring/ }))
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('nav links target the in-page section anchors', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    const howItWorks = screen.getAllByRole('link', { name: 'How It Works' })[0]
    const contact = screen.getAllByRole('link', { name: 'Contact' })[0]
    expect(howItWorks).toHaveAttribute('href', '/#how-it-works')
    expect(contact).toHaveAttribute('href', '/#contact')
  })

  it('wires the How It Works and Contact sections to their anchor ids', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: /Every new city deserves a familiar friend/ })

    expect(document.getElementById('how-it-works')).not.toBeNull()
    expect(document.getElementById('contact')).not.toBeNull()
  })
})
