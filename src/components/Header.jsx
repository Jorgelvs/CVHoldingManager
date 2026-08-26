import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import QuickActions from './QuickActions.jsx'
import { getPersistenceMode } from '../infrastructure/persistence/modeService.js'
import { PERSISTENCE_EVENT_MODE_CHANGED } from '../infrastructure/persistence/persistenceConstants.js'
import { useAuth } from '../modules/auth/context/AuthContext.jsx'

export default function Header() {
  const [mode, setMode] = useState(() => getPersistenceMode())
  const { authRequired, isAuthenticated, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // Instalado como app (PWA), o navegador roda em modo "standalone" — some a
  // barra de endereço e, com ela, o botão de voltar do sistema. Sem este
  // botão, qualquer navegação feita por um card/atalho (ex.: "Total
  // financeiro" -> Contas) vira um beco sem saída. Fica escondido só na tela
  // inicial (Painel), que não precisa de "voltar".
  const mostrarVoltar = location.pathname !== '/'

  useEffect(() => {
    const sync = () => setMode(getPersistenceMode())
    window.addEventListener(PERSISTENCE_EVENT_MODE_CHANGED, sync)
    return () => window.removeEventListener(PERSISTENCE_EVENT_MODE_CHANGED, sync)
  }, [])

  const userLabel = user?.email || user?.id || ''

  return (
    <header className="app-header">
      <div className="header-inner">
        {mostrarVoltar ? (
          <button type="button" className="header-back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
        ) : null}
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
