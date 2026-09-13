import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import UniversalEntryButton from '../../../components/UniversalEntryButton.jsx'
import { getDashboardData, formatarValor } from '../services/dashboardService.js'

// Dashboard reduzido ao essencial (pedido de 13/09/2026: "não quero nada
// bonito, nem informações como se fosse apresentar para investidor ou
// sócio"). Sem gráficos, sem percentuais, sem seletor de período — mostra
// só o mês vigente (mês corrente, sempre) e o acumulado do ano fiscal
// (01/01 a 31/12 do ano corrente): Receita, Despesa por patrimônio e por
// unidade (quando existir), e Comissão a pagar por imobiliária. Consulta
// de um mês específico (independente do ano fiscal) fica em Financeiro >
// Dashboard, que tem seletor de mês/ano com os mesmos números.
export default function Dashboard() {
  const { dashboard, error } = useMemo(() => {
    const hoje = new Date()
    const periodo = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
    try {
      return { dashboard: getDashboardData(periodo), error: '' }
    } catch (err) {
      return { dashboard: null, error: err?.message || 'Erro ao carregar o dashboard.' }
    }
  }, [])

  if (error) {
    return (
      <div className="page-center" style={{ padding: 24, textAlign: 'center' }}>
        <h2>Erro ao carregar o dashboard</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!dashboard) {
    return <div className="page-center">Carregando dashboard...</div>
  }

  const hoje = new Date()
  const mesLabel = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
  const anoLabel = `01/01 a 31/12/${hoje.getFullYear()}`

  const comissaoPorMes = new Map(dashboard.comissoes.porImobiliaria.map((item) => [item.imobiliariaId, item.totalComissao]))

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Mês vigente ({mesLabel}) e acumulado no ano fiscal ({anoLabel}). Para consultar outro mês, veja <Link to="/financeiro">Financeiro &gt; Dashboard</Link>.</p>
          <h1>Dashboard</h1>
        </div>
        <UniversalEntryButton />
      </div>

      <div className="summary-card">
        <h2>Receita</h2>
        <table className="data-table">
          <tbody>
            <tr><td>Mês vigente</td><td>{formatarValor(dashboard.indicadores.receitas)}</td></tr>
            <tr><td>Ano fiscal</td><td>{formatarValor(dashboard.indicadores.receitasAnoAcumulado)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="summary-card">
        <h2>Despesa por patrimônio</h2>
        {dashboard.despesasDetalhe.porPatrimonio.length === 0 ? (
          <p>Nenhuma despesa lançada.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Patrimônio</th><th>Mês vigente</th><th>Ano fiscal</th></tr>
            </thead>
            <tbody>
              {dashboard.despesasDetalhe.porPatrimonio.map((item) => (
                <tr key={item.patrimonioId}>
                  <td>{item.nome}</td>
                  <td>{formatarValor(item.mes)}</td>
                  <td>{formatarValor(item.ano)}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{formatarValor(dashboard.indicadores.despesas)}</strong></td>
                <td><strong>{formatarValor(dashboard.indicadores.despesasAnoAcumulado)}</strong></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {dashboard.despesasDetalhe.porUnidade.length > 0 ? (
        <div className="summary-card">
          <h2>Despesa por unidade</h2>
          <table className="data-table">
            <thead>
              <tr><th>Unidade</th><th>Patrimônio</th><th>Mês vigente</th><th>Ano fiscal</th></tr>
            </thead>
            <tbody>
              {dashboard.despesasDetalhe.porUnidade.map((item) => (
                <tr key={item.unidadeId}>
                  <td>{item.nome}</td>
                  <td>{item.patrimonioNome}</td>
                  <td>{formatarValor(item.mes)}</td>
                  <td>{formatarValor(item.ano)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="summary-card">
        <h2>Comissão por imobiliária</h2>
        {dashboard.comissoes.porImobiliariaAnoAcumulado.length === 0 ? (
          <p>Nenhuma comissão de imobiliária no ano fiscal.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Imobiliária</th><th>Mês vigente</th><th>Ano fiscal</th></tr>
            </thead>
            <tbody>
              {dashboard.comissoes.porImobiliariaAnoAcumulado.map((item) => (
                <tr key={item.imobiliariaId}>
                  <td>{item.imobiliariaNome}</td>
                  <td>{formatarValor(comissaoPorMes.get(item.imobiliariaId) || 0)}</td>
                  <td>{formatarValor(item.totalComissao)}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{formatarValor(dashboard.comissoes.total)}</strong></td>
                <td><strong>{formatarValor(dashboard.comissoes.totalAnoAcumulado)}</strong></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
