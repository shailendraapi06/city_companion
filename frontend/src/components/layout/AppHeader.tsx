import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { Brand } from './Brand'

interface AppHeaderProps {
  onOpenDrawer: () => void
}

export function AppHeader({ onOpenDrawer }: AppHeaderProps) {
  const { user } = useAuth()
  const { location, locationOverride } = useChat()
  const initials = (user?.name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  const locationLabel = locationOverride ?? (location ? 'Using current location' : 'Kanpur')

  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="btn-ghost px-2.5 lg:hidden"
            aria-label="Open menu"
            aria-haspopup="dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/chat" aria-label="City Companion" className="transition-opacity hover:opacity-85">
            <Brand />
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            title="Current city — geolocation and manual override arrive with chat wiring (Phase 7)"
            className="hidden items-center gap-1.5 rounded-full border border-border bg-bg-2 px-3 py-1.5 text-xs font-medium text-text-secondary md:inline-flex"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 text-accent-1"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {locationLabel}
          </span>

          <Link to="/chat" className="btn-ghost">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">New Chat</span>
          </Link>

          <Link
            to="/profile"
            aria-label="Profile"
            className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-bg-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent-1 to-accent-2 text-xs font-bold text-[#081018]">
              {initials}
            </span>
            <span className="hidden max-w-32 truncate text-sm font-medium text-text-primary md:inline">
              {user?.name ?? 'User'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
