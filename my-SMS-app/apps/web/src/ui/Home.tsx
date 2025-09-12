import React, { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { api } from '../util/client'
import { TenantsVessels } from './TenantsVessels'
import { Logbooks } from './Logbooks'

export function Home() {
  const { user, token } = useAuth() as any
  const [adminMsg, setAdminMsg] = useState<string>('')
  const [adminErr, setAdminErr] = useState<string>('')

  async function onAdminPing() {
    setAdminErr(''); setAdminMsg('')
    if (!token) { setAdminErr('Not authenticated'); return }
    try {
      const res = await api.adminPing(token)
      setAdminMsg(`OK at ${res.time}`)
    } catch (e:any) {
      setAdminErr(e?.message || 'Access denied')
    }
  }
  return (
    <div className="stack">
      <div className="card">
        <h2>Welcome{user?.displayName ? `, ${user.displayName}` : ''}</h2>
        <p>Tenant: <code>{user?.tenantId}</code></p>
        <p>Roles: <span className="pill">{user?.roles.join(', ')}</span></p>
      </div>
      <div className="card">
        <h3>Next links</h3>
        <ul>
          <li><a href="http://localhost:8081/tenants" target="_blank" rel="noreferrer">API: Tenants</a></li>
          <li><a href="http://localhost:8081/healthz" target="_blank" rel="noreferrer">API: Health</a></li>
        </ul>
      </div>
      <TenantsVessels />
      <Logbooks />
      {user?.roles?.includes('admin') && (
        <div className="card">
          <h3>Admin</h3>
          <div className="row">
            <button className="btn" onClick={onAdminPing}>Ping Protected Route</button>
            {adminMsg && <span className="pill">{adminMsg}</span>}
            {adminErr && <span className="pill" style={{background:'#3a1e22', color:'#ffb3b3'}}>{adminErr}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
