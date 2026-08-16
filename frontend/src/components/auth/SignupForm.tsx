import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api/client'

export function SignupForm() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    setSubmitError(null)

    if (!name.trim()) {
      setFieldError('Full name is required.')
      return
    }
    if (!email.trim()) {
      setFieldError('Email address is required.')
      return
    }
    if (!password) {
      setFieldError('Password is required.')
      return
    }
    if (password.length < 8) {
      setFieldError('Password must be at least 8 characters long.')
      return
    }

    setIsLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/chat')
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message)
      } else if (err instanceof Error) {
        setSubmitError(err.message)
      } else {
        setSubmitError('An unexpected error occurred during registration.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {submitError && (
        <div className="rounded-xl border border-error/30 bg-error/10 p-3.5 text-sm text-error" role="alert">
          {submitError}
        </div>
      )}

      {fieldError && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-sm text-warning" role="alert">
          {fieldError}
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="name">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rohit Sharma"
          disabled={isLoading}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="email">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="password">
          Password (min 8 chars)
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          className="field-input"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="pt-2 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent-1 hover:text-accent-1/80">
          Sign in
        </Link>
      </p>
    </form>
  )
}
