import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarRateios, processarRateio, reprocessarRateio, cancelarRateio } from '../services/rateioService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { formatarMoeda } from '../utils/financeiroUtils.js'

export default function RateioListPage() {
  const [rateios, setRateios] = useState([])
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    setRateios(listarRateios())
  }, [])

  const atualizarLista = () => setRateios(listarRateios())

  const mostrarErro = (erro) => {
    if (!erro) return
    const mensagem = typeof erro === 'string' ? erro : Object.values(erro)[0] || 'Erro ao executar a ação.'
    setAlert({ type: 'error', message: mensagem })
  }

  const handleProcessar = (rateio) => {
    const resultado = processarRateio(rateio.id, rateio)
    if (resultado.error) {
      mostrarErro(resultado.error)
      return
    }
    setAlert({ type: 'success', message: 'Rateio processado com sucesso.' })
    atualizarLista()
  }

  const handleReprocessar = (rateio) => {
    const resultado = reprocessarRateio(rateio.id, rateio)
    if (resultado.error) {
      mostrarErro(resultado.error)
      return
    }
    setAlert({ type: 'success', message: 'Rateio reprocessado com sucesso.' })
    atualizarLista()
  }

  const handleCancelar = (rateio) => {
    cancelarRateio(rateio.id)
    setAlert({ type: 'success', message: 'Rateio cancelado com sucesso.' })
    atualizarLista()
  }

  const patrimonios = listarPatrimonios()

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Gerencie os rateios de despesas por competência e patrimônio.</p>
          <h1>Rateios</h1>
        </div>
        <div className="details-actions">
          <Link to="/financeiro/rateios/novo" className="button button-primary">Novo rateio</Link>
          <Link to="/financeiro/condominio" className="button button-secondary">Ver condomínio</Link>
          <Link to="/financeiro" className="button button-secondary">Voltar ao financeiro</Link>
        </div>
      </div>

      {alert ? (
        <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div>
      ) : null}

      {rateios.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum rateio cadastrado ainda.</h2>
          <p>Crie um novo rateio para distribuir despesas entre unidades elegíveis.</p>
          <Link className="button button-primary" to="/financeiro/rateios/novo">Novo rateio</Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Competência</th>
                <th>Patrimônio</th>
                <th>Descrição</th>
                <th>Valor total</th>
                <th>Status</th>
                <th>Unidades</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rateios.map((item) => {
                const patrimonio = patrimonios.find((p) => p.id === item.patrimonioId)
                return (
                  <tr key={item.id}>
                    <td>{item.competencia}</td>
                    <td>{patrimonio?.nome || 'N/A'}</td>
                    <td>{item.descricao}</td>
                    <td>{formatarMoeda(item.valorTotal)}</td>
                    <td>{item.status}</td>
                    <td>{item.quantidadeUnidades}</td>
                    <td>
                      <Link className="button button-secondary" to={`/financeiro/rateios/${item.id}`}>Ver</Link>
                      <Link className="button button-secondary" to={`/financeiro/rateios/${item.id}/editar`}>Editar</Link>
                      {item.status === 'rascunho' ? (
                        <button type="button" className="button button-primary" onClick={() => handleProcessar(item)}>
                          Processar
                        </button>
                      ) : null}
                      {item.status === 'processado' ? (
                        <>
                          <button type="button" className="button button-secondary" onClick={() => handleReprocessar(item)}>
                            Reprocessar
                          </button>
                          <button type="button" className="button button-danger" onClick={() => handleCancelar(item)}>
                            Cancelar
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
