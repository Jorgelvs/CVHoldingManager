import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarContratos, alterarSituacaoContrato, excluirContrato } from '../services/contratoService.js'
import { situacoesContrato } from '../constants/contratoConstants.js'
import EmptyState from '../../patrimonios/components/EmptyState.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'

export default function ContratoListPage() {
  const [contratos, setContratos] = useState([])
  const [search, setSearch] = useState('')
  const [situacaoFiltro, setSituacaoFiltro] = useState('')
  const [patrimonioFiltro, setPatrimonioFiltro] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    setContratos(listarContratos())
  }, [])

  const atualizarLista = () => setContratos(listarContratos())

  const filtrados = useMemo(() => {
    return contratos.filter((item) => {
      const termo = search.trim().toLowerCase()
      const locatario = buscarLocatarioPorId(item.locatarioId)
      const unidade = buscarUnidadePorId(item.unidadeId)
      const patrimonio = buscarPatrimonioPorId(item.patrimonioId)
      const matchesSearch =
        !termo ||
        item.codigoInterno.toLowerCase().includes(termo) ||
        locatario?.nomeCompleto.toLowerCase().includes(termo) ||
        unidade?.nome.toLowerCase().includes(termo) ||
        patrimonio?.nome.toLowerCase().includes(termo)
      const matchesSituacao = !situacaoFiltro || item.situacao === situacaoFiltro
      const matchesPatrimonio = !patrimonioFiltro || item.patrimonioId === patrimonioFiltro
      return matchesSearch && matchesSituacao && matchesPatrimonio
    })
  }, [contratos, search, situacaoFiltro, patrimonioFiltro])

  const handleAction = (contrato, action) => {
    setConfirm({ contrato, action })
  }

  const confirmarAcao = () => {
    if (!confirm) return
    const { contrato, action } = confirm
    if (action === 'excluir') {
      const ok = excluirContrato(contrato.id)
      if (ok) {
        setAlert({ type: 'success', message: 'Contrato excluído com sucesso.' })
      } else {
        setAlert({ type: 'error', message: 'Não é possível excluir um contrato ativo.' })
      }
    } else {
      const result = alterarSituacaoContrato(contrato.id, action)
      if (result?.error) {
        setAlert({ type: 'error', message: result.error })
      } else {
        setAlert({ type: 'success', message: `Contrato ${action.toLowerCase()} com sucesso.` })
      }
    }
    atualizarLista()
    setConfirm(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Gestão de contratos vinculados a patrimônios e unidades.</p>
          <h1>Contratos</h1>
        </div>
        <Link to="/contratos/novo" className="button button-primary">
          Novo contrato
        </Link>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Buscar por código, locatário, unidade ou patrimônio</label>
          <input type="search" value={search} placeholder="Digite código, locatário, unidade ou patrimônio" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Situação</label>
          <select value={situacaoFiltro} onChange={(event) => setSituacaoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {situacoesContrato.map((situacao) => (
              <option key={situacao} value={situacao}>
                {situacao}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Patrimônio</label>
          <select value={patrimonioFiltro} onChange={(event) => setPatrimonioFiltro(event.target.value)}>
            <option value="">Todos</option>
            {Array.from(new Set(contratos.map((item) => buscarPatrimonioPorId(item.patrimonioId)?.id).filter(Boolean))).map((patrimonioId) => {
              const patrimonio = buscarPatrimonioPorId(patrimonioId)
              return patrimonio ? (
                <option key={patrimonio.id} value={patrimonio.id}>
                  {patrimonio.nome}
                </option>
              ) : null
            })}
          </select>
        </div>
      </div>

      <div className="page-header">
        <div className="dashboard-grid">
          <div className="summary-card">
            <strong>{filtrados.length}</strong>
            <span>Total de contratos</span>
          </div>
        </div>
      </div>

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum contrato encontrado"
          description="Cadastre um contrato para começar a gestão de locações."
          actionLabel="Cadastrar contrato"
          actionLink="/contratos/novo"
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Locatário</th>
                <th>Unidade</th>
                <th>Patrimônio</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => {
                const locatario = buscarLocatarioPorId(item.locatarioId)
                const unidade = buscarUnidadePorId(item.unidadeId)
                const patrimonio = buscarPatrimonioPorId(item.patrimonioId)
                return (
                  <tr key={item.id}>
                    <td>{item.codigoInterno}</td>
                    <td>{locatario?.nomeCompleto || 'N/A'}</td>
                    <td>{unidade?.nome || 'N/A'}</td>
                    <td>{patrimonio?.nome || 'N/A'}</td>
                    <td>{item.situacao}</td>
                    <td className="table-actions">
                      <Link className="button button-secondary" to={`/contratos/${item.id}`}>
                        Visualizar
                      </Link>
                      <Link className="button button-secondary" to={`/contratos/${item.id}/editar`}>
                        Editar
                      </Link>
                      {item.situacao === 'Rascunho' ? (
                        <button className="button button-primary" type="button" onClick={() => handleAction(item, 'Ativo')}>
                          Ativar
                        </button>
                      ) : null}
                      {item.situacao === 'Ativo' ? (
                        <button className="button button-secondary" type="button" onClick={() => handleAction(item, 'Encerrado')}>
                          Encerrar
                        </button>
                      ) : null}
                      {['Rascunho', 'Ativo'].includes(item.situacao) ? (
                        <button className="button button-danger" type="button" onClick={() => handleAction(item, 'Cancelado')}>
                          Cancelar
                        </button>
                      ) : null}
                      {item.situacao !== 'Ativo' ? (
                        <button className="button button-danger" type="button" onClick={() => handleAction(item, 'excluir')}>
                          Excluir
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.action === 'excluir'
            ? 'Confirmar exclusão'
            : `Confirmar ${confirm?.action.toLowerCase()}`
        }
        message={
          confirm?.action === 'excluir'
            ? 'Tem certeza de que deseja excluir este contrato?'
            : `Tem certeza de que deseja ${confirm?.action.toLowerCase()} este contrato?`
        }
        confirmLabel={confirm?.action === 'excluir' ? 'Excluir' : confirm?.action}
        cancelLabel="Cancelar"
        onConfirm={confirmarAcao}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
