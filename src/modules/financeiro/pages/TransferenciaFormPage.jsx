import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarContas } from '../services/contaService.js'
import { criarTransferencia } from '../services/transferenciaService.js'

export default function TransferenciaFormPage() {
  const navigate = useNavigate()
  const [contas, setContas] = useState([])
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0,10))
  const [descricao, setDescricao] = useState('')
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => { setContas(listarContas()) }, [])
  useEffect(() => { if (!origem && contas.length>0) setOrigem(contas[0].id); if (!destino && contas.length>1) setDestino(contas[1].id) }, [contas])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!origem || !destino) return setMensagem({ tipo: 'erro', texto: 'Selecione contas de origem e destino.' })
    if (origem === destino) return setMensagem({ tipo: 'erro', texto: 'Contas devem ser diferentes.' })
    const v = Number(valor || 0)
    if (v <= 0) return setMensagem({ tipo: 'erro', texto: 'Valor inválido.' })
    const res = criarTransferencia({ origemContaId: origem, destinoContaId: destino, valor: v, data, descricao })
    if (res && res.transferenciaId) {
      setMensagem({ tipo: 'sucesso', texto: 'Transferência registrada.' })
      setTimeout(() => navigate('/financeiro/livro-caixa'), 800)
    } else {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar transferência.' })
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Registrar transferência entre contas.</p>
          <h1>Transferência</h1>
        </div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label>Conta origem</label>
        <select value={origem} onChange={(e)=>setOrigem(e.target.value)}>
          <option value="">-- selecione --</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label>Conta destino</label>
        <select value={destino} onChange={(e)=>setDestino(e.target.value)}>
          <option value="">-- selecione --</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label>Data</label>
        <input type="date" value={data} onChange={(e)=>setData(e.target.value)} />

        <label>Valor</label>
        <input type="number" step="0.01" value={valor} onChange={(e)=>setValor(e.target.value)} />

        <label>Descrição</label>
        <input type="text" value={descricao} onChange={(e)=>setDescricao(e.target.value)} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button button-primary" type="submit">Registrar transferência</button>
          <button className="button" type="button" onClick={()=>navigate('/financeiro/livro-caixa')}>Cancelar</button>
        </div>

        {mensagem && (<div className={`message ${mensagem.tipo === 'erro' ? 'error' : 'success'}`}>{mensagem.texto}</div>)}
      </form>
    </div>
  )
}
