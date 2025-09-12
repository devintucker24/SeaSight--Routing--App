const BASE: string = (import.meta as any).env?.VITE_API_BASE || '/api'

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as any) }
  // Only set Content-Type when sending a body to avoid CORS preflight on simple GETs
  if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, { mode: 'cors', ...init, headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  tenants(): Promise<Array<{id:string,name:string,region:string}>> {
    return json(`${BASE}/tenants`)
  },
  vessels(tenantId: string): Promise<Array<{id:string,tenantId:string,name:string}>> {
    return json(`${BASE}/vessels?tenantId=${encodeURIComponent(tenantId)}`)
  },
  logbooksList(type: 'bridge'|'engine', tenantId: string, vesselId: string, token?: string): Promise<any[]> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return json(`${BASE}/logbooks/${type}?tenantId=${encodeURIComponent(tenantId)}&vesselId=${encodeURIComponent(vesselId)}`, { headers })
  },
  logbooksCreate(type: 'bridge'|'engine', token: string, body: { tenantId: string, vesselId: string, data: any}): Promise<any> {
    return json(`${BASE}/logbooks/${type}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  },
  logbookCorrection(type: 'bridge'|'engine', token: string, id: string, reason: string): Promise<any> {
    return json(`${BASE}/logbooks/${type}/${id}/correction`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ reason }) })
  },
  logbookCountersign(type: 'bridge'|'engine', token: string, id: string): Promise<any> {
    return json(`${BASE}/logbooks/${type}/${id}/countersign`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  },
  login(body: { tenantId: string, username?: string, email?: string, pin: string }): Promise<{ token: string, user: any }> {
    return json(`${BASE}/auth/login`, { method: 'POST', body: JSON.stringify(body) })
  },
  setPin(body: { tenantId: string, username: string, pin: string }): Promise<any> {
    return json(`${BASE}/auth/set-pin`, { method: 'POST', body: JSON.stringify(body) })
  },
  me(token: string): Promise<any> {
    return json(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` } })
  },
  logout(token: string): Promise<any> {
    return json(`${BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  },
  quickstart(): Promise<{ tenantId: string, token: string, username: string, pin: string }> {
    return json(`${BASE}/demo/quickstart`, { method: 'POST', body: '{}' })
  },
  adminPing(token: string): Promise<{ ok: boolean, route: string, time: string }> {
    return json(`${BASE}/admin/ping`, { headers: { Authorization: `Bearer ${token}` } })
  }
}
