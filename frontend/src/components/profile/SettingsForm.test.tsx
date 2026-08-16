import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatProvider } from '../../context/ChatContext'
import { deleteConversation, listConversations } from '../../lib/api/conversations'
import { deleteAccountApi } from '../../lib/api/client'
import type { Conversation, User, UserProfileUpdate } from '../../types'
import { SettingsForm } from './SettingsForm'
import type { useMutation } from '@tanstack/react-query'

const authMocks = vi.hoisted(() => ({
  resetSession: vi.fn(),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ resetSession: authMocks.resetSession }),
}))

vi.mock('../../lib/api/conversations', () => ({
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
}))

vi.mock('../../lib/api/client', () => ({
  deleteAccountApi: vi.fn(),
}))

const mockedList = vi.mocked(listConversations)
const mockedDelete = vi.mocked(deleteConversation)
const mockedDeleteAccount = vi.mocked(deleteAccountApi)

type SaveProfile = ReturnType<typeof useMutation<User, Error, UserProfileUpdate>>

const conversation: Conversation = {
  id: 'conv-1',
  title: 'Need a PG near college',
  city: 'Bengaluru',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function stubSaveProfile(overrides: Partial<SaveProfile> = {}) {
  const mutate = vi.fn()
  const saveProfile = {
    mutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...overrides,
  } as unknown as SaveProfile
  return { mutate, saveProfile }
}

function renderForm(saveProfile: SaveProfile) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ChatProvider>
        <MemoryRouter>
          <SettingsForm saveProfile={saveProfile} />
        </MemoryRouter>
      </ChatProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  authMocks.resetSession.mockClear()
  vi.clearAllMocks()
})

describe('SettingsForm (Phase 7E — §10.3)', () => {
  it('saves the chosen language through the shared profile PATCH', () => {
    const { mutate, saveProfile } = stubSaveProfile()
    renderForm(saveProfile)

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'Hindi' } })
    expect(mutate).toHaveBeenCalledWith({ language: 'Hindi' })
  })

  it('lists real conversations and deletes one behind an inline confirm', async () => {
    mockedList.mockResolvedValue({ results: [conversation], count: 1, page: 1, page_size: 50, total_pages: 1 })
    mockedDelete.mockResolvedValue(null)
    const { saveProfile } = stubSaveProfile()
    renderForm(saveProfile)

    expect(await screen.findByText('Need a PG near college')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Sure?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('conv-1'))
  })

  it('lets the user cancel a pending conversation deletion', async () => {
    mockedList.mockResolvedValue({ results: [conversation], count: 1, page: 1, page_size: 50, total_pages: 1 })
    const { saveProfile } = stubSaveProfile()
    renderForm(saveProfile)

    await screen.findByText('Need a PG near college')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockedDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('deletes the account only after typing DELETE, then resets the session', async () => {
    const { saveProfile } = stubSaveProfile()
    renderForm(saveProfile)

    const deleteButton = screen.getByRole('button', { name: 'Delete account' })
    expect(deleteButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Type DELETE/), { target: { value: 'DELETE' } })
    expect(deleteButton).not.toBeDisabled()

    fireEvent.click(deleteButton)
    await waitFor(() => expect(mockedDeleteAccount).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(authMocks.resetSession).toHaveBeenCalledTimes(1))
  })

  it('keeps account deletion disabled until the confirmation text matches', () => {
    const { saveProfile } = stubSaveProfile()
    renderForm(saveProfile)

    fireEvent.change(screen.getByLabelText(/Type DELETE/), { target: { value: 'DELETE NOW' } })
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled()
  })
})
