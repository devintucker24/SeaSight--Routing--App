import React, { useEffect, useState } from 'react'
import { api } from '../util/client'
import { useAuth } from '../state/AuthContext'

export function LoginForm() {
  const { login } = useAuth()
  const [tenants, setTenants] = useState<Array<{id:string,name:string}>>([])
  const [tenantId, setTenantId] = useState('')
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [tenantsError, setTenantsError] = useState<string|undefined>()
  const [username, setUsername] = useState('admin')
  const [pin, setPin] = useState('1234')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [qLoading, setQLoading] = useState(false)

  async function fetchTenants() {
    setTenantsLoading(true)
    try {
      setTenantsError(undefined)
      const ts = await api.tenants()
      setTenants(ts)
      if (!tenantId && ts.length > 0) setTenantId(ts[0].id)
    } catch (e:any) {
      setTenantsError(e?.message || 'Failed to load tenants')
    } finally {
      setTenantsLoading(false)
    }
  }

  useEffect(() => { fetchTenants() }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const tid = tenantId || tenants[0]?.id
      if (!tid) throw new Error('No tenants found')
      await login(tid, username, pin)
    } catch (err:any) {
      setError(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  async function onQuickstart() {
    setError(null)
    setQLoading(true)
    try {
      const tid = tenantId || tenants[0]?.id
      if (!tid) throw new Error('No tenants found')
      // Ensure admin has a PIN, then log in
      await api.setPin({ tenantId: tid, username: 'admin', pin: '1234' })
      await login(tid, 'admin', '1234')
    } catch (err:any) {
      setError(err.message || 'Quickstart failed')
    } finally { setQLoading(false) }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <h2>Sign in</h2>
      <label className="stack">
        <span className="label">Tenant</span>
        <select
          className="input"
          value={tenantId}
          onChange={e=>setTenantId(e.target.value)}
          onFocus={() => { if (tenants.length === 0 && !tenantsLoading) fetchTenants() }}
        >
          {tenantsLoading && <option key="loading" value="__loading" disabled>Loading…</option>}
          {!tenantsLoading && tenants.length === 0 && <option key="none" value="__none" disabled>No tenants found</option>}
          {!tenantsLoading && tenants.length > 0 && <option key="placeholder" value="">Select a tenant…</option>}
          {tenants.map(t => <option key={`t-${t.id}`} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {tenantsError && <div style={{color:'var(--color-danger)'}}>{tenantsError}</div>}
      {!tenantsLoading && tenants.length > 0 && (
        <div className="label">Loaded tenants: {tenants.map(t=>t.name).join(', ')}</div>
      )}
      <div className="row">
        <button className="btn secondary" type="button" onClick={fetchTenants} disabled={tenantsLoading}>Reload Tenants</button>
      </div>
      <label className="stack">
        <span className="label">Username</span>
        <input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin" />
      </label>
      <label className="stack">
        <span className="label">PIN</span>
        <input className="input" value={pin} onChange={e=>setPin(e.target.value)} placeholder="1234" />
      </label>
      {error && <div style={{color:'var(--color-danger)'}}>{error}</div>}
      <div className="row">
        <button className="btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        <button className="btn secondary" type="button" onClick={onQuickstart} disabled={qLoading}>
          {qLoading ? 'Quickstarting...' : 'Dev Quickstart (admin/1234)'}
        </button>
      </div>
    </form>
  )
}
