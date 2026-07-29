import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buscarContaPorId, criarConta, atualizarConta } from '../services/contaService.js'

const initialState = {
  nome: '',
  tipo: 'banco',
  banco: '',
  agencia: '',
  numeroConta: '',
  saldoInicial: '0',
  dataSaldoInicial: new Date().toISOString().slice(0, 10),
  ativa: true,
  observacoes: '',
}

export default function ContaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(initialState)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    if (!id) return
    const conta = buscarContaPorId(id)
    if (!conta) {
      navigate('/financeiro/contas', { replace: true })
      return
    }
    setData({
      ...initialState,
      ...conta,
      saldoInicial: String(conta.saldoInicial ?? 0),
      dataSaldoInicial: conta.dataSaldoInicial || initialState.dataSaldoInicial,
    })
  }, [id, navigate])

  const title = useMemo(() => (id ? 'Editar conta financeira' : 'Nova conta financeira'), [id])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!data.nome.trim()) {
      setAlert({ type: 'error', text: 'Nome da conta é obrigatório.' })
      return
    }

    const payload = {
      ...data,
      nome: data.nome.trim(),
      saldoInicial: Number(data.saldoInicial || 0),
      ativa: Boolean(data.ativa),
      observacoes: data.observacoes || '',
    }

    if (id) {
      atualizarConta(id, payload)
    } else {
      criarConta(payload)
    }

    navigate('/financeiro/contas')
  }

  return (
    <form className="page-content" onSubmit={handleSubmit}>
      <div className="page-header">
        <div>
          <p className="page-subtitle">Cadastre ou edite uma conta financeira.</p>
          <h1>{title}</h1>
        </div>
      </div>

      {alert ? <div className={`alert-box ${alert.type === 'error' ? 'alert-error' : 'alert-success'}`}>{alert.text}</div> : null}

      <div className="form-section">
        <div className="form-grid">
          <div className="form-field">
            <label>Nome</label>
            <input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Tipo</label>
            <select value={data.tipo} onChange={(e) => setData({ ...data, tipo: e.target.value })}>
              <option value="banco">Banco</option>
              <option value="caixa">Caixa</option>
              <option value="carteira">Carteira</option>
              <option value="investimento">Investimento</option>
            </select>
          </div>
          <div className="form-field">
            <label>Banco</label>
            <input value={data.banco} onChange={(e) => setData({ ...data, banco: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Agência</label>
            <input value={data.agencia} onChange={(e) => setData({ ...data, agencia: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Número da conta</label>
            <input value={data.numeroConta} onChange={(e) => setData({ ...data, numeroConta: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Saldo inicial</label>
            <input type="number" step="0.01" value={data.saldoInicial} onChange={(e) => setData({ ...data, saldoInicial: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Data do saldo inicial</label>
            <input type="date" value={data.dataSaldoInicial} onChange={(e) => setData({ ...data, dataSaldoInicial: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Situação</label>
            <select value={data.ativa ? 'ativa' : 'inativa'} onChange={(e) => setData({ ...data, ativa: e.target.value === 'ativa' })}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </select>
          </div>
          <div className="form-field form-field-full">
            <label>Observações</label>
            <textarea value={data.observacoes} onChange={(e) => setData({ ...data, observacoes: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={() => navigate('/financeiro/contas')}>Voltar</button>
        <button type="submit" className="button button-primary">Salvar conta</button>
      </div>
    </form>
  )
}
