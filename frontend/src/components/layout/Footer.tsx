import { Link } from 'react-router-dom'
import { Brand } from './Brand'

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-1/50">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Brand />
          <p className="text-xs text-text-tertiary">Every new city deserves a familiar friend.</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/#how-it-works" className="text-text-secondary transition-colors hover:text-text-primary">
            How It Works
          </Link>
          <Link to="/#contact" className="text-text-secondary transition-colors hover:text-text-primary">
            Contact
          </Link>
          <Link to="/login" className="text-text-secondary transition-colors hover:text-text-primary">
            Log in
          </Link>
          <Link to="/signup" className="text-text-secondary transition-colors hover:text-text-primary">
            Sign up
          </Link>
        </nav>

        <p className="text-xs text-text-tertiary">© {new Date().getFullYear()} City Companion</p>
      </div>
    </footer>
  )
}
