'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useUserStore } from './store/userStore'
import { type User, getUser, getToken, setAuth, clearAuth } from './auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, token, setUser, setToken, clearAuth: clearStore } = useUserStore()
  const [loading, setLoading] = useState(true)

  // Hydrate state from localStorage once on mount (client only)
  useEffect(() => {
    const storedUser = getUser()
    const storedToken = getToken()
    if (storedUser) setUser(storedUser)
    if (storedToken) setToken(storedToken)
    setLoading(false)
  }, [setUser, setToken])

  const login = useCallback((newToken: string, newUser: User) => {
    setAuth(newToken, newUser)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
  }, [])

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Access auth state anywhere in the component tree.
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
