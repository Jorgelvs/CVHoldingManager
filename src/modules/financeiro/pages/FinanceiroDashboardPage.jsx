import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarContas, calcularSaldo } from '../services/contaService.js'
import { getDashboardData, formatarValor } from '../../dashboard/services/dashboardService.js'
import FilterPeriod from '../../dashboard/components/FilterPeriod.jsx'

// Consulta de um mês específico (13/09/2026 — pedido explícito: "se eu
// necessitar buscar informações de um mês em específico, independente do
// ano fiscal"). O Dashboard principal (/dashboard) sempre mostra o mês
// vigente + acumulado do ano fiscal; esta página deixa escolher qualquer
// mês/ano e mostra só os números daquele mês, sem misturar com acumulado.
// Reaproveita o mesmo cálculo do Dashboard (getDashboardData) para não ter
// duas fórmulas diferentes de "receita"/"despesa"/"comissão" no sistema.
export default function FinanceiroDashboardPage() {
  const hoje = new Date()
  const [periodo, setPeriodo] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 })

  const { dashboard, error } = useMemo(() => {
    try {
      return { dashboard: getDashboardData(periodo, ''), error: '' }
    } catch (err) {
      return { dashboard: null, error: err?.message || 'Erro ao carregar os dados do período.' }
    }
  }, [periodo])

  const contasResumo = useMemo(() => listarContas().map((c) => ({ id: c.id, nome: c.nome, saldo: calcularSaldo(c.id) })), [])

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Receita, despesa e comissão de um mês específico, à sua escolha.</p>
          <h1>Financeiro</h1>
        </div>
        <div className="details-actions">
          <Link to="/financeiro/receita/nova" className="button button-primary">Nova receita</Link>
          <Link to="/financeiro/despesa/nova" className="button button-secondary">Nova despesa</Link>
        </div>
      </div>

      <FilterPeriod periodo={periodo} onChange={(novo) => setPeriodo({ mes: Number(novo.mes), ano: Number(novo.ano) })} />

      {error ? (
        <div className="summary-card">
          <h2>Erro ao carregar</h2>
          <p>{error}</p>
        </div>
      ) : !dashboard ? (
        <div className="page-center">Carregando...</div>
      ) : (
        <>
          <div className="summary-card">
            <h2>Receita do mês</h2>
            <p><strong>{formatarValor(dashboard.indicadores.receitas)}</strong></p>
          </div>

          <div className="summary-card">
            <h2>Despesa por patrimônio</h2>
            {dashboard.despesasDetalhe.porPatrimonio.length === 0 ? (
              <p>Nenhuma despesa lançada neste mês.</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>Patrimônio</th><th>Valor</th></tr></thead>
                <tbody>
                  {dashboard.despesasDetalhe.porPatrimonio.map((item) => (
                    <tr key={item.patrimonioId}><td>{item.nome}</td><td>{formatarValor(item.mes)}</td></tr>
                  ))}
                  <tr><td><strong>Total</strong></td><td><strong>{formatarValor(dashboard.indicadores.despesas)}</strong></td></tr>
                </tbody>
              </table>
            )}
          </div>

          {dashboard.despesasDetalhe.porUnidade.length > 0 ? (
            <div className="summary-card">
              <h2>Despesa por unidade</h2>
              <table className="data-table">
                <thead><tr><th>Unidade</th><th>Patrimônio</th><th>Valor</th></tr></thead>
                <tbody>
                  {dashboard.despesasDetalhe.porUnidade.map((item) => (
                    <tr key={item.unidadeId}><td>{item.nome}</td><td>{item.patrimonioNome}</td><td>{formatarValor(item.mes)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="summary-card">
            <h2>Comissão por imobiliária</h2>
            {dashboard.comissoes.porImobiliaria.length === 0 ? (
              <p>Nenhuma comissão de imobiliária neste mês.</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>Imobiliária</th><th>Valor</th></tr></thead>
                <tbody>
                  {dashboard.comissoes.porImobiliaria.map((item) => (
                    <tr key={item.imobiliariaId}><td>{item.imobiliariaNome}</td><td>{formatarValor(item.totalComissao)}</td></tr>
                  ))}
                  <tr><td><strong>Total</strong></td><td><strong>{formatarValor(dashboard.comissoes.total)}</strong></td></tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="summary-card">
            <h2>Saldos por conta</h2>
            {contasResumo.length === 0 ? <p>Nenhuma conta cadastrada.</p> : (
              <table className="data-table">
                <thead><tr><th>Conta</th><th>Saldo</th></tr></thead>
                <tbody>
                  {contasResumo.map((c) => (
                    <tr key={c.id}><td>{c.nome}</td><td>{formatarValor(c.saldo)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="details-actions">
            <Link
              to={`/financeiro/lancamentos?periodoInicio=${dashboard.periodoInicio}&periodoFim=${dashboard.periodoFim}`}
              className="button button-secondary"
            >
              Ver lançamentos deste mês
            </Link>
            <Link to="/financeiro/rateios" className="button button-secondary">Rateios</Link>
            <Link to="/financeiro/condominio" className="button button-secondary">Condomínio</Link>
          </div>
        </>
      )}
    </div>
  )
}
