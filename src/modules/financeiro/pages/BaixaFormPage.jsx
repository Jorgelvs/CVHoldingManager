import React, { useEffect, useMemo, useState } from 'react'
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

  const tituloAcao = acaoPref === 'recebimento' ? 'Registrar recebimento' : acaoPref === 'pagamento' ? 'Registrar pagamento' : 'Registrar baixa'
  const subtituloAcao = acaoPref === 'recebimento'
    ? 'Selecione uma receita pendente ou parcial para registrar o recebimento.'
    : acaoPref === 'pagamento'
      ? 'Selecione uma despesa pendente ou parcial para registrar o pagamento.'
      : 'Registrar baixa de um lançamento (parcial ou total).'

  const lancamentosDisponiveis = useMemo(() => {
    return listarLancamentos().filter((lancamento) => {
      const statusValido = lancamento.status === 'pendente' || lancamento.status === 'parcial'
      if (!statusValido) return false
      if (acaoPref === 'recebimento') return lancamento.tipo === 'receita'
      if (acaoPref === 'pagamento') return lancamento.tipo === 'despesa'
      return true
    })
  }, [acaoPref])

  const lancamentoSelecionadoValido = useMemo(
    () => lancamentosDisponiveis.some((item) => item.id === lancamentoId),
    [lancamentosDisponiveis, lancamentoId],
  )

  const formatarLancamento = (lancamento) => {
    const valor = Number(lancamento.valor || 0)
    return `${lancamento.descricao} — ${lancamento.tipo} — ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
  }

  useEffect(() => {
    setLancamentos(lancamentosDisponiveis)
    setContas(listarContas())
  }, [lancamentosDisponiveis])

  useEffect(() => {
    if (lancamentosDisponiveis.length === 0) {
      setLancamentoId('')
      return
    }

    if (lancamentoSelecionadoValido) return

    if (preLancId && lancamentosDisponiveis.some((item) => item.id === preLancId)) {
      setLancamentoId(preLancId)
      return
    }

    setLancamentoId('')
  }, [preLancId, lancamentoSelecionadoValido, lancamentosDisponiveis])

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
          <p className="page-subtitle">{subtituloAcao}</p>
          <h1>{tituloAcao}</h1>
        </div>
      </div>

      <form className="form-section" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="form-field">
            <span>Lançamento</span>
            <select value={lancamentoId} onChange={(e) => setLancamentoId(e.target.value)} required disabled={lancamentosDisponiveis.length === 0}>
              <option value="">{lancamentosDisponiveis.length === 0 ? '-- sem lançamentos disponíveis --' : '-- selecione --'}</option>
              {lancamentosDisponiveis.map((lancamento) => (
                <option key={lancamento.id} value={lancamento.id}>{formatarLancamento(lancamento)}</option>
              ))}
            </select>
            {lancamentosDisponiveis.length === 0 ? (
              <span className="field-error">
                Não há lançamentos disponíveis para {acaoPref === 'pagamento' ? 'pagamento' : acaoPref === 'recebimento' ? 'recebimento' : 'baixa'} no momento.
              </span>
            ) : null}
            {lancamentoId && !lancamentoSelecionadoValido ? (
              <span className="field-error">O lançamento selecionado não está mais disponível para esta operação.</span>
            ) : null}
          </label>

          <label className="form-field">
            <span>Conta</span>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} required>
              <option value="">-- selecione --</option>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>{conta.nome}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </label>

          <label className="form-field">
            <span>Valor principal</span>
            <input type="number" step="0.01" value={valorPrincipal} onChange={(e) => setValorPrincipal(e.target.value)} required />
          </label>

          <label className="form-field">
            <span>Juros</span>
            <input type="number" step="0.01" value={juros} onChange={(e) => setJuros(e.target.value)} />
          </label>

          <label className="form-field">
            <span>Desconto</span>
            <input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </label>

          <label className="form-field form-field-full">
            <span>Observação</span>
            <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={lancamentosDisponiveis.length === 0 || !lancamentoSelecionadoValido}>Registrar baixa</button>
          <button className="button button-secondary" type="button" onClick={() => navigate('/financeiro/lancamentos')}>Cancelar</button>
        </div>

        {mensagem && (
          <div className={`message ${mensagem.tipo === 'erro' ? 'error' : 'success'}`}>{mensagem.texto}</div>
        )}
      </form>
    </div>
  )
}
