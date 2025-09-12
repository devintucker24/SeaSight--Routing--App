import React from 'react'
import { AuthProvider, useAuth } from '../state/AuthContext'
import { LoginForm } from '../ui/LoginForm'
import { Header } from '../ui/Header'
import { Home } from '../ui/Home'

function Inner() {
  const { user } = useAuth()
  return (
    <div className="container">
      <Header />
      {!user ? (
        <div className="card"><LoginForm /></div>
      ) : (
        <Home />
      )}
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}

