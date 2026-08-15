import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export function ChatPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header with auth status */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
            CC
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">City Companion</h1>
            <p className="text-xs text-slate-400">Welcome, {user?.name ?? 'User'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-slate-400 sm:inline-block">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Chat Placeholder area for Phase 4 */}
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            💬
          </div>
          <h2 className="text-2xl font-bold text-white">City Companion Chat</h2>
          <p className="text-sm text-slate-400">
            Authenticated as <strong className="text-indigo-300">{user?.email}</strong>.
            Session is active and persisted across page reloads.
          </p>
          <div className="inline-block rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs text-slate-400">
            User ID: <span className="font-mono text-slate-300">{user?.id}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
