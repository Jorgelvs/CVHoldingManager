import React from 'react'
import { NavLink } from 'react-router-dom'
import { Gauge, Building, Users, FileText, DollarSign, BarChart2, Settings, Archive } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: <Gauge size={18} /> },
  { to: '/patrimonios', label: 'Patrimônio', icon: <Archive size={18} /> },
  { to: '/unidades', label: 'Unidades', icon: <Building size={18} /> },
  { to: '/locatarios', label: 'Locatários', icon: <Users size={18} /> },
  { to: '/contratos', label: 'Contratos', icon: <FileText size={18} /> },
  { to: '/relatorios', label: 'Relatórios', icon: <BarChart2 size={18} /> },
  { to: '/configuracoes', label: 'Configurações', icon: <Settings size={18} /> },
]

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <nav>
        <ul>
          {items.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <span className="icon">{it.icon}</span>
                <span className="label">{it.label}</span>
              </NavLink>
            </li>
          ))}
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
