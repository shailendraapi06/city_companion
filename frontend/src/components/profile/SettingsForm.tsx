import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { useConversationsList } from '../../hooks/useConversationsList'
import { deleteAccountApi } from '../../lib/api/client'
import type { User, UserProfileUpdate } from '../../types'

interface SettingsFormProps {
  saveProfile: ReturnType<typeof useMutation<User, Error, UserProfileUpdate>>
}

const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Hinglish'] as const

/*
 * Settings (UI_UX_Brief.md §10.3 — "kept small"): theme (dark is default),
 * language, location permission, notifications (deferred), delete conversations
 * (real DELETE /api/conversations/{id}/ with an inline confirm), and account
 * deletion (real DELETE /api/auth/me/ behind a type-to-confirm gate).
 */
export function SettingsForm({ saveProfile }: SettingsFormProps) {
  const { resetSession } = useAuth()
  const { location, locationOverride, locationError, locationSupported, requestLocation, setLocationOverride } =
    useChat()
  const { conversations, isLoading, isError, refetch, deleteConversation, deletingId, deleteError } =
    useConversationsList()
  const navigate = useNavigate()

  const [language, setLanguage] = useState<string>('English')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleteAccountText, setDeleteAccountText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)

  const applyLanguage = (value: string) => {
    setLanguage(value)
    saveProfile.mutate({ language: value })
  }

  const handleConfirmDelete = (id: string) => {
    setConfirmId(id)
  }

  const handleDeleteAccount = async () => {
    if (deleteAccountText !== 'DELETE') return
    setDeletingAccount(true)
    setDeleteAccountError(null)
    try {
      await deleteAccountApi()
      resetSession()
      navigate('/')
    } catch {
      setDeleteAccountError("Something went wrong — we couldn't delete your account. Please try again.")
      setDeletingAccount(false)
    }
  }

  const locationStatus = locationOverride
    ? `Searching in ${locationOverride} until you change it.`
    : location
      ? "Using your device's current location."
      : locationError || !locationSupported
        ? 'Location unavailable. Set a manual city instead.'
        : 'Requesting your location…'

  return (
    <div className="space-y-6">
      <section className="card-surface p-5">
        <h2 className="field-label">Preferences</h2>
        <div className="mt-3 space-y-4">
          <div>
            <label className="field-label" htmlFor="settings-theme">
              Theme
            </label>
            <select id="settings-theme" disabled className="field-input cursor-not-allowed">
              <option value="dark">Dark (default)</option>
            </select>
            <p className="mt-1 text-xs text-text-tertiary">Dark is the default look of City Companion.</p>
          </div>

          <div>
            <label className="field-label" htmlFor="settings-language">
              Language
            </label>
            <select
              id="settings-language"
              value={language}
              onChange={(event) => applyLanguage(event.target.value)}
              disabled={saveProfile.isPending}
              className="field-input"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-tertiary">
              Responses will prefer this language when it's supported.
              {saveProfile.isSuccess ? ' Saved.' : ''}
            </p>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="field-label">Location</h2>
        <p className="mt-2 text-sm text-text-secondary">{locationStatus}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={requestLocation} className="btn-secondary">
            Use my current location
          </button>
          {locationOverride ? (
            <button type="button" onClick={() => setLocationOverride(null)} className="btn-ghost">
              Clear manual location
            </button>
          ) : null}
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="field-label">Notifications</h2>
            <p className="mt-1 text-xs text-text-tertiary">Alerts for saved places, deals and reminders.</p>
          </div>
          <input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed" aria-label="Enable notifications" />
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="field-label">Delete conversations</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Removes a conversation and its messages. This can't be undone.
        </p>

        {deleteError ? (
          <p className="mt-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
            Couldn't delete that conversation. Please try again.
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-text-tertiary">Loading conversations…</p>
          ) : isError ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-text-secondary">Couldn't load conversations.</p>
              <button type="button" onClick={refetch} className="btn-ghost">
                Try Again
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-text-tertiary">No conversations to delete.</p>
          ) : (
            <ul className="space-y-2">
              {conversations.map((conversation) => {
                const isConfirming = confirmId === conversation.id
                const isDeleting = deletingId === conversation.id
                return (
                  <li
                    key={conversation.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-1 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {conversation.title ?? `Conversation from ${conversation.created_at.slice(0, 10)}`}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {conversation.city ?? 'City not set'} · {conversation.created_at.slice(0, 10)}
                      </p>
                    </div>
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">Sure?</span>
                        <button
                          type="button"
                          onClick={() => deleteConversation(conversation.id)}
                          disabled={isDeleting}
                          className="btn-danger px-3 py-1 text-xs"
                        >
                          {isDeleting ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="btn-ghost">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => handleConfirmDelete(conversation.id)} className="btn-ghost">
                        Delete
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="card-surface border-error/30 p-5">
        <h2 className="field-label text-error">Delete account</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
          Permanently deletes your account, saved places and all conversations. This can't be undone.
        </p>
        <div className="mt-3">
          <label className="field-label" htmlFor="delete-account-confirm">
            Type <span className="font-semibold text-error">DELETE</span> to confirm
          </label>
          <input
            id="delete-account-confirm"
            type="text"
            value={deleteAccountText}
            onChange={(event) => setDeleteAccountText(event.target.value)}
            placeholder="DELETE"
            disabled={deletingAccount}
            className="field-input"
          />
        </div>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleteAccountText !== 'DELETE' || deletingAccount}
          className="btn-danger mt-3 w-full"
        >
          {deletingAccount ? 'Deleting account…' : 'Delete account'}
        </button>
        {deleteAccountError ? (
          <p className="mt-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
            {deleteAccountError}
          </p>
        ) : null}
      </section>
    </div>
  )
}
