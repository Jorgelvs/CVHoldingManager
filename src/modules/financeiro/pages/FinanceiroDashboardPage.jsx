import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarLancamentos } from '../services/financeiroService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { calcularTotalReceitas, calcularTotalDespesas, calcularResultado, calcularPendencias, calcularAtrasados, filtrarLancamentos, ordenarLancamentos, formatarMoeda, getStatusEfetivo, agruparPorPatrimonio } from '../utils/financeiroUtils.js'

export default function FinanceiroDashboardPage() {
  const [periodoInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const [periodoFim] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10))

  const lancamentos = useMemo(() => listarLancamentos(), [])
  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const unidades = useMemo(() => listarUnidades(), [])
  const lancamentosMes = useMemo(() => filtrarLancamentos(lancamentos, { periodoInicio, periodoFim }), [lancamentos, periodoInicio, periodoFim])
  const receitasMes = calcularTotalReceitas(lancamentosMes)
  const despesasMes = calcularTotalDespesas(lancamentosMes)
  const resultadoMes = calcularResultado(lancamentosMes)
  const pendencias = calcularPendencias(lancamentosMes)
  const atrasados = calcularAtrasados(lancamentosMes)

  const agrupadosPorPatrimonio = useMemo(() => agruparPorPatrimonio(lancamentosMes, unidades), [lancamentosMes, unidades])
  const resumoPorPatrimonio = useMemo(
    () =>
      Object.entries(agrupadosPorPatrimonio).map(([patrimonioId, itens]) => {
        const patrimonio = patrimonios.find((item) => item.id === patrimonioId)
        return {
          id: patrimonioId,
          nome: patrimonio?.nome || 'Sem patrimônio',
          totalReceitas: calcularTotalReceitas(itens),
          totalDespesas: calcularTotalDespesas(itens),
          resultado: calcularResultado(itens),
        }
      }),
    [agrupadosPorPatrimonio, patrimonios],
  )
  const resumoPorUnidade = useMemo(() => {
    const mapa = {}
    lancamentosMes.forEach((item) => {
      if (!item.unidadeId) return
      mapa[item.unidadeId] = mapa[item.unidadeId] || []
      mapa[item.unidadeId].push(item)
    })
    return Object.entries(mapa).map(([unidadeId, itens]) => {
      const unidade = unidades.find((item) => item.id === unidadeId)
      return {
        id: unidadeId,
        nome: unidade?.nome || 'Sem unidade',
        totalReceitas: calcularTotalReceitas(itens),
        totalDespesas: calcularTotalDespesas(itens),
        resultado: calcularResultado(itens),
      }
    })
  }, [lancamentosMes, unidades])

  const ultimos = ordenarLancamentos(lancamentosMes).slice(0, 5)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Resumo financeiro do mês atual.</p>
          <h1>Financeiro</h1>
        </div>
        <div className="details-actions">
          <Link to="/financeiro/receita/nova" className="button button-primary">Nova receita</Link>
          <Link to="/financeiro/despesa/nova" className="button button-secondary">Nova despesa</Link>
          <Link to="/financeiro/lancamentos" className="button button-secondary">Ver todos os lançamentos</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="summary-card">
          <strong>{formatarMoeda(receitasMes)}</strong>
          <span>Receitas do mês</span>
        </div>
        <div className="summary-card">
          <strong>{formatarMoeda(despesasMes)}</strong>
          <span>Despesas do mês</span>
        </div>
        <div className="summary-card">
          <strong>{formatarMoeda(resultadoMes)}</strong>
          <span>Resultado do mês</span>
        </div>
        <div className="summary-card">
          <strong>{formatarMoeda(pendencias)}</strong>
          <span>Pendências</span>
        </div>
        <div className="summary-card">
          <strong>{formatarMoeda(atrasados)}</strong>
          <span>Atrasos</span>
        </div>
      </div>

      <div className="summary-card">
        <h2>Resultado por patrimônio</h2>
        {resumoPorPatrimonio.length === 0 ? (
          <p>Nenhum lançamento financeiro cadastrado no período atual.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patrimônio</th>
                <th>Receitas</th>
                <th>Despesas</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {resumoPorPatrimonio.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{formatarMoeda(item.totalReceitas)}</td>
                  <td>{formatarMoeda(item.totalDespesas)}</td>
                  <td>{formatarMoeda(item.resultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resumoPorUnidade.length > 0 && (
        <div className="summary-card">
          <h2>Resultado por unidade</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Receitas</th>
                <th>Despesas</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {resumoPorUnidade.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{formatarMoeda(item.totalReceitas)}</td>
                  <td>{formatarMoeda(item.totalDespesas)}</td>
                  <td>{formatarMoeda(item.resultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="summary-card">
        <h2>Últimos lançamentos</h2>
        {ultimos.length === 0 ? (
          <p>Nenhum lançamento financeiro cadastrado no período atual.</p>
        ) : (
          <ul>
            {ultimos.map((item) => (
              <li key={item.id}>
                {item.descricao} - {item.tipo === 'receita' ? 'Receita' : 'Despesa'} - {formatarMoeda(item.valor)} - {getStatusEfetivo(item)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
