import { useAuth } from '../../context/AuthContext'

export function SavedPlacesPage() {
  const { user } = useAuth()
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-text-primary">My Saved Places</h1>
      <p className="mt-2 text-sm text-text-secondary">Authenticated user: {user?.email}</p>
    </div>
  )
}
