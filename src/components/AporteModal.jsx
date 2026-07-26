import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { devolverAporte, converterAporte } from '../modules/financeiro/services/aporteService.js'

export default function AporteModal({ open, tipo, aporte, contas, onClose, onSaved }) {
  const [valor, setValor] = useState('')
  const [conta, setConta] = useState('')
  const [data] = useState(new Date().toISOString().slice(0,10))
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!aporte) return
    setValor(String(aporte.saldoEmAberto || 0))
    setConta(contas && contas[0] ? contas[0].id : '')
    setObservacao('')
    setError(null)
  }, [aporte, contas, tipo])

  if (!aporte) return null

  const saldo = Number(aporte.saldoEmAberto || 0)

  function validar() {
    const v = Number(valor || 0)
    if (v <= 0) return 'Valor deve ser maior que zero.'
    if (v > saldo) return 'Valor não pode ser maior que o saldo disponível.'
    if (!conta) return 'Selecione uma conta.'
    return null
  }

  async function handleSubmit(e) {
    e && e.preventDefault()
    const err = validar()
    if (err) { setError(err); return }
    if (tipo === 'devolver') {
      const res = devolverAporte(aporte.id, Number(valor), conta, observacao)
      if (res && res.error) { setError(res.error); return }
      onSaved && onSaved(res)
      onClose()
    } else if (tipo === 'converter') {
      const res = converterAporte(aporte.id, Number(valor), conta, observacao)
      if (res && res.error) { setError(res.error); return }
      onSaved && onSaved(res)
      onClose()
    }
  }

  return (
    <Modal open={open} title={tipo === 'devolver' ? 'Devolver aporte' : tipo === 'converter' ? 'Converter aporte' : 'Aporte'} onClose={onClose}>
      <div>
        <p><strong>Valor original:</strong> {Number(aporte.valorOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Valor devolvido:</strong> {Number(aporte.valorDevolvido||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Valor convertido:</strong> {(Number(aporte.valorOriginal||0) - Number(aporte.saldoEmAberto||0) - Number(aporte.valorDevolvido||0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Saldo disponível:</strong> {Number(aporte.saldoEmAberto||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>Data</label>
          <input type="date" value={data} readOnly />

          <label>Valor</label>
          <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />

          <label>Conta financeira</label>
          <select value={conta} onChange={(e) => setConta(e.target.value)}>
            <option value="">-- selecione --</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          <label>Observação (opcional)</label>
          <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

          {error && <div className="message error">{error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button button-primary" type="submit">Confirmar</button>
            <button className="button" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
