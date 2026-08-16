import { useAuth } from '../../context/AuthContext'

export function ChatPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-1/20 bg-accent-1/10 text-xl text-accent-1">
          💬
        </div>
        <h2 className="text-2xl font-bold text-text-primary">City Companion Chat</h2>
        <p className="text-sm text-text-secondary">
          Authenticated as <strong className="text-accent-1">{user?.email}</strong>. Session is active and
          persisted across page reloads.
        </p>
        <div className="inline-block rounded-xl border border-border bg-bg-2 px-4 py-2 text-xs text-text-tertiary">
          User ID: <span className="font-mono text-text-secondary">{user?.id}</span>
        </div>
      </div>
    </div>
  )
}
