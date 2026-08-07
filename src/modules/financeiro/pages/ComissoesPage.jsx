import React, { useMemo, useState } from 'react'
import { listarComissoesDetalhadas, calcularResumoComissoesPorImobiliaria } from '../services/comissaoService.js'
import { listarImobiliarias } from '../../imobiliarias/services/imobiliariaService.js'
import { formatarMoeda } from '../utils/financeiroUtils.js'
import ExportButtons from '../../reports/components/ExportButtons.jsx'

function primeiroDiaMesAtual() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
}

function ultimoDiaMesAtual() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)
}

function primeiroDiaAnoAtual() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), 0, 1).toISOString().slice(0, 10)
}

function ultimoDiaAnoAtual() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), 11, 31).toISOString().slice(0, 10)
}

export default function ComissoesPage() {
  const [periodoInicio, setPeriodoInicio] = useState(primeiroDiaMesAtual())
  const [periodoFim, setPeriodoFim] = useState(ultimoDiaMesAtual())
  const [imobiliariaFiltro, setImobiliariaFiltro] = useState('')
  const [imobiliariaExpandida, setImobiliariaExpandida] = useState(null)

  const imobiliarias = useMemo(() => listarImobiliarias(), [])

  const resumo = useMemo(
    () => calcularResumoComissoesPorImobiliaria({ periodoInicio, periodoFim }),
    [periodoInicio, periodoFim],
  )

  const detalhes = useMemo(
    () => listarComissoesDetalhadas({ periodoInicio, periodoFim, imobiliariaId: imobiliariaFiltro }),
    [periodoInicio, periodoFim, imobiliariaFiltro],
  )

  const totalGeral = resumo.reduce((acc, item) => acc + item.totalComissao, 0)

  const aplicarMesAtual = () => {
    setPeriodoInicio(primeiroDiaMesAtual())
    setPeriodoFim(ultimoDiaMesAtual())
  }

  const aplicarAnoAtual = () => {
    setPeriodoInicio(primeiroDiaAnoAtual())
    setPeriodoFim(ultimoDiaAnoAtual())
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Comissão calculada sobre aluguel e multa dos contratos vinculados a cada imobiliária.</p>
          <h1>Comissões por imobiliária</h1>
        </div>
        <ExportButtons
          title="Comissões por imobiliária"
          filename="comissoes-imobiliarias"
          columns={[
            { key: 'imobiliariaNome', label: 'Imobiliária' },
            { key: 'percentualComissao', label: '% Comissão' },
            { key: 'totalBase', label: 'Base (aluguel+multa)', type: 'currency' },
            { key: 'totalComissao', label: 'Comissão', type: 'currency' },
            { key: 'quantidadeLancamentos', label: 'Lançamentos' },
          ]}
          rows={resumo}
        />
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Período início</label>
          <input type="date" value={periodoInicio} onChange={(event) => setPeriodoInicio(event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Período fim</label>
          <input type="date" value={periodoFim} onChange={(event) => setPeriodoFim(event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Imobiliária</label>
          <select value={imobiliariaFiltro} onChange={(event) => setImobiliariaFiltro(event.target.value)}>
            <option value="">Todas</option>
            {imobiliarias.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div className="filter-group" style={{ alignSelf: 'flex-end', display: 'flex', gap: 8 }}>
          <button type="button" className="button button-secondary" onClick={aplicarMesAtual}>Mês atual</button>
          <button type="button" className="button button-secondary" onClick={aplicarAnoAtual}>Ano atual</button>
        </div>
      </div>

      <div className="summary-card" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div><strong>Total de comissões no período</strong><div>{formatarMoeda(totalGeral)}</div></div>
        <div><strong>Imobiliárias com movimento</strong><div>{resumo.filter((item) => item.quantidadeLancamentos > 0).length}</div></div>
      </div>

      <div className="summary-card">
        <h2>Resumo por imobiliária</h2>
        {resumo.length === 0 ? (
          <p>Nenhuma imobiliária cadastrada. Cadastre uma imobiliária e vincule-a aos contratos para calcular comissões.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Imobiliária</th>
                  <th>% Comissão</th>
                  <th>Base (aluguel + multa)</th>
                  <th>Comissão</th>
                  <th>Lançamentos</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((item) => (
                  <tr key={item.imobiliariaId}>
                    <td>{item.imobiliariaNome}</td>
                    <td>{item.percentualComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</td>
                    <td>{formatarMoeda(item.totalBase)}</td>
                    <td>{formatarMoeda(item.totalComissao)}</td>
                    <td>{item.quantidadeLancamentos}</td>
                    <td>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setImobiliariaExpandida(imobiliariaExpandida === item.imobiliariaId ? null : item.imobiliariaId)}
                        disabled={item.quantidadeLancamentos === 0}
                      >
                        {imobiliariaExpandida === item.imobiliariaId ? 'Ocultar' : 'Ver lançamentos'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {imobiliariaExpandida ? (
        <div className="summary-card">
          <h2>Lançamentos considerados</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Contrato</th>
                  <th>Valor base</th>
                  <th>Comissão</th>
                </tr>
              </thead>
              <tbody>
                {detalhes.filter((item) => item.imobiliariaId === imobiliariaExpandida).map((item) => (
                  <tr key={item.lancamentoId}>
                    <td>{item.dataReferencia}</td>
                    <td>{item.descricao}</td>
                    <td>{item.categoria}</td>
                    <td>{item.contratoCodigo || '-'}</td>
                    <td>{formatarMoeda(item.valorBase)}</td>
                    <td>{formatarMoeda(item.valorComissao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
