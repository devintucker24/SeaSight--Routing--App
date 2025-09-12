import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './shell/App'
import './styles/tokens.css'
import './styles/global.css'

const el = document.getElementById('root')!
createRoot(el).render(<React.StrictMode><App /></React.StrictMode>)

