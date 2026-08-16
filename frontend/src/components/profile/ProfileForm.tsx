import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { User, UserProfileUpdate } from '../../types'

interface ProfileFormProps {
  user: User | undefined
  saveProfile: ReturnType<typeof useMutation<User, Error, UserProfileUpdate>>
}

/*
 * Profile editor (UI_UX_Brief.md §10.1): name + preferred city, patched to the
 * real PATCH /api/auth/me/ endpoint. Email is shown read-only (identity field —
 * changing it is out of scope for the MVP). The parent owns the mutation so the
 * same cache/context sync (`['me']` + AuthContext.updateUser) is reused by the
 * SettingsForm language control.
 */
export function ProfileForm({ user, saveProfile }: ProfileFormProps) {
  const [name, setName] = useState(user?.name ?? '')
  const [preferredCity, setPreferredCity] = useState(user?.profile?.preferred_city ?? '')

  useEffect(() => {
    if (user) {
      setName(user.name)
      setPreferredCity(user.profile?.preferred_city ?? '')
    }
  }, [user])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    saveProfile.mutate({
      name: trimmedName,
      preferred_city: preferredCity.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="profile-name">
          Full name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={saveProfile.isPending}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="profile-email">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          value={user?.email ?? ''}
          disabled
          readOnly
          className="field-input cursor-not-allowed opacity-60"
        />
        <p className="mt-1 text-xs text-text-tertiary">Email is your identity and can't be changed in the app.</p>
      </div>

      <div>
        <label className="field-label" htmlFor="profile-city">
          Preferred city
        </label>
        <input
          id="profile-city"
          type="text"
          value={preferredCity}
          onChange={(event) => setPreferredCity(event.target.value)}
          placeholder="e.g. Bengaluru"
          disabled={saveProfile.isPending}
          className="field-input"
        />
        <p className="mt-1 text-xs text-text-tertiary">Used as the default search city when location isn't available.</p>
      </div>

      {saveProfile.isSuccess ? (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success" role="status">
          Profile saved.
        </p>
      ) : null}

      {saveProfile.isError ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          Couldn't save your profile. {saveProfile.error instanceof Error ? saveProfile.error.message : ''}
        </p>
      ) : null}

      <button type="submit" disabled={saveProfile.isPending} className="btn-primary w-full">
        {saveProfile.isPending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
