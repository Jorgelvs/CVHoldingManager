import React from 'react'
import { NavLink } from 'react-router-dom'
import { Gauge, Building, Users, FileText, DollarSign, BarChart2, Settings, Archive } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: <Gauge size={18} /> },
  { to: '/patrimonios', label: 'Patrimônio', icon: <Archive size={18} /> },
  { to: '/unidades', label: 'Unidades', icon: <Building size={18} /> },
  { to: '/locatarios', label: 'Locatários', icon: <Users size={18} /> },
  { to: '/contratos', label: 'Contratos', icon: <FileText size={18} /> },
  { to: '/financeiro', label: 'Financeiro', icon: <DollarSign size={18} /> },
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
        </ul>
      </nav>
    </aside>
  )
}
