import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Gauge, Building, Users, FileText, DollarSign, BarChart2, Settings, Archive, History, Bell, Database } from 'lucide-react'
import { contarNotificacoesNaoLidas } from '../modules/notificacoes/services/notificacaoService.js'

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
  const location = useLocation()
  const [naoLidas, setNaoLidas] = useState(0)

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
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
