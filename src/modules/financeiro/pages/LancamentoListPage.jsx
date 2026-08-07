import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, Filter, Plus, Search } from 'lucide-react'
import FinanceiroFilters from '../components/FinanceiroFilters.jsx'
import ResumoFinanceiro from '../components/ResumoFinanceiro.jsx'
import LancamentoCard from '../components/LancamentoCard.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'
import { listarLancamentos, buscarLancamentoPorId, cancelarLancamento, excluirLancamento } from '../services/financeiroService.js'
import { registrarBaixa, calcularSaldoPendente } from '../services/baixaService.js'
import { filtrarLancamentos, ordenarLancamentos, calcularTotalReceitas, calcularTotalDespesas, calcularResultado, calcularPendencias, calcularAtrasados, getDataConsiderada } from '../utils/financeiroUtils.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { buscarContaPorId } from '../services/contaService.js'
import ExportButtons from '../../reports/components/ExportButtons.jsx'
import { obterPreferenciasInterface } from '../../configuracoes/services/configuracaoService.js'

export default function LancamentoListPage() {
  const location = useLocation()
  const [filtros, setFiltros] = useState({})
  const [draftFiltros, setDraftFiltros] = useState({})
  const [lancamentos, setLancamentos] = useState([])
  const [alert, setAlert] = useState(null)
  const [confirmExcluir, setConfirmExcluir] = useState(null)
  const [confirmCancelar, setConfirmCancelar] = useState(null)
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false)

  const preferenciasInterface = useMemo(() => obterPreferenciasInterface(), [])
  const itensPorPagina = Number(preferenciasInterface?.itensPorPagina || 20)

  useEffect(() => {
    setLancamentos(listarLancamentos())
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const queryFilters = {
      periodoInicio: params.get('periodoInicio') || '',
      periodoFim: params.get('periodoFim') || '',
      contaFinanceiraId: params.get('contaFinanceiraId') || '',
      tipo: params.get('tipo') || '',
      status: params.get('status') || '',
      categoria: params.get('categoria') || '',
      subcategoria: params.get('subcategoria') || '',
      patrimonioId: params.get('patrimonioId') || '',
      unidadeId: params.get('unidadeId') || '',
      termo: params.get('termo') || '',
    }

    if (location.search) {
      setFiltros(queryFilters)
      setDraftFiltros(queryFilters)
    }
  }, [location.search])

  useEffect(() => {
    if (filtrosVisiveis) {
      setDraftFiltros(filtros)
    }
  }, [filtrosVisiveis])

  const atualizarLista = () => setLancamentos(listarLancamentos())

  const historicoFiltrado = useMemo(() => {
    return ordenarLancamentos(filtrarLancamentos(lancamentos, filtros))
  }, [lancamentos, filtros])

  const historicoPaginado = useMemo(() => historicoFiltrado.slice(0, itensPorPagina), [historicoFiltrado, itensPorPagina])

  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const unidades = useMemo(() => listarUnidades(), [])
  const categorias = useMemo(() => {
    return Array.from(new Set(lancamentos.map((item) => item.categoria).filter(Boolean)))
  }, [lancamentos])
  const subcategorias = useMemo(() => {
    return Array.from(new Set(lancamentos.map((item) => item.subcategoria).filter(Boolean)))
  }, [lancamentos])

  const totais = useMemo(() => {
    return {
      totalReceitas: calcularTotalReceitas(historicoFiltrado),
      totalDespesas: calcularTotalDespesas(historicoFiltrado),
      resultado: calcularResultado(historicoFiltrado),
      pendencias: calcularPendencias(historicoFiltrado),
      atrasados: calcularAtrasados(historicoFiltrado),
    }
  }, [historicoFiltrado])

  const handleChangeFiltro = (field, value) => {
    setDraftFiltros((current) => ({ ...current, [field]: value }))
  }

  const handleApplyFiltros = () => {
    setFiltros(draftFiltros)
  }

  const handleClearFiltros = () => {
    setDraftFiltros({})
    setFiltros({})
  }

  const handleMarcarPago = (lancamento) => {
    // Antes gravava status='pago' direto (sem registro de baixa formal: sem
    // histórico, sem possibilidade de estorno controlado, e correndo por
    // fora do fluxo que garante um único movimento de caixa por pagamento).
    // Agora reaproveita o mesmo caminho de baixaService usado na tela de
    // Baixa, com o valor pendente integral.
    const pendente = calcularSaldoPendente(lancamento.id)
    const valorPrincipal = pendente > 0 ? pendente : Number(lancamento.valor || 0)
    const resultado = registrarBaixa({
      lancamentoId: lancamento.id,
      data: new Date().toISOString().slice(0, 10),
      valorPrincipal,
      contaFinanceiraId: lancamento.contaFinanceiraId || null,
      observacao: 'Marcado como pago via listagem.',
    })

    if (resultado?.error) {
      setAlert({ type: 'error', message: resultado.error })
      return
    }

    atualizarLista()
    setAlert({ type: 'success', message: 'Lançamento marcado como pago.' })
  }

  const handleCancelar = () => {
    if (!confirmCancelar) return
    cancelarLancamento(confirmCancelar.id)
    atualizarLista()
    setAlert({ type: 'success', message: 'Lançamento cancelado.' })
    setConfirmCancelar(null)
  }

  const handleExcluir = () => {
    if (!confirmExcluir) return
    excluirLancamento(confirmExcluir.id)
    atualizarLista()
    setAlert({ type: 'success', message: 'Lançamento excluído.' })
    setConfirmExcluir(null)
  }

  return (
    <div className="page-content page-content-tight">
      <div className="page-header page-header-compact">
        <div className="page-title-block">
          <p className="page-subtitle page-subtitle-tight">Filtre e gerencie seus lançamentos financeiros.</p>
          <h1 className="page-title-tight">Lançamentos</h1>
        </div>
        <div className="header-actions-wrap">
          <ExportButtons
            title="Lançamentos"
            filename="lancamentos"
            periodo={filtros.periodo || ''}
            columns={[
              { key: 'descricao', label: 'Descrição' },
              { key: 'natureza', label: 'Natureza' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'categoria', label: 'Categoria' },
              { key: 'valor', label: 'Valor', type: 'currency' },
              { key: 'dataCompetencia', label: 'Data competência', type: 'date' },
              { key: 'dataVencimento', label: 'Data vencimento', type: 'date' },
              { key: 'dataPagamento', label: 'Data pagamento', type: 'date' },
              { key: 'dataConsiderada', label: 'Data considerada', type: 'date' },
              { key: 'status', label: 'Status' },
            ]}
            rows={historicoFiltrado.map((item) => ({
              ...item,
              valor: Number(item.valor || 0),
              natureza: item.tipo === 'receita' ? 'Receita' : 'Despesa',
              tipo: item.tipo,
              dataConsiderada: getDataConsiderada(item),
            }))}
          />
          <Link to="/financeiro/novo" className="button button-primary">
            <Plus size={16} /> Novo lançamento
          </Link>
        </div>
      </div>

      <ResumoFinanceiro {...totais} />

      <div className="filters-toggle-row">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => setFiltrosVisiveis((current) => !current)}
          aria-expanded={filtrosVisiveis}
        >
          <Filter size={14} /> Filtros {filtrosVisiveis ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {filtrosVisiveis ? (
        <FinanceiroFilters
          filtros={draftFiltros}
          onChange={handleChangeFiltro}
          onApply={handleApplyFiltros}
          onClear={handleClearFiltros}
          categorias={categorias}
          subcategorias={subcategorias}
          patrimonios={patrimonios}
          unidades={unidades}
        />
      ) : null}

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      {historicoFiltrado.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum lançamento financeiro cadastrado.</h2>
          <p>Cadastre a primeira receita ou despesa para iniciar o controle financeiro.</p>
          <Link className="button button-primary" to="/financeiro/novo">Novo lançamento</Link>
        </div>
      ) : (
        <div className="table-wrapper table-wrapper-tight">
          <table className="data-table data-table-fixed">
            <thead>
              <tr>
                <th className="col-lancamento-descricao">Descrição</th>
                <th className="col-lancamento-natureza">Natureza</th>
                <th className="col-lancamento-categoria">Categoria</th>
                <th className="col-lancamento-patrimonio">Patrimônio</th>
                <th className="col-lancamento-unidade">Unidade</th>
                <th className="col-lancamento-valor">Valor</th>
                <th className="col-lancamento-conta">Conta</th>
                <th className="col-lancamento-data">Data considerada</th>
                <th className="col-lancamento-status">Status</th>
                <th className="col-lancamento-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {historicoPaginado.map((item) => (
                <LancamentoCard
                  key={item.id}
                  lancamento={{ ...item, dataConsiderada: getDataConsiderada(item) }}
                  patrimonio={patrimonios.find((p) => p.id === item.patrimonioId)}
                  unidade={unidades.find((u) => u.id === item.unidadeId)}
                  conta={buscarContaPorId(item.contaFinanceiraId)}
                  onMarcarPago={(lancamento) => setConfirmCancelar(null) || handleMarcarPago(lancamento)}
                  onCancelar={(lancamento) => setConfirmCancelar(lancamento)}
                  onExcluir={(lancamento) => setConfirmExcluir(lancamento)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmCancelar)}
        title="Confirmar cancelamento"
        message="Tem certeza de que deseja cancelar este lançamento financeiro?"
        confirmLabel="Cancelar"
        cancelLabel="Voltar"
        onConfirm={handleCancelar}
        onCancel={() => setConfirmCancelar(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmExcluir)}
        title="Excluir lançamento"
        message="Tem certeza de que deseja excluir este lançamento financeiro? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmExcluir(null)}
      />
    </div>
  )
}
