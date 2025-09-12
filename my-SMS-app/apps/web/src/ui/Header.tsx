import React, { useState, useEffect } from 'react'
import { useAuth } from '../state/AuthContext'

export function Header() {
  const { user, logout, quickstart } = useAuth()
  const [msg, setMsg] = useState('')

  function onLogout() {
    logout()
    setMsg('Logged out')
  }

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 2000)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <header className="header">
      <div className="brand">SMS • PWA</div>
      <nav>
        <a className="btn secondary" href="http://localhost:8081/docs" target="_blank" rel="noreferrer">Docs</a>
        {!user ? (
          <button className="btn secondary" onClick={quickstart}>Dev Quickstart</button>
        ) : (
          <>
            <span className="pill">{user.roles.join(', ') || 'user'}</span>
            <button className="btn secondary" onClick={onLogout}>Logout</button>
          </>
        )}
        {msg && <span className="pill" title={msg}>{msg}</span>}
      </nav>
    </header>
  )
}
