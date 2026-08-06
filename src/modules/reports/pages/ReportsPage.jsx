import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExportButtons from '../components/ExportButtons.jsx'
import { getRelatoriosData } from '../services/reportService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { listarContas } from '../../financeiro/services/contaService.js'

const categorias = [
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'locacoes', label: 'Locações' },
  { key: 'patrimonial', label: 'Patrimonial' },
  { key: 'unidade', label: 'Unidade' },
]

const statusOptions = ['', 'pendente', 'pago', 'atrasado', 'cancelado', 'Ativo', 'Encerrado']
const tipoOptions = ['', 'receita', 'despesa']

function parseFiltersFromParams(searchParams) {
  return {
    periodoInicio: searchParams.get('periodoInicio') || '',
    periodoFim: searchParams.get('periodoFim') || '',
    patrimonioId: searchParams.get('patrimonioId') || '',
    unidadeId: searchParams.get('unidadeId') || '',
    contaFinanceiraId: searchParams.get('contaFinanceiraId') || '',
    status: searchParams.get('status') || '',
    tipo: searchParams.get('tipo') || '',
  }
}

function safeFormatPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0%'
  return `${number.toFixed(1)}%`
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categoria, setCategoria] = useState(() => searchParams.get('categoria') || 'financeiro')
  const [filters, setFilters] = useState(() => parseFiltersFromParams(searchParams))
  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const unidades = useMemo(() => listarUnidades(), [])
  const contas = useMemo(() => listarContas(), [])

  const data = useMemo(() => getRelatoriosData(filters), [filters])

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  React.useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('categoria', categoria)
    const campos = [
      'periodoInicio',
      'periodoFim',
      'patrimonioId',
      'unidadeId',
      'contaFinanceiraId',
      'status',
      'tipo',
    ]
    campos.forEach((campo) => {
      const valor = filters[campo]
      if (valor) next.set(campo, valor)
      else next.delete(campo)
    })
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [categoria, filters, searchParams, setSearchParams])

  const renderCategoryPanel = () => {
    switch (categoria) {
      case 'financeiro':
        return (
          <div className="summary-card">
            <div className="section-header">
              <strong>Relatório Financeiro</strong>
              <ExportButtons
                title="Relatório Financeiro"
                filename="relatorio-financeiro"
                periodo={`${filters.periodoInicio || 'início'} até ${filters.periodoFim || 'fim'}`}
                columns={financeiroColumns}
                rows={data.tables.lancamentos}
              />
            </div>
            {data.tables.lancamentos.length === 0 ? (
              <p>Nenhum lançamento encontrado para o período e filtros selecionados.</p>
            ) : (
              <div className="summary-grid compact-summary-grid">
                <div className="summary-card compact-card">
                  <strong>{data.financeiro.receitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  <span>Receitas</span>
                </div>
                <div className="summary-card compact-card">
                  <strong>{data.financeiro.despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  <span>Despesas</span>
                </div>
                <div className="summary-card compact-card">
                  <strong>{data.financeiro.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  <span>Resultado</span>
                </div>
                <div className="summary-card compact-card">
                  <strong>{data.financeiro.fluxoCaixa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  <span>Fluxo de caixa</span>
                </div>
              </div>
            )}
            <div className="data-table-wrapper">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Conta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tables.lancamentos.map((item) => (
                    <tr key={item.id}>
                      <td>{item.dataCompetencia || item.dataVencimento || '-'}</td>
                      <td>{item.descricao || '-'}</td>
                      <td>{item.tipo || '-'}</td>
                      <td>{Number(item.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{item.status || '-'}</td>
                      <td>{contas.find((c) => c.id === item.contaFinanceiraId)?.nome || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'locacoes':
        return (
          <div className="summary-card">
            <div className="section-header">
              <strong>Relatório de Locações</strong>
              <ExportButtons
                title="Relatório de Locações"
                filename="relatorio-locacoes"
                periodo={`${filters.periodoInicio || 'início'} até ${filters.periodoFim || 'fim'}`}
                columns={locacoesColumns}
                rows={data.tables.contratos}
              />
            </div>
            <div className="summary-grid compact-summary-grid">
              <div className="summary-card compact-card">
                <strong>{data.locacoes.contratosAtivos}</strong>
                <span>Contratos ativos</span>
              </div>
              <div className="summary-card compact-card">
                <strong>{data.locacoes.contratosEncerrados}</strong>
                <span>Contratos encerrados</span>
              </div>
              <div className="summary-card compact-card">
                <strong>{data.locacoes.vacancia.percentualVacancia.toFixed(1)}%</strong>
                <span>Vacância</span>
              </div>
              <div className="summary-card compact-card">
                <strong>{data.locacoes.inadimplenciaQuantidade}</strong>
                <span>Inadimplência</span>
              </div>
              <div className="summary-card compact-card">
                <strong>{data.locacoes.reajustes}</strong>
                <span>Reajustes</span>
              </div>
            </div>
            {data.tables.contratos.length === 0 ? (
              <p>Nenhum contrato encontrado para os filtros aplicados.</p>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Unidade</th>
                      <th>Situação</th>
                      <th>Início</th>
                      <th>Fim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.contratos.map((contrato) => (
                      <tr key={contrato.id}>
                        <td>{contrato.codigoInterno || '-'}</td>
                        <td>{unidades.find((u) => u.id === contrato.unidadeId)?.nome || '-'}</td>
                        <td>{contrato.situacao || '-'}</td>
                        <td>{contrato.dataInicio || '-'}</td>
                        <td>{contrato.dataFim || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      case 'patrimonial':
        return (
          <div className="summary-card">
            <div className="section-header">
              <strong>Relatório Patrimonial</strong>
              <ExportButtons
                title="Relatório Patrimonial"
                filename="relatorio-patrimonial"
                periodo={`${filters.periodoInicio || 'início'} até ${filters.periodoFim || 'fim'}`}
                columns={patrimonialColumns}
                rows={data.patrimonial.porPatrimonio}
              />
            </div>
            <div className="summary-grid compact-summary-grid">
              <div className="summary-card compact-card">
                <strong>{data.patrimonial.porPatrimonio.length}</strong>
                <span>Patrimônios analisados</span>
              </div>
              <div className="summary-card compact-card">
                <strong>{data.patrimonial.porPatrimonio.reduce((sum, item) => sum + item.receitas, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                <span>Receita total</span>
              </div>
            </div>
            {data.patrimonial.porPatrimonio.length === 0 ? (
              <p>Nenhum patrimônio encontrado para os filtros aplicados.</p>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Patrimônio</th>
                      <th>Receita</th>
                      <th>Despesa</th>
                      <th>Resultado</th>
                      <th>Ocupação</th>
                      <th>Rentabilidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.patrimonial.porPatrimonio.map((item) => (
                      <tr key={item.patrimonioId}>
                        <td>{item.patrimonioNome}</td>
                        <td>{item.receitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td>{item.despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td>{item.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td>{item.taxaOcupacao.toFixed(1)}%</td>
                        <td>{item.rentabilidade.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      case 'unidade':
        return (
          <div className="summary-card">
            <div className="section-header">
              <strong>Relatório por Unidade</strong>
              <ExportButtons
                title="Relatório por Unidade"
                filename="relatorio-unidade"
                periodo={`${filters.periodoInicio || 'início'} até ${filters.periodoFim || 'fim'}`}
                columns={unidadeColumns}
                rows={data.unidade.porUnidade}
              />
            </div>
            <div className="summary-grid compact-summary-grid">
              <div className="summary-card compact-card">
                <strong>{data.unidade.porUnidade.length}</strong>
                <span>Unidades analisadas</span>
              </div>
              <div className="summary-card compact-card">
                <strong>{safeFormatPercent(data.unidade.tempoMedioVacancia)}</strong>
                <span>Tempo médio de vacância</span>
              </div>
            </div>
            {data.unidade.porUnidade.length === 0 ? (
              <p>Nenhuma unidade encontrada para os filtros aplicados.</p>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Patrimônio</th>
                      <th>Receita</th>
                      <th>Despesa</th>
                      <th>Resultado</th>
                      <th>Ocupada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unidade.porUnidade.map((item) => (
                      <tr key={item.unidadeId}>
                        <td>{item.unidadeNome}</td>
                        <td>{item.patrimonioNome}</td>
                        <td>{item.receitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td>{item.despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td>{item.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td>{item.ocupada ? 'Sim' : 'Não'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  const financeiroColumns = [
    { key: 'dataCompetencia', label: 'Data', type: 'date' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'valor', label: 'Valor', type: 'currency' },
    { key: 'status', label: 'Status' },
    { key: 'contaFinanceiraId', label: 'Conta' },
  ]

  const locacoesColumns = [
    { key: 'codigoInterno', label: 'Código' },
    { key: 'unidadeId', label: 'Unidade' },
    { key: 'situacao', label: 'Situação' },
    { key: 'dataInicio', label: 'Início', type: 'date' },
    { key: 'dataFim', label: 'Fim', type: 'date' },
  ]

  const patrimonialColumns = [
    { key: 'patrimonioNome', label: 'Patrimônio' },
    { key: 'receitas', label: 'Receita', type: 'currency' },
    { key: 'despesas', label: 'Despesa', type: 'currency' },
    { key: 'resultado', label: 'Resultado', type: 'currency' },
    { key: 'taxaOcupacao', label: 'Taxa de ocupação' },
    { key: 'rentabilidade', label: 'Rentabilidade' },
  ]

  const unidadeColumns = [
    { key: 'unidadeNome', label: 'Unidade' },
    { key: 'patrimonioNome', label: 'Patrimônio' },
    { key: 'receitas', label: 'Receita', type: 'currency' },
    { key: 'despesas', label: 'Despesa', type: 'currency' },
    { key: 'resultado', label: 'Resultado', type: 'currency' },
    { key: 'ocupada', label: 'Ocupada' },
  ]

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Relatórios gerenciais para apoiar a gestão da C&V Holding.</p>
          <h1>Relatórios</h1>
        </div>
      </div>

      <div className="filters-panel" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="filter-group">
          <label>Categoria</label>
          <select value={categoria} onChange={(event) => setCategoria(event.target.value)}>
            {categorias.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Período início</label>
          <input type="date" value={filters.periodoInicio || ''} onChange={(event) => handleFilterChange('periodoInicio', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Período fim</label>
          <input type="date" value={filters.periodoFim || ''} onChange={(event) => handleFilterChange('periodoFim', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Patrimônio</label>
          <select value={filters.patrimonioId || ''} onChange={(event) => handleFilterChange('patrimonioId', event.target.value)}>
            <option value="">Todos</option>
            {patrimonios.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Unidade</label>
          <select value={filters.unidadeId || ''} onChange={(event) => handleFilterChange('unidadeId', event.target.value)}>
            <option value="">Todas</option>
            {unidades.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Conta financeira</label>
          <select value={filters.contaFinanceiraId || ''} onChange={(event) => handleFilterChange('contaFinanceiraId', event.target.value)}>
            <option value="">Todas</option>
            {contas.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status || ''} onChange={(event) => handleFilterChange('status', event.target.value)}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status || 'Todos'}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Tipo</label>
          <select value={filters.tipo || ''} onChange={(event) => handleFilterChange('tipo', event.target.value)}>
            {tipoOptions.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo || 'Todos'}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button type="button" className="button button-secondary" onClick={clearFilters}>Limpar filtros</button>
        </div>
      </div>

      {renderCategoryPanel()}
    </div>
  )
}
