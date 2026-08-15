import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <div className="max-w-xl space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          City Companion
        </h1>
        <p className="text-lg text-slate-400">
          Every new city deserves a familiar friend.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          {isAuthenticated ? (
            <Link
              to="/chat"
              className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25"
            >
              Go to Chat Engine
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
