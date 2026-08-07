import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarImobiliarias, atualizarImobiliaria, excluirImobiliaria, imobiliariaEmUsoPorContrato } from '../services/imobiliariaService.js'
import EmptyState from '../../patrimonios/components/EmptyState.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'

export default function ImobiliariaListPage() {
  const [imobiliarias, setImobiliarias] = useState([])
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    setImobiliarias(listarImobiliarias())
  }, [])

  const atualizarLista = () => setImobiliarias(listarImobiliarias())

  const filtradas = useMemo(() => {
    const termo = search.trim().toLowerCase()
    if (!termo) return imobiliarias
    return imobiliarias.filter((item) => item.nome.toLowerCase().includes(termo))
  }, [imobiliarias, search])

  const handleInativar = (imobiliaria) => setConfirm({ type: 'inativar', imobiliaria })
  const handleExcluir = (imobiliaria) => setConfirm({ type: 'excluir', imobiliaria })

  const confirmarAcao = () => {
    if (!confirm) return
    if (confirm.type === 'inativar') {
      atualizarImobiliaria(confirm.imobiliaria.id, { situacao: 'Inativa' })
      setAlert({ type: 'success', message: 'Imobiliária inativada com sucesso.' })
    } else {
      const ok = excluirImobiliaria(confirm.imobiliaria.id)
      setAlert(ok
        ? { type: 'success', message: 'Imobiliária excluída com sucesso.' }
        : { type: 'error', message: 'Não é possível excluir: existem contratos vinculados a esta imobiliária.' })
    }
    atualizarLista()
    setConfirm(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Imobiliárias parceiras e percentual de comissão de cada uma.</p>
          <h1>Imobiliárias</h1>
        </div>
        <Link to="/financeiro/imobiliarias/nova" className="button button-primary">
          Nova imobiliária
        </Link>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Buscar por nome</label>
          <input type="search" value={search} placeholder="Digite o nome" onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      {filtradas.length === 0 ? (
        <EmptyState
          title="Nenhuma imobiliária cadastrada"
          description="Cadastre as imobiliárias parceiras para calcular a comissão automaticamente."
          actionLabel="Cadastrar imobiliária"
          actionLink="/financeiro/imobiliarias/nova"
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Comissão</th>
                <th>Contato</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((item) => {
                const emUso = imobiliariaEmUsoPorContrato(item.id)
                return (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{Number(item.percentualComissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</td>
                    <td>{item.contato || item.telefone || item.email || '-'}</td>
                    <td>{item.situacao}</td>
                    <td className="table-actions">
                      <Link className="button button-secondary" to={`/financeiro/imobiliarias/${item.id}/editar`}>
                        Editar
                      </Link>
                      {item.situacao === 'Ativa' ? (
                        <button type="button" className="button button-secondary" onClick={() => handleInativar(item)}>
                          Inativar
                        </button>
                      ) : null}
                      {!emUso ? (
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
            ? 'Tem certeza de que deseja inativar esta imobiliária?'
            : 'Tem certeza de que deseja excluir esta imobiliária?'
        }
        confirmLabel={confirm?.type === 'inativar' ? 'Inativar' : 'Excluir'}
        cancelLabel="Cancelar"
        onConfirm={confirmarAcao}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
