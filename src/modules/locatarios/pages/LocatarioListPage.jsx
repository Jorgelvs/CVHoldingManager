import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarLocatarios, atualizarLocatario, excluirLocatario } from '../services/locatarioService.js'
import { locatarioTemContratos } from '../../contratos/services/contratoService.js'
import { situacoesLocatario } from '../constants/locatarioConstants.js'
import EmptyState from '../../patrimonios/components/EmptyState.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'

export default function LocatarioListPage() {
  const [locatarios, setLocatarios] = useState([])
  const [search, setSearch] = useState('')
  const [situacaoFiltro, setSituacaoFiltro] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    setLocatarios(listarLocatarios())
  }, [])

  const atualizarLista = () => setLocatarios(listarLocatarios())

  const filtrados = useMemo(() => {
    return locatarios.filter((item) => {
      const termo = search.trim().toLowerCase()
      const matchesSearch =
        !termo ||
        item.nomeCompleto.toLowerCase().includes(termo) ||
        item.cpf.toLowerCase().includes(termo) ||
        item.telefone.toLowerCase().includes(termo) ||
        item.whatsapp.toLowerCase().includes(termo)
      const matchesSituacao = !situacaoFiltro || item.situacao === situacaoFiltro
      return matchesSearch && matchesSituacao
    })
  }, [locatarios, search, situacaoFiltro])

  const handleInativar = (locatario) => {
    setConfirm({ type: 'inativar', locatario })
  }

  const handleExcluir = (locatario) => {
    setConfirm({ type: 'excluir', locatario })
  }

  const confirmarAcao = () => {
    if (!confirm) return
    if (confirm.type === 'inativar') {
      atualizarLocatario(confirm.locatario.id, { situacao: 'Inativo' })
      setAlert({ type: 'success', message: 'Locatário inativado com sucesso.' })
    } else {
      const ok = excluirLocatario(confirm.locatario.id)
      if (ok) {
        setAlert({ type: 'success', message: 'Locatário excluído com sucesso.' })
      } else {
        setAlert({ type: 'error', message: 'Não foi possível excluir o locatário.' })
      }
    }
    atualizarLista()
    setConfirm(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Gestão dos locatários da C&V Holding.</p>
          <h1>Locatários</h1>
        </div>
        <Link to="/locatarios/novo" className="button button-primary">
          Novo locatário
        </Link>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Buscar por nome, CPF, telefone ou WhatsApp</label>
          <input type="search" value={search} placeholder="Digite nome, CPF, telefone ou WhatsApp" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Situação</label>
          <select value={situacaoFiltro} onChange={(event) => setSituacaoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {situacoesLocatario.map((situacao) => (
              <option key={situacao} value={situacao}>
                {situacao}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="page-header">
        <div className="dashboard-grid">
          <div className="summary-card">
            <strong>{filtrados.length}</strong>
            <span>Total</span>
          </div>
        </div>
      </div>

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum locatário encontrado"
          description="Cadastre um locatário para começar a gestão de contratos."
          actionLabel="Cadastrar locatário"
          actionLink="/locatarios/novo"
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>WhatsApp</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => {
                const hasContracts = locatarioTemContratos(item.id)
                return (
                  <tr key={item.id}>
                    <td>{item.nomeCompleto}</td>
                    <td>{item.cpf || '-'}</td>
                    <td>{item.telefone || '-'}</td>
                    <td>{item.whatsapp || '-'}</td>
                    <td>{item.situacao}</td>
                    <td className="table-actions">
                      <Link className="button button-secondary" to={`/locatarios/${item.id}`}>
                        Visualizar
                      </Link>
                      <Link className="button button-secondary" to={`/locatarios/${item.id}/editar`}>
                        Editar
                      </Link>
                      {item.situacao === 'Ativo' ? (
                        <button type="button" className="button button-secondary" onClick={() => handleInativar(item)}>
                          Inativar
                        </button>
                      ) : null}
                      {!hasContracts ? (
                        <button type="button" className="button button-danger" onClick={() => handleExcluir(item)}>
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
        title={confirm?.type === 'inativar' ? 'Confirmar inativação' : 'Confirmar exclusão'}
        message={
          confirm?.type === 'inativar'
            ? 'Tem certeza de que deseja inativar este locatário?'
            : 'Tem certeza de que deseja excluir este locatário?'
        }
        confirmLabel={confirm?.type === 'inativar' ? 'Inativar' : 'Excluir'}
        cancelLabel="Cancelar"
        onConfirm={confirmarAcao}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
