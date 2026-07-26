import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FinanceiroFilters from '../components/FinanceiroFilters.jsx'
import ResumoFinanceiro from '../components/ResumoFinanceiro.jsx'
import LancamentoCard from '../components/LancamentoCard.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'
import { listarLancamentos, buscarLancamentoPorId, cancelarLancamento, excluirLancamento, atualizarLancamento } from '../services/financeiroService.js'
import { filtrarLancamentos, ordenarLancamentos, calcularTotalReceitas, calcularTotalDespesas, calcularResultado, calcularPendencias, calcularAtrasados } from '../utils/financeiroUtils.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'

export default function LancamentoListPage() {
  const [filtros, setFiltros] = useState({})
  const [lancamentos, setLancamentos] = useState([])
  const [alert, setAlert] = useState(null)
  const [confirmExcluir, setConfirmExcluir] = useState(null)
  const [confirmCancelar, setConfirmCancelar] = useState(null)

  useEffect(() => {
    setLancamentos(listarLancamentos())
  }, [])

  const atualizarLista = () => setLancamentos(listarLancamentos())

  const historicoFiltrado = useMemo(() => {
    return ordenarLancamentos(filtrarLancamentos(lancamentos, filtros))
  }, [lancamentos, filtros])

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
    setFiltros((current) => ({ ...current, [field]: value }))
  }

  const handleMarcarPago = (lancamento) => {
    const updated = { ...lancamento, status: 'pago', dataPagamento: new Date().toISOString().slice(0, 10) }
    atualizarLancamento(lancamento.id, updated)
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
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Filtre e gerencie seus lançamentos financeiros.</p>
          <h1>Lançamentos</h1>
        </div>
        <Link to="/financeiro/novo" className="button button-primary">Novo lançamento</Link>
      </div>

      <ResumoFinanceiro {...totais} />
      <FinanceiroFilters
        filtros={filtros}
        onChange={handleChangeFiltro}
        categorias={categorias}
        subcategorias={subcategorias}
        patrimonios={patrimonios}
        unidades={unidades}
      />

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      {historicoFiltrado.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum lançamento financeiro cadastrado.</h2>
          <p>Cadastre a primeira receita ou despesa para iniciar o controle financeiro.</p>
          <Link className="button button-primary" to="/financeiro/novo">Novo lançamento</Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Natureza</th>
                <th>Categoria</th>
                <th>Subcategoria</th>
                <th>Patrimônio</th>
                <th>Unidade</th>
                <th>Competência</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {historicoFiltrado.map((item) => (
                <LancamentoCard
                  key={item.id}
                  lancamento={item}
                  patrimonio={patrimonios.find((p) => p.id === item.patrimonioId)}
                  unidade={unidades.find((u) => u.id === item.unidadeId)}
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
