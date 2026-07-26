import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Locatarios from './pages/Locatarios.jsx'
import Contratos from './pages/Contratos.jsx'
import FinanceiroDashboardPage from './modules/financeiro/pages/FinanceiroDashboardPage.jsx'
import LancamentoListPage from './modules/financeiro/pages/LancamentoListPage.jsx'
import LancamentoFormPage from './modules/financeiro/pages/LancamentoFormPage.jsx'
import LancamentoViewPage from './modules/financeiro/pages/LancamentoViewPage.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Configuracoes from './pages/Configuracoes.jsx'
import PatrimonioListPage from './modules/patrimonios/pages/PatrimonioListPage.jsx'
import PatrimonioFormPage from './modules/patrimonios/pages/PatrimonioFormPage.jsx'
import PatrimonioDetalhesPage from './modules/patrimonios/pages/PatrimonioDetalhesPage.jsx'
import UnidadeListPage from './modules/unidades/pages/UnidadeListPage.jsx'
import UnidadeFormPage from './modules/unidades/pages/UnidadeFormPage.jsx'
import UnidadeViewPage from './modules/unidades/pages/UnidadeViewPage.jsx'
import LocatarioListPage from './modules/locatarios/pages/LocatarioListPage.jsx'
import LocatarioFormPage from './modules/locatarios/pages/LocatarioFormPage.jsx'
import LocatarioViewPage from './modules/locatarios/pages/LocatarioViewPage.jsx'
import ContratoListPage from './modules/contratos/pages/ContratoListPage.jsx'
import ContratoFormPage from './modules/contratos/pages/ContratoFormPage.jsx'
import ContratoViewPage from './modules/contratos/pages/ContratoViewPage.jsx'
import { inicializarPatrimonios } from './modules/patrimonios/services/patrimonioService.js'
import { inicializarUnidades } from './modules/unidades/services/unidadeService.js'
import { inicializarLocatarios } from './modules/locatarios/services/locatarioService.js'
import { inicializarContratos } from './modules/contratos/services/contratoService.js'

export default function App() {
  useEffect(() => {
    inicializarPatrimonios()
    inicializarUnidades()
    inicializarLocatarios()
    inicializarContratos()
  }, [])

  return (
    <div className="app-root">
      <Sidebar />
      <div className="main-area">
        <Header />
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patrimonios" element={<PatrimonioListPage />} />
            <Route path="/patrimonios/novo" element={<PatrimonioFormPage />} />
            <Route path="/patrimonios/:id" element={<PatrimonioDetalhesPage />} />
            <Route path="/patrimonios/:id/editar" element={<PatrimonioFormPage />} />
            <Route path="/unidades" element={<UnidadeListPage />} />
            <Route path="/unidades/nova" element={<UnidadeFormPage />} />
            <Route path="/unidades/:id" element={<UnidadeViewPage />} />
            <Route path="/unidades/:id/editar" element={<UnidadeFormPage />} />
            <Route path="/patrimonios/:id/unidades" element={<UnidadeListPage />} />
            <Route path="/patrimonios/:id/unidades/nova" element={<UnidadeFormPage />} />
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
            <Route path="/financeiro/novo" element={<LancamentoFormPage />} />
            <Route path="/financeiro/:tipo/nova" element={<LancamentoFormPage />} />
            <Route path="/financeiro/:id" element={<LancamentoViewPage />} />
            <Route path="/financeiro/:id/editar" element={<LancamentoFormPage />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
