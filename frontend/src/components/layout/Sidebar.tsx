import { Link, NavLink } from 'react-router-dom'

interface SidebarContentProps {
  onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/chat" onClick={onNavigate} className="btn-primary w-full">
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
        New Chat
      </Link>

      <section aria-label="Conversations">
        <h2 className="field-label px-1">Conversations</h2>
        <div className="rounded-xl border border-dashed border-border-strong bg-bg-1 p-3.5 text-xs leading-relaxed text-text-tertiary">
          No conversations yet.
          <br />
          Start one above — your history will appear here (Phase 7/8).
        </div>
      </section>

      <nav className="flex flex-col gap-1" aria-label="App">
        <NavLink
          to="/saved"
          onClick={onNavigate}
          className={({ isActive }) => `nav-link flex w-full items-center gap-2${isActive ? ' nav-link-active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
          </svg>
          Saved Places
        </NavLink>
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) => `nav-link flex w-full items-center gap-2${isActive ? ' nav-link-active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile &amp; Settings
        </NavLink>
      </nav>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-bg-1 lg:flex">
      <SidebarContent />
    </aside>
  )
}
