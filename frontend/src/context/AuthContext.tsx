import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '../types'
import {
  clearStoredTokens,
  getMeApi,
  getStoredAccessToken,
  getStoredRefreshToken,
  loginApi,
  logoutApi,
  refreshApi,
  registerApi,
  setStoredTokens,
} from '../lib/api/client'

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateUser: (user: User) => void
  resetSession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function hydrateSession() {
      const storedAccess = getStoredAccessToken()
      const storedRefresh = getStoredRefreshToken()

      if (!storedAccess && !storedRefresh) {
        setIsLoading(false)
        return
      }

      try {
        if (storedAccess) {
          const userData = await getMeApi()
          setUser(userData)
          setAccessToken(storedAccess)
        } else if (storedRefresh) {
          const refData = await refreshApi(storedRefresh)
          setStoredTokens(refData.access_token)
          setAccessToken(refData.access_token)
          const userData = await getMeApi()
          setUser(userData)
        }
      } catch {
        clearStoredTokens()
        setUser(null)
        setAccessToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    void hydrateSession()
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const res = await loginApi({ email, password })
    setStoredTokens(res.access_token, res.refresh_token)
    setAccessToken(res.access_token)
    setUser(res.user)
    return res.user
  }

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const res = await registerApi({ name, email, password })
    setStoredTokens(res.access_token, res.refresh_token)
    setAccessToken(res.access_token)
    setUser(res.user)
    return res.user
  }

  const refresh = async (): Promise<void> => {
    const refTok = getStoredRefreshToken()
    if (!refTok) throw new Error('No refresh token stored')
    const res = await refreshApi(refTok)
    setStoredTokens(res.access_token)
    setAccessToken(res.access_token)
  }

  const logout = async (): Promise<void> => {
    const refTok = getStoredRefreshToken()
    try {
      if (refTok) {
        await logoutApi(refTok)
      }
    } catch {
      // Continue client-side session cleanup regardless
    } finally {
      clearStoredTokens()
      setUser(null)
      setAccessToken(null)
    }
  }

  const updateUser = (updated: User): void => {
    setUser(updated)
  }

  const resetSession = (): void => {
    clearStoredTokens()
    setUser(null)
    setAccessToken(null)
  }

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refresh,
    updateUser,
    resetSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
