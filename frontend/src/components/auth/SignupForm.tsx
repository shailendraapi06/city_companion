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
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-400" role="alert">
          {submitError}
        </div>
      )}

      {fieldError && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-sm text-amber-400" role="alert">
          {fieldError}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="name">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rohit Sharma"
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="email">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="password">
          Password (min 8 chars)
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 transition-all cursor-pointer"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="text-center text-sm text-slate-400 pt-2">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}
