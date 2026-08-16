import { Link } from 'react-router-dom'
import { Brand } from './Brand'

export function PublicNav() {
  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link to="/" aria-label="City Companion home" className="transition-opacity hover:opacity-85">
          <Brand />
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <Link to="/#how-it-works" className="nav-link">
            How It Works
          </Link>
          <Link to="/#contact" className="nav-link">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">
            Log in
          </Link>
          <Link to="/signup" className="btn-primary">
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  )
}
