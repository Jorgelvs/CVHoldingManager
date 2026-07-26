import React, { useMemo, useState } from 'react'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarCompetenciasFinanceiro, calcularIndicadoresCondominio, obterDetalhesCondominio } from '../services/condominioService.js'
import { formatarMoeda } from '../utils/financeiroUtils.js'

export default function CondominioPage() {
  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const competencias = useMemo(() => listarCompetenciasFinanceiro(), [])
  const [patrimonioId, setPatrimonioId] = useState(patrimonios[0]?.id || '')
  const [competencia, setCompetencia] = useState(competencias[competencias.length - 1] || '')

  const indicadores = useMemo(() => {
    if (!patrimonioId || !competencia) return null
    return calcularIndicadoresCondominio(patrimonioId, competencia)
  }, [patrimonioId, competencia])

  const detalhes = useMemo(() => {
    if (!patrimonioId || !competencia) return null
    return obterDetalhesCondominio(patrimonioId, competencia)
  }, [patrimonioId, competencia])

  const patrimonio = patrimonios.find((item) => item.id === patrimonioId)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Acompanhe o controle do condomínio por patrimônio e competência.</p>
          <h1>Condomínio</h1>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Patrimônio</label>
          <select value={patrimonioId} onChange={(event) => setPatrimonioId(event.target.value)}>
            <option value="">Selecione um patrimônio</option>
            {patrimonios.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Competência</label>
          <select value={competencia} onChange={(event) => setCompetencia(event.target.value)}>
            <option value="">Selecione uma competência</option>
            {competencias.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {!indicadores ? (
        <div className="empty-state">
          <h2>Selecione patrimônio e competência para ver os indicadores.</h2>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="summary-card">
              <strong>{formatarMoeda(indicadores.condominioPrevisto)}</strong>
              <span>Condomínio previsto</span>
            </div>
            <div className="summary-card">
              <strong>{formatarMoeda(indicadores.condominioRecebido)}</strong>
              <span>Condomínio recebido</span>
            </div>
            <div className="summary-card">
              <strong>{formatarMoeda(indicadores.condominioPendente)}</strong>
              <span>Condomínio pendente</span>
            </div>
            <div className="summary-card">
              <strong>{formatarMoeda(indicadores.inadimplencia)}</strong>
              <span>Inadimplência</span>
            </div>
            <div className="summary-card">
              <strong>{formatarMoeda(indicadores.despesasComunsPrevistas)}</strong>
              <span>Despesas do condomínio previstas</span>
            </div>
            <div className="summary-card">
              <strong>{formatarMoeda(indicadores.despesasComunsPagas)}</strong>
              <span>Despesas do condomínio pagas</span>
            </div>
          </div>

          <div className="summary-card">
            <h2>Detalhes</h2>
            <p>Patrimônio: {patrimonio?.nome || '-'}</p>
            <p>Competência: {competencia}</p>
            <p>Resultado previsto: {formatarMoeda(indicadores.resultadoPrevisto)}</p>
            <p>Saldo mensal: {formatarMoeda(indicadores.saldoMensal)}</p>
            <p>Aporte da holding: {formatarMoeda(indicadores.aporteHolding)}</p>
            <p>Percentual de cobertura: {indicadores.percentualCobertura === null ? '-' : `${indicadores.percentualCobertura.toFixed(2)}%`}</p>
          </div>

          <div className="summary-card">
            <h2>Rateios relacionados</h2>
            {detalhes?.rateiosRelacionados?.length > 0 ? (
              <ul>
                {detalhes.rateiosRelacionados.map((rateio) => (
                  <li key={rateio.id}>
                    {rateio.competencia} • {rateio.descricao} • {formatarMoeda(rateio.valorTotal)} • {rateio.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sem rateios relacionados.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
