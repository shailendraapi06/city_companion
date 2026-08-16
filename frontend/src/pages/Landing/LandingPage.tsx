import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="anim-fade-up max-w-xl space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
          <span className="text-gradient">City Companion</span>
        </h1>
        <p className="text-lg text-text-secondary">Every new city deserves a familiar friend.</p>

        <div className="flex items-center justify-center gap-4 pt-4">
          {isAuthenticated ? (
            <Link to="/chat" className="btn-primary">
              Go to Chat
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-primary">
                Sign In
              </Link>
              <Link to="/signup" className="btn-secondary">
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
