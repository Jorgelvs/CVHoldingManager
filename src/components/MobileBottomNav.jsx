import React, { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, LogOut, Menu, PlusCircle, Search } from 'lucide-react'
import Modal from './Modal.jsx'
import UniversalEntryModal from './UniversalEntryModal.jsx'
import { useAuth } from '../modules/auth/context/AuthContext.jsx'

const QUERY_ROUTES = [
  '/financeiro/contas',
  '/financeiro/lancamentos',
  '/financeiro',
  '/contratos',
  '/patrimonios',
  '/unidades',
  '/locatarios',
]

const MORE_ROUTES = [
  '/documentos',
  '/financeiro/rateios',
  '/financeiro/caucoes',
  '/notificacoes',
  '/relatorios',
  '/auditoria',
  '/backup',
  '/configuracoes',
]

function pathStartsWithAny(pathname, routes) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [openRegistrar, setOpenRegistrar] = useState(false)
  const [openConsultar, setOpenConsultar] = useState(false)
  const [openMais, setOpenMais] = useState(false)
  const [openUniversalEntry, setOpenUniversalEntry] = useState(false)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const { authRequired, isAuthenticated, user, authBusy, logout } = useAuth()

  const active = useMemo(() => {
    const pathname = location.pathname
    return {
      inicio: pathname === '/' || pathname.startsWith('/financeiro'),
      registrar: openRegistrar || openUniversalEntry,
      consultar: openConsultar || pathStartsWithAny(pathname, QUERY_ROUTES),
      mais: openMais || pathStartsWithAny(pathname, MORE_ROUTES),
    }
  }, [location.pathname, openRegistrar, openConsultar, openMais, openUniversalEntry])

  const openAndClose = (setter) => {
    setOpenRegistrar(false)
    setOpenConsultar(false)
    setOpenMais(false)
    setter(true)
  }

  const handleConfirmLogout = async () => {
    if (authBusy) return
    await logout()
    navigate('/login', { replace: true })
    setConfirmLogoutOpen(false)
    setOpenMais(false)
  }

  const userLabel = user?.email || user?.id || 'Sem sessao'

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Navegação principal mobile" role="navigation">
        <NavLink
          to="/"
          className={({ isActive }) => `mobile-bottom-nav-item ${(isActive || active.inicio) ? 'active' : ''}`}
          aria-label="Início"
        >
          <Home size={20} aria-hidden="true" />
          <span>Início</span>
        </NavLink>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${active.registrar ? 'active' : ''}`}
          aria-label="Registrar"
          onClick={() => openAndClose(setOpenRegistrar)}
        >
          <PlusCircle size={20} aria-hidden="true" />
          <span>Registrar</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${active.consultar ? 'active' : ''}`}
          aria-label="Consultar"
          onClick={() => openAndClose(setOpenConsultar)}
        >
          <Search size={20} aria-hidden="true" />
          <span>Consultar</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${active.mais ? 'active' : ''}`}
          aria-label="Mais opções"
          onClick={() => openAndClose(setOpenMais)}
        >
          <Menu size={20} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      <Modal open={openRegistrar} title="Registrar" onClose={() => setOpenRegistrar(false)}>
        <div className="mobile-nav-sheet-list" role="menu" aria-label="Ações de registro">
          <button type="button" className="button button-primary" onClick={() => { setOpenRegistrar(false); setOpenUniversalEntry(true) }}>
            Entrada Universal
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenRegistrar(false); navigate('/financeiro/receita/nova') }}>
            Nova receita
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenRegistrar(false); navigate('/financeiro/despesa/nova') }}>
            Nova despesa
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenRegistrar(false); navigate('/financeiro/baixas/novo?acao=recebimento') }}>
            Registrar recebimento
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenRegistrar(false); navigate('/financeiro/baixas/novo?acao=pagamento') }}>
            Registrar pagamento
          </button>
        </div>
      </Modal>

      <Modal open={openConsultar} title="Consultar" onClose={() => setOpenConsultar(false)}>
        <div className="mobile-nav-sheet-list" role="menu" aria-label="Atalhos de consulta">
          <button type="button" className="button button-secondary" onClick={() => { setOpenConsultar(false); navigate('/financeiro/contas') }}>
            Saldos por conta
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenConsultar(false); navigate('/financeiro/lancamentos') }}>
            Últimos lançamentos
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenConsultar(false); navigate('/financeiro/lancamentos?status=atrasado') }}>
            Inadimplência
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenConsultar(false); navigate('/contratos') }}>
            Contratos ativos
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenConsultar(false); navigate('/patrimonios') }}>
            Patrimônios
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenConsultar(false); navigate('/unidades') }}>
            Unidades
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenConsultar(false); navigate('/locatarios') }}>
            Locatários
          </button>
        </div>
      </Modal>

      <Modal open={openMais} title="Mais" onClose={() => setOpenMais(false)}>
        <div className="mobile-nav-sheet-list" role="menu" aria-label="Mais atalhos">
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/documentos') }}>
            Documentos
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/financeiro/rateios') }}>
            Rateios
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/financeiro/caucoes') }}>
            Cauções
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/notificacoes') }}>
            Notificações
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/relatorios') }}>
            Relatórios
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/auditoria') }}>
            Auditoria
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/backup') }}>
            Backup
          </button>
          <button type="button" className="button button-secondary" onClick={() => { setOpenMais(false); navigate('/configuracoes') }}>
            Configurações
          </button>

          {authRequired ? (
            <>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Conta</div>
              <div style={{ fontSize: 12, marginBottom: 8, wordBreak: 'break-word' }}>{`Usuario: ${userLabel}`}</div>
              <button
                type="button"
                className="button button-danger"
                onClick={() => setConfirmLogoutOpen(true)}
                disabled={!isAuthenticated || authBusy}
              >
                <LogOut size={16} style={{ marginRight: 6 }} />
                {authBusy ? 'Saindo...' : 'Sair do sistema'}
              </button>
            </>
          ) : null}
        </div>
      </Modal>

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

      <UniversalEntryModal open={openUniversalEntry} onClose={() => setOpenUniversalEntry(false)} />
    </>
  )
}
