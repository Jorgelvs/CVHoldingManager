import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import MobileBottomNav from './components/MobileBottomNav.jsx'
import AuthGuard from './modules/auth/components/AuthGuard.jsx'
import LoginPage from './modules/auth/pages/LoginPage.jsx'
import ResetPasswordPage from './modules/auth/pages/ResetPasswordPage.jsx'
import { useAuth } from './modules/auth/context/AuthContext.jsx'
import { inicializarPatrimonios } from './modules/patrimonios/services/patrimonioService.js'
import { inicializarUnidades } from './modules/unidades/services/unidadeService.js'
import { inicializarLocatarios } from './modules/locatarios/services/locatarioService.js'
import { inicializarContratos } from './modules/contratos/services/contratoService.js'
import { inicializarContas } from './modules/financeiro/services/contaService.js'
import { inicializarImobiliarias } from './modules/imobiliarias/services/imobiliariaService.js'
import { obterConfiguracoes } from './modules/configuracoes/services/configuracaoService.js'
import { getRepositoryRuntimeState } from './utils/localRepository.js'
import { bootstrapPersistence } from './infrastructure/persistence/persistenceGateway.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const FinanceiroDashboardPage = lazy(() => import('./modules/financeiro/pages/FinanceiroDashboardPage.jsx'))
const LancamentoListPage = lazy(() => import('./modules/financeiro/pages/LancamentoListPage.jsx'))
const LancamentoFormPage = lazy(() => import('./modules/financeiro/pages/LancamentoFormPage.jsx'))
const LancamentoViewPage = lazy(() => import('./modules/financeiro/pages/LancamentoViewPage.jsx'))
const RateioListPage = lazy(() => import('./modules/financeiro/pages/RateioListPage.jsx'))
const RateioFormPage = lazy(() => import('./modules/financeiro/pages/RateioFormPage.jsx'))
const RateioViewPage = lazy(() => import('./modules/financeiro/pages/RateioViewPage.jsx'))
const CondominioPage = lazy(() => import('./modules/financeiro/pages/CondominioPage.jsx'))
const ComissoesPage = lazy(() => import('./modules/financeiro/pages/ComissoesPage.jsx'))
const ImobiliariaListPage = lazy(() => import('./modules/imobiliarias/pages/ImobiliariaListPage.jsx'))
const ImobiliariaFormPage = lazy(() => import('./modules/imobiliarias/pages/ImobiliariaFormPage.jsx'))
const ContaListPage = lazy(() => import('./modules/financeiro/pages/ContaListPage.jsx'))
const ContaFormPage = lazy(() => import('./modules/financeiro/pages/ContaFormPage.jsx'))
const ContaViewPage = lazy(() => import('./modules/financeiro/pages/ContaViewPage.jsx'))
const FluxoCaixaPage = lazy(() => import('./modules/financeiro/pages/FluxoCaixaPage.jsx'))
const LivroCaixaPage = lazy(() => import('./modules/financeiro/pages/LivroCaixaPage.jsx'))
const BaixaFormPage = lazy(() => import('./modules/financeiro/pages/BaixaFormPage.jsx'))
const TransferenciaFormPage = lazy(() => import('./modules/financeiro/pages/TransferenciaFormPage.jsx'))
const AporteListPage = lazy(() => import('./modules/financeiro/pages/AporteListPage.jsx'))
const AporteFormPage = lazy(() => import('./modules/financeiro/pages/AporteFormPage.jsx'))
const CaucaoListPage = lazy(() => import('./modules/financeiro/pages/CaucaoListPage.jsx'))
const CaucaoFormPage = lazy(() => import('./modules/financeiro/pages/CaucaoFormPage.jsx'))
const ReportsPage = lazy(() => import('./modules/reports/pages/ReportsPage.jsx'))
const DocumentosPage = lazy(() => import('./modules/documentos/pages/DocumentosPage.jsx'))
const DocumentoFormPage = lazy(() => import('./modules/documentos/pages/DocumentoFormPage.jsx'))
const Configuracoes = lazy(() => import('./pages/Configuracoes.jsx'))
const PatrimonioListPage = lazy(() => import('./modules/patrimonios/pages/PatrimonioListPage.jsx'))
const PatrimonioFormPage = lazy(() => import('./modules/patrimonios/pages/PatrimonioFormPage.jsx'))
const PatrimonioDetalhesPage = lazy(() => import('./modules/patrimonios/pages/PatrimonioDetalhesPage.jsx'))
const UnidadeListPage = lazy(() => import('./modules/unidades/pages/UnidadeListPage.jsx'))
const UnidadeFormPage = lazy(() => import('./modules/unidades/pages/UnidadeFormPage.jsx'))
const UnidadeViewPage = lazy(() => import('./modules/unidades/pages/UnidadeViewPage.jsx'))
const LocatarioListPage = lazy(() => import('./modules/locatarios/pages/LocatarioListPage.jsx'))
const LocatarioFormPage = lazy(() => import('./modules/locatarios/pages/LocatarioFormPage.jsx'))
const LocatarioViewPage = lazy(() => import('./modules/locatarios/pages/LocatarioViewPage.jsx'))
const ContratoListPage = lazy(() => import('./modules/contratos/pages/ContratoListPage.jsx'))
const ContratoFormPage = lazy(() => import('./modules/contratos/pages/ContratoFormPage.jsx'))
const ContratoViewPage = lazy(() => import('./modules/contratos/pages/ContratoViewPage.jsx'))
const AuditoriaPage = lazy(() => import('./modules/auditoria/pages/AuditoriaPage.jsx'))
const NotificacoesPage = lazy(() => import('./modules/notificacoes/pages/NotificacoesPage.jsx'))
const BackupPage = lazy(() => import('./modules/backup/pages/BackupPage.jsx'))

function AppRouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      Carregando pagina...
    </div>
  )
}

function aplicarTemaConfigurado() {
  const root = document.documentElement
  const tema = obterConfiguracoes()?.interface?.tema || 'auto'
  if (tema === 'claro') {
    root.setAttribute('data-theme', 'light')
    return
  }
  if (tema === 'escuro') {
    root.setAttribute('data-theme', 'dark')
    return
  }
  root.removeAttribute('data-theme')
}

function aplicarAriaLabelsCampos() {
  const campos = document.querySelectorAll('input:not([type="hidden"]), select, textarea')
  campos.forEach((campo) => {
    if (campo.hasAttribute('aria-label') || campo.hasAttribute('aria-labelledby')) return

    const labelPai = campo.closest('label')
    if (labelPai) {
      const texto = (labelPai.textContent || '').trim()
      if (texto) {
        campo.setAttribute('aria-label', texto)
        return
      }
    }

    const container = campo.closest('.form-field, .filter-group')
    const labelContainer = container?.querySelector('label, span')
    if (labelContainer) {
      const texto = (labelContainer.textContent || '').trim()
      if (texto) {
        campo.setAttribute('aria-label', texto)
        return
      }
    }

    const prev = campo.previousElementSibling
    if (prev && /^(LABEL|SPAN)$/i.test(prev.tagName)) {
      const texto = (prev.textContent || '').trim()
      if (texto) {
        campo.setAttribute('aria-label', texto)
        return
      }
    }

    const placeholder = (campo.getAttribute('placeholder') || '').trim()
    if (placeholder) {
      campo.setAttribute('aria-label', placeholder)
      return
    }

    const nome = (campo.getAttribute('name') || campo.getAttribute('id') || '').trim()
    if (nome) {
      campo.setAttribute('aria-label', nome)
      return
    }

    const tipo = (campo.getAttribute('type') || campo.tagName || 'campo').toLowerCase()
    campo.setAttribute('aria-label', `Campo ${tipo}`)
  })
}

