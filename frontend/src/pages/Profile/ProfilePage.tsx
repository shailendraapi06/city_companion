import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/*
 * Profile & Settings (UI_UX_Brief.md §10.1) — reads the current user hydrated
 * from the real GET /api/auth/me/ endpoint in AuthContext. Write actions
 * (preferences update, delete conversations/account) arrive with later phases.
 */
export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const profile = user?.profile ?? null

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-text-primary">Profile &amp; Settings</h1>
      <p className="mt-2 text-sm text-text-secondary">Signed in as {user?.email}.</p>

      <div className="mt-8 max-w-md space-y-6">
        <section className="card-surface p-5">
          <h2 className="field-label">Account</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-text-tertiary">Name</dt>
              <dd className="text-text-primary">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Email</dt>
              <dd className="text-text-primary">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Preferred city</dt>
              <dd className="text-text-primary">{profile?.preferred_city ?? 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Language</dt>
              <dd className="text-text-primary">{profile?.language ?? 'English'}</dd>
            </div>
          </dl>
        </section>

        <nav className="flex flex-col gap-1" aria-label="Quick links">
          <Link to="/saved" className="nav-link flex items-center gap-2">
            Saved Places
          </Link>
          <Link to="/chat" className="nav-link flex items-center gap-2">
            Chat History
          </Link>
        </nav>

        <button type="button" onClick={handleLogout} className="btn-secondary w-full">
          Log Out
        </button>
      </div>
    </div>
  )
}
