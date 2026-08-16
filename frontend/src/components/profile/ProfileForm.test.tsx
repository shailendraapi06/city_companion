import type { useMutation } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User, UserProfileUpdate } from '../../types'
import { ProfileForm } from './ProfileForm'

type SaveProfile = ReturnType<typeof useMutation<User, Error, UserProfileUpdate>>

const user: User = {
  id: 'u-1',
  name: 'Rohit Sharma',
  email: 'rohit@example.com',
  profile: { preferred_city: 'Bengaluru', language: 'English' },
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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProfileForm (Phase 7E — PATCH /api/auth/me/)', () => {
  it('prefills name, email and preferred city from the user', () => {
    const { saveProfile } = stubSaveProfile()
    render(<ProfileForm user={user} saveProfile={saveProfile} />)
    expect(screen.getByLabelText('Full name')).toHaveValue('Rohit Sharma')
    expect(screen.getByLabelText('Email')).toHaveValue('rohit@example.com')
    expect(screen.getByLabelText('Preferred city')).toHaveValue('Bengaluru')
  })

  it('submits the edited profile through the real PATCH endpoint body', () => {
    const { mutate, saveProfile } = stubSaveProfile()
    render(<ProfileForm user={user} saveProfile={saveProfile} />)

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Rohit S' } })
    fireEvent.change(screen.getByLabelText('Preferred city'), { target: { value: '  Lucknow  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(mutate).toHaveBeenCalledWith({ name: 'Rohit S', preferred_city: 'Lucknow' })
  })

  it('does not submit an empty name', () => {
    const { mutate, saveProfile } = stubSaveProfile()
    render(<ProfileForm user={user} saveProfile={saveProfile} />)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows the saved confirmation after a successful patch', () => {
    const { saveProfile } = stubSaveProfile({ isSuccess: true })
    render(<ProfileForm user={user} saveProfile={saveProfile} />)
    expect(screen.getByRole('status')).toHaveTextContent('Profile saved.')
  })

  it('shows an error when the patch fails', () => {
    const { saveProfile } = stubSaveProfile({ isError: true, error: new Error('Server error') })
    render(<ProfileForm user={user} saveProfile={saveProfile} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't save your profile/)
  })
})
