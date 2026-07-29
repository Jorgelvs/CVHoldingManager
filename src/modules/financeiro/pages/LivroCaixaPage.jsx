import React, { useEffect, useState } from 'react'
import { listarMovimentos, estornarMovimento } from '../services/livroCaixaService.js'
import { buscarContaPorId } from '../services/contaService.js'
import ExportButtons from '../../reports/components/ExportButtons.jsx'
import Modal from '../../../components/Modal.jsx'

export default function LivroCaixaPage() {
  const [movs, setMovs] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [transferToEstornar, setTransferToEstornar] = useState(null)

  useEffect(() => {
    setMovs(listarMovimentos())
  }, [])

  function refresh() { setMovs(listarMovimentos()) }

  function formatarValor(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function nomeDaConta(contaId) {
    return buscarContaPorId(contaId)?.nome || 'Conta não cadastrada'
  }

  function transfers() {
    const byId = {}
    for (const m of movs) {
      if (!m.transferenciaId) continue
      byId[m.transferenciaId] = byId[m.transferenciaId] || []
      byId[m.transferenciaId].push(m)
    }
    return Object.entries(byId).map(([id, itens]) => ({ id, itens }))
  }

  function canEstornarTransfer(itens) {
    // cannot estornar if any of itens already has an estorno (search by estornoDeId)
    return itens.every(i => !movs.some(m => m.estornoDeId === i.id))
  }

  function handleEstornarTransfer(transferId) {
    const group = transfers().find(t => t.id === transferId)
    if (!group) return
    setTransferToEstornar(group)
    setConfirmOpen(true)
  }

  function confirmEstornarTransfer() {
    if (!transferToEstornar) return
    // estornar each movimento
    for (const m of transferToEstornar.itens) {
      // ensure not already estornado
      const already = movs.find(mm => mm.estornoDeId === m.id)
      if (!already) estornarMovimento(m.id, 'Estorno de transferência via interface')
    }
    refresh()
    setConfirmOpen(false)
    setTransferToEstornar(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Livro Caixa - movimentos financeiros efetivos.</p>
          <h1>Livro Caixa</h1>
        </div>
        <ExportButtons
          title="Livro Caixa"
          filename="livro-caixa"
          columns={[
            { key: 'data', label: 'Data', type: 'date' },
            { key: 'conta', label: 'Conta' },
            { key: 'origem', label: 'Origem' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'natureza', label: 'Natureza' },
            { key: 'valor', label: 'Valor', type: 'currency' },
          ]}
          rows={movs.map((mov) => ({
            ...mov,
            conta: nomeDaConta(mov.contaFinanceiraId),
            valor: Number(mov.valor || 0),
          }))}
        />
      </div>

      {movs.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum movimento registrado no Livro Caixa.</h2>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Conta</th>
                <th>Origem</th>
                <th>Descrição</th>
                <th>Natureza</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id}>
                  <td>{m.data}</td>
                  <td>{nomeDaConta(m.contaFinanceiraId)}</td>
                  <td>{m.origem}</td>
                  <td>{m.descricao}</td>
                  <td>{m.natureza}</td>
                  <td>{formatarValor(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h2>Transferências registradas</h2>
        {transfers().length === 0 ? <p>Nenhuma transferência registrada.</p> : (
          <table className="data-table">
            <thead><tr><th>Transferência</th><th>Detalhes</th><th>Ações</th></tr></thead>
            <tbody>
              {transfers().map(t => {
                const origem = t.itens.find((item) => item.natureza === 'saida')
                const destino = t.itens.find((item) => item.natureza === 'entrada')
                const valorTotal = t.itens.reduce((sum, item) => sum + Number(item.valor || 0), 0)
                return (
                  <tr key={t.id}>
                    <td>
                      <div>{`${nomeDaConta(origem?.contaFinanceiraId)} → ${nomeDaConta(destino?.contaFinanceiraId)}`}</div>
                      <small style={{ color: 'var(--text)' }}>{t.id}</small>
                    </td>
                    <td>
                      <div><strong>Origem:</strong> {nomeDaConta(origem?.contaFinanceiraId)}</div>
                      <div><strong>Destino:</strong> {nomeDaConta(destino?.contaFinanceiraId)}</div>
                      <div><strong>Valor:</strong> {formatarValor(valorTotal)}</div>
                    </td>
                    <td>
                      {canEstornarTransfer(t.itens) ? <button className="button button-danger" onClick={() => handleEstornarTransfer(t.id)}>Estornar transferência</button> : <span>Estornada</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={confirmOpen} title="Confirmar estorno de transferência" onClose={() => setConfirmOpen(false)}>
        <div>
          <p>Confirma o estorno da transferência e a geração de movimentos inversos?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button button-danger" onClick={() => confirmEstornarTransfer()}>Confirmar estorno</button>
            <button className="button" onClick={() => setConfirmOpen(false)}>Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
