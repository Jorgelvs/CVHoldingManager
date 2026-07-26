import React, { useEffect, useState } from 'react'
import { listarAportes, devolverAporte, converterAporte } from '../services/aporteService.js'
import { listarContas } from '../services/contaService.js'
import AporteModal from '../../../components/AporteModal.jsx'

export default function AporteListPage() {
  const [aportes, setAportes] = useState([])
  const [contas, setContas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipo, setModalTipo] = useState(null)
  const [selecionado, setSelecionado] = useState(null)

  useEffect(() => { setAportes(listarAportes()); setContas(listarContas()) }, [])

  function abrirModal(tipo, aporte) {
    setModalTipo(tipo)
    setSelecionado(aporte)
    setModalOpen(true)
  }

  function onSaved() {
    setAportes(listarAportes())
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Aportes temporários e definitivos.</p>
          <h1>Aportes</h1>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <a href="/financeiro/aportes/novo" className="button button-primary">Novo aporte</a>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Saldo</th>
              <th>Tipo</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {aportes.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.data}</td>
                <td>{Number(a.valorOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>{Number(a.saldoEmAberto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>{a.tipo}</td>
                <td>{a.situacao}</td>
                <td>
                  {a.tipo === 'temporario' && a.saldoEmAberto > 0 && (
                    <>
                      <button className="button button-secondary" onClick={() => abrirModal('converter', a)}>Converter</button>
                      <button className="button button-secondary" onClick={() => abrirModal('devolver', a)}>Devolver</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Contas (IDs para referência)</h3>
        <ul>
          {contas.map(c => <li key={c.id}>{c.id} — {c.nome}</li>)}
        </ul>
      </div>

      <AporteModal open={modalOpen} tipo={modalTipo} aporte={selecionado} contas={contas} onClose={() => setModalOpen(false)} onSaved={onSaved} />
    </div>
  )
}
