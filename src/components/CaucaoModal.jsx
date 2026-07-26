import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { aplicarCaucao, utilizarCaucao, devolverCaucao } from '../modules/financeiro/services/caucaoService.js'

export default function CaucaoModal({ open, tipo, caucao, contas, onClose, onSaved }) {
  const [valor, setValor] = useState('')
  const [conta, setConta] = useState('')
  const [data] = useState(new Date().toISOString().slice(0,10))
  const [descricao, setDescricao] = useState('')
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!caucao) return
    setValor(String(caucao.saldoDisponivel || 0))
    setConta(contas && contas[0] ? contas[0].id : '')
    setObservacao('')
    setDescricao('')
    setError(null)
  }, [caucao, contas, tipo])

  if (!caucao) return null

  const saldo = Number(caucao.saldoDisponivel || 0)

  function validar() {
    const v = Number(valor || 0)
    if (v <= 0) return 'Valor deve ser maior que zero.'
    if (v > saldo) return 'Valor não pode ser maior que o saldo disponível.'
    if (!conta) return 'Selecione uma conta.'
    return null
  }

  function handleSubmit(e) {
    e && e.preventDefault()
    const err = validar()
    if (err) { setError(err); return }
    if (tipo === 'aplicar') {
      // only allow applying to a caucao custodia account type validation is on service side
      const res = aplicarCaucao(caucao.id, conta)
      if (res && res.error) { setError(res.error); return }
      onSaved && onSaved(res)
      onClose()
    } else if (tipo === 'utilizar') {
      if (!descricao || descricao.trim().length === 0) { setError('Descrição obrigatória.'); return }
      const res = utilizarCaucao(caucao.id, Number(valor), observacao)
      if (res && res.error) { setError(res.error); return }
      onSaved && onSaved(res)
      onClose()
    } else if (tipo === 'devolver') {
      const res = devolverCaucao(caucao.id, Number(valor), conta, observacao)
      if (res && res.error) { setError(res.error); return }
      onSaved && onSaved(res)
      onClose()
    }
  }

  return (
    <Modal open={open} title={tipo === 'aplicar' ? 'Aplicar caução' : tipo === 'utilizar' ? 'Utilizar caução' : 'Devolver caução'} onClose={onClose}>
      <div>
        <p><strong>Contrato:</strong> {caucao.contratoId || '-'}</p>
        <p><strong>Saldo disponível:</strong> {Number(caucao.saldoDisponivel||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>Data</label>
          <input type="date" value={data} readOnly />

          <label>Valor</label>
          <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />

          <label>Conta</label>
          <select value={conta} onChange={(e) => setConta(e.target.value)}>
            <option value="">-- selecione --</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          {tipo === 'utilizar' && (
            <>
              <label>Descrição (obrigatória)</label>
              <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </>
          )}

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
