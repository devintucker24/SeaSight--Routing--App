import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../util/client'
import { useAuth } from '../state/AuthContext'

type Tenant = { id: string, name: string }
type Vessel = { id: string, name: string }
type Entry = { id: string, ts: string, data?: any, correctionRequested?: boolean }

export function Logbooks() {
  const { user, token } = useAuth() as any
  const [type, setType] = useState<'bridge'|'engine'>('bridge')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tid, setTid] = useState('')
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vid, setVid] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [note, setNote] = useState('')
  const canCountersign = useMemo(() => user?.roles?.includes('admin') || user?.roles?.includes('reviewer'), [user])

  // Load tenants
  useEffect(() => { (async () => {
    try {
      const ts = await api.tenants()
      setTenants(ts)
      if (ts.length > 0) setTid(ts[0].id)
    } catch (e:any) { setError(e?.message||'Failed to load tenants') }
  })() }, [])

  // Load vessels when tenant changes
  useEffect(() => { (async () => {
    if (!tid) return
    setError('')
    try {
      const vs = await api.vessels(tid)
      setVessels(vs)
      if (vs.length > 0) setVid(vs[0].id)
      else setVid('')
    } catch (e:any) { setError(e?.message||'Failed to load vessels') }
  })() }, [tid])

  // Load entries
  async function refresh() {
    if (!tid || !vid || !token) return
    setLoading(true); setError('')
    try {
      const es = await api.logbooksList(type, tid, vid, token)
      setEntries(Array.isArray(es) ? es : [])
    } catch (e:any) { setError(e?.message||'Failed to load entries') }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [type, tid, vid, token])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) { setError('Not signed in'); return }
    try {
      await api.logbooksCreate(type, token, { tenantId: tid, vesselId: vid, data: { note } })
      setNote('')
      refresh()
    } catch (e:any) { setError(e?.message||'Failed to create entry') }
  }

  async function onCorrection(id: string) {
    if (!token) { setError('Not signed in'); return }
    try {
      await api.logbookCorrection(type, token, id, 'Requested via UI')
      refresh()
    } catch (e:any) { setError(e?.message||'Failed to request correction') }
  }

  async function onCountersign(id: string) {
    if (!token) { setError('Not signed in'); return }
    try {
      await api.logbookCountersign(type, token, id)
      refresh()
    } catch (e:any) { setError(e?.message||'Failed to countersign') }
  }

  return (
    <div className="card">
      <h3>Logbooks</h3>
      <div className="row" style={{marginBottom: 12}}>
        <select className="input" value={type} onChange={e=>setType(e.target.value as any)}>
          <option value="bridge">Bridge</option>
          <option value="engine">Engine</option>
        </select>
        <select className="input" value={tid} onChange={e=>setTid(e.target.value)}>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input" value={vid} onChange={e=>setVid(e.target.value)}>
          {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {loading && <span className="pill">Loading…</span>}
        {error && <span className="pill" style={{background:'#3a1e22', color:'#ffb3b3'}}>{error}</span>}
      </div>
      <form className="row" onSubmit={onCreate} style={{marginBottom: 12}}>
        <input className="input" placeholder="New entry note…" value={note} onChange={e=>setNote(e.target.value)} />
        <button className="btn" disabled={!note}>Add Entry</button>
      </form>
      {!token ? (
        <div className="label">Sign in to view logbook entries.</div>
      ) : (Array.isArray(entries) ? entries.length === 0 : true) ? (
        <div className="label">No entries yet</div>
      ) : (
        <ul>
          {(Array.isArray(entries) ? entries : []).map(e => (
            <li key={e.id} className="row" style={{justifyContent:'space-between'}}>
              <div>
                <code>{e.id?.substring?.(0,8) || ''}</code> — {e.ts ? new Date(e.ts).toLocaleString() : ''} — {(e as any)?.data?.note || ''}
                {e.correctionRequested && <span className="pill" style={{marginLeft:8}}>Correction requested</span>}
              </div>
              <div className="row" style={{gap:8}}>
                <button className="btn secondary" onClick={()=>onCorrection(e.id)} type="button">Request Correction</button>
                {canCountersign && <button className="btn" onClick={()=>onCountersign(e.id)} type="button">Countersign</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