// Traduz códigos técnicos de erro de sincronização para uma mensagem que
// explica o que aconteceu de fato, em vez de só mostrar o código bruto.
function descreverErroPersistencia(erro) {
  if (erro === 'CONFLICT_DETECTED') {
    return 'os dados foram alterados em outra aba, dispositivo ou sessão enquanto esta tela estava aberta. Clique em "Tentar novamente" para buscar a versão mais recente.'
  }
  return erro
}

function AppShell({ isMobileNav, persistenceState, onRetryPersistence, retryingPersistence, routeKey }) {
  return (
    <div className={`app-root ${isMobileNav ? 'app-root-mobile' : ''}`}>
      {isMobileNav ? null : <Sidebar />}
      <div className="main-area">
        <Header />
        <main className="content-area">
          {persistenceState.mode === 'supabase' && persistenceState.error ? (
            <div className="alert-box alert-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>Modo Supabase ativo, mas ocorreu erro de sincronização: {descreverErroPersistencia(persistenceState.error)}</span>
              <button
                type="button"
                className="button button-secondary"
                onClick={onRetryPersistence}
                disabled={retryingPersistence}
                style={{ marginLeft: 'auto' }}
              >
                {retryingPersistence ? 'Verificando...' : 'Tentar novamente'}
              </button>
            </div>
          ) : null}
          {/* key={routeKey} garante que, ao navegar para outra tela, o
              boundary "esquece" um erro anterior em vez de continuar preso
              na tela de erro para sempre. */}
          <ErrorBoundary key={routeKey}>
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patrimonios" element={<PatrimonioListPage />} />
              <Route path="/patrimonios/novo" element={<PatrimonioFormPage />} />
              <Route path="/patrimonios/:id" element={<PatrimonioDetalhesPage />} />
              <Route path="/patrimonios/:id/editar" element={<PatrimonioFormPage />} />
              <Route path="/unidades" element={<UnidadeListPage />} />
              <Route path="/unidades/nova" element={<UnidadeFormPage />} />
              <Route path="/unidades/:unidadeId" element={<UnidadeViewPage />} />
              <Route path="/unidades/:unidadeId/editar" element={<UnidadeFormPage />} />
              <Route path="/patrimonios/:patrimonioId/unidades" element={<UnidadeListPage />} />
              <Route path="/patrimonios/:patrimonioId/unidades/nova" element={<UnidadeFormPage />} />
              <Route path="/locatarios" element={<LocatarioListPage />} />
              <Route path="/locatarios/novo" element={<LocatarioFormPage />} />
              <Route path="/locatarios/:id" element={<LocatarioViewPage />} />
              <Route path="/locatarios/:id/editar" element={<LocatarioFormPage />} />
              <Route path="/contratos" element={<ContratoListPage />} />
              <Route path="/contratos/novo" element={<ContratoFormPage />} />
              <Route path="/contratos/:id" element={<ContratoViewPage />} />
              <Route path="/contratos/:id/editar" element={<ContratoFormPage />} />
              <Route path="/financeiro" element={<FinanceiroDashboardPage />} />
              <Route path="/financeiro/lancamentos" element={<LancamentoListPage />} />
              <Route path="/financeiro/rateios" element={<RateioListPage />} />
              <Route path="/financeiro/rateios/novo" element={<RateioFormPage />} />
              <Route path="/financeiro/rateios/:id" element={<RateioViewPage />} />
              <Route path="/financeiro/rateios/:id/editar" element={<RateioFormPage />} />
              <Route path="/financeiro/condominio" element={<CondominioPage />} />
              <Route path="/financeiro/comissoes" element={<ComissoesPage />} />
              <Route path="/financeiro/imobiliarias" element={<ImobiliariaListPage />} />
              <Route path="/financeiro/imobiliarias/nova" element={<ImobiliariaFormPage />} />
              <Route path="/financeiro/imobiliarias/:id/editar" element={<ImobiliariaFormPage />} />
              <Route path="/financeiro/contas" element={<ContaListPage />} />
              <Route path="/financeiro/contas/novo" element={<ContaFormPage />} />
              <Route path="/financeiro/contas/:id" element={<ContaViewPage />} />
              <Route path="/financeiro/contas/:id/editar" element={<ContaFormPage />} />
              <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixaPage />} />
              <Route path="/financeiro/livro-caixa" element={<LivroCaixaPage />} />
              <Route path="/financeiro/baixas/novo" element={<BaixaFormPage />} />
              <Route path="/financeiro/transferencias/novo" element={<TransferenciaFormPage />} />
              <Route path="/financeiro/aportes" element={<AporteListPage />} />
              <Route path="/financeiro/aportes/novo" element={<AporteFormPage />} />
              <Route path="/financeiro/caucoes" element={<CaucaoListPage />} />
              <Route path="/financeiro/caucoes/novo" element={<CaucaoFormPage />} />
              <Route path="/financeiro/novo" element={<LancamentoFormPage />} />
              <Route path="/financeiro/:tipo/nova" element={<LancamentoFormPage />} />
              <Route path="/financeiro/:id" element={<LancamentoViewPage />} />
              <Route path="/financeiro/:id/editar" element={<LancamentoFormPage />} />
              <Route path="/documentos" element={<DocumentosPage />} />
              <Route path="/documentos/novo" element={<DocumentoFormPage />} />
              <Route path="/documentos/:id/editar" element={<DocumentoFormPage />} />
              <Route path="/notificacoes" element={<NotificacoesPage />} />
              <Route path="/auditoria" element={<AuditoriaPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {isMobileNav ? <MobileBottomNav /> : null}
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const { authRequired, isAuthenticated, recoveryRequired } = useAuth()
  // getRepositoryRuntimeState() só reflete o estado atual quando o
  // componente re-renderiza — sem isto, um erro de sincronização (ex.:
  // CONFLICT_DETECTED) ficava preso na tela para sempre, mesmo depois de
  // resolvido, porque nada forçava um novo render após tentar de novo.
  const [persistenceTick, setPersistenceTick] = useState(0)
  const [retryingPersistence, setRetryingPersistence] = useState(false)
  const persistenceState = getRepositoryRuntimeState()
  const [isMobileNav, setIsMobileNav] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })

  const handleRetryPersistence = async () => {
    setRetryingPersistence(true)
    await bootstrapPersistence()
    setRetryingPersistence(false)
    setPersistenceTick((tick) => tick + 1)
  }

  useEffect(() => {
    if (authRequired && !isAuthenticated) {
      return
    }

    inicializarPatrimonios()
    inicializarUnidades()
    inicializarLocatarios()
    inicializarContratos()
    inicializarContas()
    inicializarImobiliarias()
    aplicarTemaConfigurado()

    const onConfigUpdated = () => aplicarTemaConfigurado()
    window.addEventListener('cvholding_configuracoes_updated', onConfigUpdated)
    return () => {
      window.removeEventListener('cvholding_configuracoes_updated', onConfigUpdated)
    }
  }, [authRequired, isAuthenticated])

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => aplicarAriaLabelsCampos())
    const timer = window.setTimeout(() => aplicarAriaLabelsCampos(), 160)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(max-width: 768px)')
    const onChange = (event) => setIsMobileNav(event.matches)
    setIsMobileNav(media.matches)
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    }
    if (typeof media.addListener === 'function') {
      media.addListener(onChange)
      return () => media.removeListener(onChange)
    }
    return undefined
  }, [])

  if (recoveryRequired && location.pathname !== '/redefinir-senha') {
    return <Navigate to="/redefinir-senha" replace />
  }

  if (location.pathname === '/login') {
    return <LoginPage />
  }

  if (location.pathname === '/redefinir-senha') {
    return <ResetPasswordPage />
  }

  return (
    <AuthGuard>
      <AppShell
        isMobileNav={isMobileNav}
        persistenceState={persistenceState}
        onRetryPersistence={handleRetryPersistence}
        retryingPersistence={retryingPersistence}
        routeKey={location.pathname}
      />
    </AuthGuard>
  )
}
