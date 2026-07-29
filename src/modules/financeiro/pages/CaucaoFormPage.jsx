import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { criarCaucao } from '../services/caucaoService.js'
import { listarContas } from '../services/contaService.js'

export default function CaucaoFormPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [contratoId, setContratoId] = useState('')
  const [valor, setValor] = useState('')
  const [contaRecebimento, setContaRecebimento] = useState('')
  const [contaCustodia, setContaCustodia] = useState('')
  const [contas, setContas] = useState([])

  const universalState = location.state?.universalEntry

  useEffect(() => { setContas(listarContas()) }, [])
  useEffect(() => {
    if (universalState?.contaId) {
      setContaRecebimento(universalState.contaId)
    } else if (!contaRecebimento && contas.length > 0) {
      setContaRecebimento(contas[0].id)
    }
    if (!contaCustodia && contas.length > 1) {
      setContaCustodia(contas[1].id)
    }
    if (universalState?.valor) {
      setValor(universalState.valor)
    }
  }, [contas, contaCustodia, contaRecebimento, universalState])

  const handleSubmit = (e) => {
    e.preventDefault()
    const res = criarCaucao({ contratoId: contratoId || null, valor: Number(valor||0), contaRecebimentoId: contaRecebimento, contaCustodiaId: contaCustodia })
    if (res && res.error) alert(res.error)
    else { alert('Caução criada'); navigate('/financeiro/caucoes') }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Registrar nova caução vinculada a um contrato.</p>
          <h1>Nova Caução</h1>
        </div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label>Contrato ID (opcional)</label>
        <input type="text" value={contratoId} onChange={(e)=>setContratoId(e.target.value)} />

        <label>Valor</label>
        <input type="number" step="0.01" value={valor} onChange={(e)=>setValor(e.target.value)} required />

        <label>Conta de recebimento</label>
        <select value={contaRecebimento} onChange={(e)=>setContaRecebimento(e.target.value)}>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label>Conta de custódia (opcional)</label>
        <select value={contaCustodia} onChange={(e)=>setContaCustodia(e.target.value)}>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button button-primary" type="submit">Criar caução</button>
          <button className="button" type="button" onClick={()=>navigate('/financeiro/caucoes')}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
