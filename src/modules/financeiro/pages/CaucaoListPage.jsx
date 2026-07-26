import React, { useEffect, useState } from 'react'
import { listarCaucoes, aplicarCaucao, utilizarCaucao, devolverCaucao } from '../services/caucaoService.js'
import { listarContas } from '../services/contaService.js'
import CaucaoModal from '../../../components/CaucaoModal.jsx'

export default function CaucaoListPage() {
  const [caucoes, setCaucoes] = useState([])
  const [contas, setContas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipo, setModalTipo] = useState(null)
  const [selecionado, setSelecionado] = useState(null)

  useEffect(() => { 
    const params = new URLSearchParams(window.location.search)
    const acao = params.get('acao')
    let c = listarCaucoes()
    if (acao === 'aplicar') c = c.filter(x => x.status === 'recebida_aguardando_aplicacao' || (x.status === 'aplicada' && (x.saldoDisponivel||0) > 0))
    setCaucoes(c)
    setContas(listarContas())
  }, [])

  function abrirModal(tipo, caucao) {
    setModalTipo(tipo)
    setSelecionado(caucao)
    setModalOpen(true)
  }

  function onSaved() {
    setCaucoes(listarCaucoes())
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Controle completo de cauções.</p>
          <h1>Cauções</h1>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <a href="/financeiro/caucoes/novo" className="button button-primary">Nova caução</a>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Contrato</th>
              <th>Valor</th>
              <th>Saldo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {caucoes.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.contratoId}</td>
                <td>{Number(c.valorRecebido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>{Number(c.saldoDisponivel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>{c.status}</td>
                <td>
                  <button className="button button-secondary" onClick={() => abrirModal('aplicar', c)}>Aplicar</button>
                  <button className="button button-secondary" onClick={() => abrirModal('utilizar', c)}>Utilizar</button>
                  <button className="button button-secondary" onClick={() => abrirModal('devolver', c)}>Devolver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Contas (IDs)</h3>
        <ul>
          {contas.map(c => <li key={c.id}>{c.id} — {c.nome}</li>)}
        </ul>
      </div>

      <CaucaoModal open={modalOpen} tipo={modalTipo} caucao={selecionado} contas={contas} onClose={() => setModalOpen(false)} onSaved={onSaved} />
    </div>
  )
}
