import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Gauge, LayoutGrid, Building, Users, DollarSign, Settings, Archive, LogOut } from 'lucide-react'
import { useAuth } from '../modules/auth/context/AuthContext.jsx'
import Modal from './Modal.jsx'

// Auditoria e Notificações saíram do menu a pedido do usuário (pouco usadas
// no dia a dia) — as rotas continuam funcionando normalmente, só não
// aparecem mais aqui. Dá pra voltar a listar bastando readicionar as linhas.
// Menu enxuto (24/11/2026): só o uso diário fica à vista; o resto está em
// "Mais" (nada foi apagado).
const items = [
  { to: '/', label: 'Painel', icon: <LayoutGrid size={18} /> },
  { to: '/locatarios', label: 'Inquilinos', icon: <Users size={18} /> },
  { to: '/patrimonios', label: 'Imóveis', icon: <Archive size={18} /> },
  { to: '/unidades', label: 'Unidades', icon: <Building size={18} /> },
]

const maisItems = [
  { to: '/dashboard', label: 'Resumo do ano', icon: <Gauge size={18} /> },
  { to: '/financeiro', label: 'Consulta por mês' },
  { to: '/financeiro/contas', label: 'Contas' },
  { to: '/financeiro/aportes', label: 'Aportes' },
  { to: '/financeiro/caucoes', label: 'Cauções' },
  { to: '/financeiro/rateios', label: 'Rateios' },
  { to: '/financeiro/condominio', label: 'Condomínio' },
  { to: '/financeiro/fluxo-caixa', label: 'Fluxo de Caixa' },
  { to: '/financeiro/livro-caixa', label: 'Livro Caixa' },
  { to: '/relatorios', label: 'Relatórios' },
  { to: '/backup', label: 'Backup' },
  { to: '/configuracoes', label: 'Configurações' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const { authRequired, isAuthenticated, user, authBusy, logout } = useAuth()

  const handleConfirmLogout = async () => {
    if (authBusy) return
    try {
      await logout()
    } catch {
      // Mesmo se logout() lancar um erro inesperado, ainda assim tira o
      // usuario da tela e fecha o modal no finally abaixo -- sem isso, uma
      // excecao aqui deixava o modal de confirmacao preso na tela para
      // sempre (o sintoma de "o sistema nao deixa eu sair").
    } finally {
      navigate('/login', { replace: true })
      setConfirmLogoutOpen(false)
    }
  }

  const userLabel = user?.email || user?.id || 'Sem sessao'

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
                <NavLink to="/financeiro/lancamentos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Lançamentos</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/comissoes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Comissões</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/financeiro/imobiliarias" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <span className="label">Imobiliárias</span>
                </NavLink>
              </li>
            </ul>
          </li>
          <li>
            <details className="sidebar-mais">
              <summary className="nav-link nav-link-section">
                <span className="icon"><Settings size={18} /></span>
                <span className="label">Mais</span>
              </summary>
              <ul className="sidebar-submenu">
                {maisItems.map((it) => (
                  <li key={it.to}>
                    <NavLink to={it.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                      <span className="label">{it.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </details>
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
