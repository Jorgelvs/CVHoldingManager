import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { criarAporte } from '../services/aporteService.js'
import { listarContas } from '../services/contaService.js'

export default function AporteFormPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('temporario')
  const [conta, setConta] = useState('')
  const [contas, setContas] = useState([])

  const universalState = location.state?.universalEntry

  useEffect(() => { setContas(listarContas()) }, [])
  useEffect(() => {
    if (universalState?.contaId) {
      setConta(universalState.contaId)
    } else if (!conta && contas.length > 0) {
      setConta(contas[0].id)
    }
    if (universalState?.valor) {
      setValor(universalState.valor)
    }
  }, [contas, conta, universalState])

  const handleSubmit = (e) => {
    e.preventDefault()
    const res = criarAporte({ valor: Number(valor || 0), tipo, contaFinanceiraId: conta })
    if (res && res.error) alert(res.error)
    else { alert('Aporte criado.'); navigate('/financeiro/aportes') }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Registrar novo aporte.</p>
          <h1>Novo Aporte</h1>
        </div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label>Valor</label>
        <input type="number" step="0.01" value={valor} onChange={(e)=>setValor(e.target.value)} required />

        <label>Tipo</label>
        <select value={tipo} onChange={(e)=>setTipo(e.target.value)}>
          <option value="temporario">Temporário</option>
          <option value="definitivo">Definitivo</option>
        </select>

        <label>Conta</label>
        <select value={conta} onChange={(e)=>setConta(e.target.value)}>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button button-primary" type="submit">Criar aporte</button>
          <button className="button" type="button" onClick={()=>navigate('/financeiro/aportes')}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
