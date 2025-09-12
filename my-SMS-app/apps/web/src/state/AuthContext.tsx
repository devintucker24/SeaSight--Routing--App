import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../util/client'

export type Role = 'admin'|'author'|'reviewer'|'auditor'

export interface User {
  id: string
  tenantId: string
  username?: string
  email?: string
  displayName?: string
  roles: Role[]
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (tenantId: string, usernameOrEmail: string, pin: string) => Promise<void>
  logout: () => void
  quickstart: () => Promise<void>
}

const Ctx = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        if (token) {
          const me = await api.me(token)
          setUser(me)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [token])

  const login = async (tenantId: string, usernameOrEmail: string, pin: string) => {
    const res = await api.login({ tenantId, username: usernameOrEmail, pin })
    setToken(res.token)
    localStorage.setItem('token', res.token)
    setUser(res.user)
  }

  const logout = () => {
    const t = token
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    if (t) api.logout(t).catch(()=>{})
  }

  const quickstart = async () => {
    const res = await api.quickstart()
    setToken(res.token)
    localStorage.setItem('token', res.token)
    const me = await api.me(res.token)
    setUser(me)
  }

  const value = useMemo(() => ({ user, token, loading, login, logout, quickstart }), [user, token, loading])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

