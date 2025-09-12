import React, { useEffect, useState } from 'react'
import { api } from '../util/client'

type Tenant = { id: string, name: string }
type Vessel = { id: string, name: string }

export function TenantsVessels() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tid, setTid] = useState('')
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|undefined>()

  useEffect(() => { (async () => {
    try {
      const ts = await api.tenants()
      setTenants(ts)
      if (ts.length > 0) setTid(ts[0].id)
    } catch (e:any) { setError(e?.message||'Failed to load tenants') }
  })() }, [])

  useEffect(() => { (async () => {
    if (!tid) return
    setLoading(true); setError(undefined)
    try {
      const vs = await api.vessels(tid)
      setVessels(vs)
    } catch(e:any) { setError(e?.message||'Failed to load vessels') }
    finally { setLoading(false) }
  })() }, [tid])

  return (
    <div className="card">
      <h3>Tenants → Vessels</h3>
      <div className="row" style={{marginBottom: 12}}>
        <select className="input" value={tid} onChange={e=>setTid(e.target.value)}>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {loading && <span className="pill">Loading…</span>}
        {error && <span className="pill" style={{background:'#3a1e22', color:'#ffb3b3'}}>{error}</span>}
      </div>
      {vessels.length === 0 ? (
        <div className="label">No vessels for this tenant</div>
      ) : (
        <ul>
          {vessels.map(v => <li key={v.id}><code>{v.id.substring(0,8)}</code> — {v.name}</li>)}
        </ul>
      )}
    </div>
  )
}

