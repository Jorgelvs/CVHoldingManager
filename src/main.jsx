import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './style.css'
import { bootstrapPersistence } from './infrastructure/persistence/persistenceGateway.js'
import { enforceSupabaseModeOnStartup } from './infrastructure/persistence/modeService.js'
import { AuthProvider } from './modules/auth/context/AuthContext.jsx'

async function startApplication() {
  enforceSupabaseModeOnStartup()
  await bootstrapPersistence()

  createRoot(document.getElementById('app')).render(
    <React.StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  )
}

startApplication()

// Registra o service worker que torna o app instalavel (Adicionar a tela
// inicial / Instalar app) no Chrome/Android. Nao interfere no funcionamento
// se o navegador nao suportar.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
