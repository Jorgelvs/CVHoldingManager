import React, { useEffect, useState } from 'react'
import QuickActions from './QuickActions.jsx'
import { getPersistenceMode } from '../infrastructure/persistence/modeService.js'
import { PERSISTENCE_EVENT_MODE_CHANGED } from '../infrastructure/persistence/persistenceConstants.js'
import { useAuth } from '../modules/auth/context/AuthContext.jsx'

export default function Header() {
  const [mode, setMode] = useState(() => getPersistenceMode())
  const { authRequired, isAuthenticated, user } = useAuth()

  useEffect(() => {
    const sync = () => setMode(getPersistenceMode())
    window.addEventListener(PERSISTENCE_EVENT_MODE_CHANGED, sync)
    return () => window.removeEventListener(PERSISTENCE_EVENT_MODE_CHANGED, sync)
  }, [])

  const userLabel = user?.email || user?.id || ''

  return (
    <header className="app-header">
      <div className="header-inner">
        <h1>CVHolding Manager</h1>
        <div
          style={{
            marginLeft: 12,
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: mode === 'supabase' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(107, 114, 128, 0.16)',
            color: mode === 'supabase' ? '#047857' : '#374151',
          }}
        >
          Modo {mode === 'supabase' ? 'Supabase' : 'Local'}
        </div>
        {mode === 'supabase' ? (
          <div
            style={{
              marginLeft: 10,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: isAuthenticated ? 'rgba(16, 185, 129, 0.16)' : 'rgba(220, 38, 38, 0.14)',
              color: isAuthenticated ? '#047857' : '#991b1b',
              maxWidth: 320,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={isAuthenticated ? userLabel : 'Sem sessao autenticada'}
          >
            {isAuthenticated ? `Usuario: ${userLabel}` : (authRequired ? 'Sem sessao' : 'Homologacao anonima')}
          </div>
        ) : null}
        <div style={{ marginLeft: 'auto' }}>
          <QuickActions />
        </div>
      </div>
    </header>
  )
}
