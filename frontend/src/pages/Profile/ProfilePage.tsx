import { useAuth } from '../../context/AuthContext'

export function ProfilePage() {
  const { user } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-slate-100">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>
      <p className="mt-2 text-sm text-slate-400">Authenticated user: {user?.email}</p>
    </div>
  )
}
