import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listarLancamentos } from '../services/financeiroService.js'
import { listarContas } from '../services/contaService.js'
import { registrarBaixa } from '../services/baixaService.js'

export default function BaixaFormPage() {
  const [searchParams] = useSearchParams()
  const preLancId = searchParams.get('lancamentoId')
  const acaoPref = searchParams.get('acao')
  const navigate = useNavigate()

  const [lancamentos, setLancamentos] = useState([])
  const [contas, setContas] = useState([])
  const [lancamentoId, setLancamentoId] = useState(preLancId || '')
  const [data, setData] = useState(new Date().toISOString().slice(0,10))
  const [valorPrincipal, setValorPrincipal] = useState('')
  const [juros, setJuros] = useState('0')
  const [desconto, setDesconto] = useState('0')
  const [contaId, setContaId] = useState('')
  const [observacao, setObservacao] = useState('')
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    let all = listarLancamentos()
    if (acaoPref === 'recebimento') all = all.filter(l => l.tipo === 'receita' && (l.status === 'pendente' || l.status === 'parcial'))
    else if (acaoPref === 'pagamento') all = all.filter(l => l.tipo === 'despesa' && (l.status === 'pendente' || l.status === 'parcial'))
    setLancamentos(all)
    setContas(listarContas())
  }, [acaoPref])

  useEffect(() => {
    if (!contaId && contas.length > 0) setContaId(contas[0].id)
  }, [contas])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { lancamentoId, data, valorPrincipal: Number(valorPrincipal || 0), juros: Number(juros || 0), desconto: Number(desconto || 0), contaFinanceiraId: contaId, observacao }
    const res = registrarBaixa(payload)
    if (res && res.error) {
      setMensagem({ tipo: 'erro', texto: res.error })
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Baixa registrada com sucesso.' })
      setTimeout(() => navigate('/financeiro/lancamentos'), 800)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Registrar baixa de um lançamento (parcial ou total).</p>
          <h1>Registrar Baixa</h1>
        </div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label>Lançamento</label>
        <select value={lancamentoId} onChange={(e) => setLancamentoId(e.target.value)} required>
          <option value="">-- selecione --</option>
          {lancamentos.map((l) => (
            <option key={l.id} value={l.id}>{`${l.descricao} — ${l.tipo} — ${l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</option>
          ))}
        </select>

        <label>Conta</label>
        <select value={contaId} onChange={(e) => setContaId(e.target.value)} required>
          <option value="">-- selecione --</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <label>Data</label>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />

        <label>Valor principal</label>
        <input type="number" step="0.01" value={valorPrincipal} onChange={(e) => setValorPrincipal(e.target.value)} required />

        <label>Juros</label>
        <input type="number" step="0.01" value={juros} onChange={(e) => setJuros(e.target.value)} />

        <label>Desconto</label>
        <input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />

        <label>Observação</label>
        <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button button-primary" type="submit">Registrar baixa</button>
          <button className="button" type="button" onClick={() => navigate('/financeiro/lancamentos')}>Cancelar</button>
        </div>

        {mensagem && (
          <div className={`message ${mensagem.tipo === 'erro' ? 'error' : 'success'}`}>{mensagem.texto}</div>
        )}
      </form>
    </div>
  )
}
