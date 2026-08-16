import { Link, useNavigate } from 'react-router-dom'
import { ProfileForm } from '../../components/profile/ProfileForm'
import { SettingsForm } from '../../components/profile/SettingsForm'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../hooks/useProfile'

/*
 * Profile & Settings (UI_UX_Brief.md §10.1 / §10.3). Reads the real
 * GET /api/auth/me/ into ['me'] (AuthContext already hydrates it on login),
 * then owns the single shared PATCH mutation both forms reuse. Keep this page
 * genuinely small — everything beyond identity + prefs lives elsewhere.
 */
export function ProfilePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { user, isLoading, isError, refetch, saveProfile } = useProfile()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-text-primary">Profile &amp; Settings</h1>
      <p className="mt-2 text-sm text-text-secondary">
        {isLoading ? 'Loading your profile…' : `Signed in as ${user?.email ?? 'you'}.`}
      </p>

      <div className="mt-8 grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="field-label">Profile</h2>
            {isError ? (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-sm text-text-secondary">Couldn't load your profile.</p>
                <button type="button" onClick={refetch} className="btn-ghost">
                  Try Again
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <ProfileForm user={user} saveProfile={saveProfile} />
              </div>
            )}
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

        <SettingsForm saveProfile={saveProfile} />
      </div>
    </div>
  )
}
