import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api/client'

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    setSubmitError(null)

    if (!email.trim()) {
      setFieldError('Email address is required.')
      return
    }
    if (!password) {
      setFieldError('Password is required.')
      return
    }

    setIsLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/chat')
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message)
      } else if (err instanceof Error) {
        setSubmitError(err.message)
      } else {
        setSubmitError('An unexpected error occurred during login.')
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
          Password
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
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <p className="pt-2 text-center text-sm text-text-secondary">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-accent-1 hover:text-accent-1/80">
          Create one now
        </Link>
      </p>
    </form>
  )
}
