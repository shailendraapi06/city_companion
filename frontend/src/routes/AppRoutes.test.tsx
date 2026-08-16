/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { AppRoutes } from './AppRoutes'

interface TestUser {
  id: string
  name: string
  email: string
}

const authState = vi.hoisted(() => {
  let user: TestUser | null = null
  return {
    setSession: (u: TestUser) => {
      user = u
    },
    clearSession: () => {
      user = null
    },
    getUser: () => user,
    hasAccess: () => user !== null,
  }
})

vi.mock('../lib/api/client', () => ({
  getStoredAccessToken: () => (authState.hasAccess() ? 'access-token' : null),
  getStoredRefreshToken: () => (authState.hasAccess() ? 'refresh-token' : null),
  setStoredTokens: () => {},
  clearStoredTokens: () => authState.clearSession(),
  getMeApi: async () => {
    const u = authState.getUser()
    if (!u) throw new Error('no session')
    return u
  },
  loginApi: async () => ({ user: authState.getUser(), access_token: 'a', refresh_token: 'r' }),
  registerApi: async () => ({ user: authState.getUser(), access_token: 'a', refresh_token: 'r' }),
  refreshApi: async () => ({ access_token: 'a' }),
  logoutApi: async () => ({ success: true, data: null, error: null }),
  ApiError: class ApiError extends Error {},
}))

const user: TestUser = { id: 'u-1', name: 'Rohit Sharma', email: 'rohit@example.com' }

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

afterEach(() => {
  cleanup()
  authState.clearSession()
})

describe('Phase 6A — routing & auth guards', () => {
  it('renders / under PublicLayout for guests', async () => {
    authState.clearSession()
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'City Companion' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('renders /login under PublicLayout for guests', async () => {
    authState.clearSession()
    renderAt('/login')
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
  })

  it('redirects unauthenticated visitors away from /chat to /login', async () => {
    authState.clearSession()
    renderAt('/chat')
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('redirects authenticated users from /login to /chat', async () => {
    authState.setSession(user)
    renderAt('/login')
    expect(await screen.findByText(/rohit@example\.com/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument()
  })

  it('redirects unauthenticated visitors away from /saved', async () => {
    authState.clearSession()
    renderAt('/saved')
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('redirects unauthenticated visitors away from /profile', async () => {
    authState.clearSession()
    renderAt('/profile')
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('renders the AppLayout shell for /chat when authenticated', async () => {
    authState.setSession(user)
    renderAt('/chat')
    expect(await screen.findByText(/rohit@example\.com/)).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getAllByText('Conversations').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'New Chat' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Saved Places' }).length).toBeGreaterThan(0)
  })

  it('renders /chat/:conversationId when authenticated', async () => {
    authState.setSession(user)
    renderAt('/chat/some-conversation')
    expect(await screen.findByText(/rohit@example\.com/)).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('renders /saved when authenticated', async () => {
    authState.setSession(user)
    renderAt('/saved')
    expect(await screen.findByRole('heading', { name: 'My Saved Places' })).toBeInTheDocument()
  })

  it('renders /profile when authenticated and offers logout', async () => {
    authState.setSession(user)
    renderAt('/profile')
    expect(await screen.findByRole('heading', { name: /Profile & Settings/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeInTheDocument()
  })

  it('sends unknown routes to the landing page', async () => {
    authState.clearSession()
    renderAt('/definitely-not-a-route')
    expect(await screen.findByRole('heading', { name: 'City Companion' })).toBeInTheDocument()
  })
})

describe('Phase 6A — mobile drawer', () => {
  it('opens via hamburger, closes via Escape', async () => {
    authState.setSession(user)
    renderAt('/chat')
    await screen.findByText(/rohit@example\.com/)

    const dialog = screen.getByRole('dialog', { name: 'App menu' })
    expect(dialog).toHaveAttribute('inert')

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(dialog).not.toHaveAttribute('inert')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(dialog).toHaveAttribute('inert')
  })

  it('closes when a nav link inside the drawer is clicked', async () => {
    authState.setSession(user)
    renderAt('/chat')
    await screen.findByText(/rohit@example\.com/)

    const dialog = screen.getByRole('dialog', { name: 'App menu' })
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(dialog).not.toHaveAttribute('inert')

    fireEvent.click(within(dialog).getByRole('link', { name: 'Saved Places' }))
    expect(dialog).toHaveAttribute('inert')
  })
})

describe('Phase 6A — motion system', () => {
  it('applies surface-specific motion defaults to both layouts', async () => {
    authState.clearSession()
    const { container } = renderAt('/')
    expect(container.querySelector('.app-shell.surface-landing')).not.toBeNull()
  })

  it('applies the subtle surface to the authenticated app shell', async () => {
    authState.setSession(user)
    const { container } = renderAt('/chat')
    await screen.findByText(/rohit@example\.com/)
    expect(container.querySelector('.app-shell.surface-subtle')).not.toBeNull()
  })

  it('honors prefers-reduced-motion with a single global media query', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-iteration-count: 1 !important')
    expect(css).toContain('transition-duration: 0.01ms !important')
    expect(css).toContain('animation-duration: 0.01ms !important')
  })
})
