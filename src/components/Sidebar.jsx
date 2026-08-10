import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Gauge, Building, Users, FileText, DollarSign, BarChart2, Settings, Archive, History, Bell, Database, LogOut } from 'lucide-react'
import { contarNotificacoesNaoLidas } from '../modules/notificacoes/services/notificacaoService.js'
import { useAuth } from '../modules/auth/context/AuthContext.jsx'
import Modal from './Modal.jsx'

const items = [
  { to: '/', label: 'Dashboard', icon: <Gauge size={18} /> },
  { to: '/patrimonios', label: 'Patrimônio', icon: <Archive size={18} /> },
  { to: '/unidades', label: 'Unidades', icon: <Building size={18} /> },
  { to: '/locatarios', label: 'Locatários', icon: <Users size={18} /> },
  { to: '/contratos', label: 'Contratos', icon: <FileText size={18} /> },
  { to: '/documentos', label: 'Documentos', icon: <Archive size={18} /> },
  { to: '/notificacoes', label: 'Notificacoes', icon: <Bell size={18} /> },
  { to: '/auditoria', label: 'Auditoria', icon: <History size={18} /> },
  { to: '/backup', label: 'Backup', icon: <Database size={18} /> },
  { to: '/relatorios', label: 'Relatórios', icon: <BarChart2 size={18} /> },
  { to: '/configuracoes', label: 'Configurações', icon: <Settings size={18} /> },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [naoLidas, setNaoLidas] = useState(0)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const { authRequired, isAuthenticated, user, authBusy, logout } = useAuth()

  useEffect(() => {
    const refreshCount = () => {
      setNaoLidas(contarNotificacoesNaoLidas())
    }

    refreshCount()
    window.addEventListener('cvholding_notificacoes_updated', refreshCount)
    return () => {
      window.removeEventListener('cvholding_notificacoes_updated', refreshCount)
    }
  }, [location.pathname, location.search])

  const handleConfirmLogout = async () => {
    if (authBusy) return
    await logout()
    navigate('/login', { replace: true })
    setConfirmLogoutOpen(false)
  }

  const userLabel = user?.email || user?.id || 'Sem sessao'

  return (
    <aside className="app-sidebar">
      <nav>
        <ul>
          {items.map((it) => {
            const exibeContador = it.to === '/notificacoes' && naoLidas > 0
            return (
              <li key={it.to}>
                <NavLink to={it.to} end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="icon">{it.icon}</span>
                  <span className="label">{it.label}</span>
                  {exibeContador ? (
                    <span className="menu-badge" aria-label={`${naoLidas} notificacoes nao lidas`}>
                      {naoLidas > 99 ? '99+' : naoLidas}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            )
          })}
          <li>
            <div className="nav-link nav-link-section">
              <span className="icon"><DollarSign size={18} /></span>
              <span className="label">Financeiro</span>
            </div>
            <ul className="sidebar-submenu">
              <li>
                <NavLink to="/financeiro" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/lancamentos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Lançamentos</span>
                </NavLink>
              </li>
              <li className="sidebar-submenu-divider" />
              <li>
                <NavLink to="/financeiro/rateios" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Rateios</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/contas" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Contas</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/fluxo-caixa" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Fluxo de Caixa</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/livro-caixa" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Livro Caixa</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/condominio" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Controle do Condomínio</span>
                </NavLink>
              </li>
              <li className="sidebar-submenu-divider" />
              <li>
                <NavLink to="/financeiro/imobiliarias" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Imobiliárias</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/comissoes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Comissões</span>
                </NavLink>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      {authRequired ? (
        <div style={{ marginTop: 'auto', padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Conta</div>
          <div
            style={{
              fontSize: 12,
              marginBottom: 8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={userLabel}
          >
            {`Usuario: ${userLabel}`}
          </div>
          <button
            type="button"
            className="button button-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setConfirmLogoutOpen(true)}
            disabled={!isAuthenticated || authBusy}
          >
            <LogOut size={16} />
            {authBusy ? 'Saindo...' : 'Sair do sistema'}
          </button>
        </div>
      ) : null}

      <Modal open={confirmLogoutOpen} title="Confirmar saída" onClose={() => setConfirmLogoutOpen(false)}>
        <p style={{ marginTop: 0 }}>Deseja realmente sair do CVHolding Manager?</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="button button-secondary" onClick={() => setConfirmLogoutOpen(false)}>
            Cancelar
          </button>
          <button type="button" className="button button-danger" onClick={handleConfirmLogout}>
            Sair do sistema
          </button>
        </div>
      </Modal>
    </aside>
  )
}
