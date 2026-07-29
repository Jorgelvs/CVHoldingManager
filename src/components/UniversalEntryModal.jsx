import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import VoiceInput from './VoiceInput.jsx'
import EntryReview from './EntryReview.jsx'
import { interpretCommand } from '../utils/commandInterpreter.js'
import { listHistory, pushHistory } from '../utils/universalHistory.js'

export default function UniversalEntryModal({ open, onClose }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null)
  const [inputText, setInputText] = useState('')
  const [step, setStep] = useState('options')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [askingFieldIndex, setAskingFieldIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')

  const reviewData = useMemo(() => parsed, [parsed])

  const reset = () => {
    setMode(null)
    setInputText('')
    setStep('options')
    setParsed(null)
    setError('')
    setAskingFieldIndex(0)
    setCurrentAnswer('')
  }

  const closeModal = () => {
    reset()
    onClose()
  }

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode)
    setInputText('')
    setStep('input')
    setError('')
    setHistory(listHistory())
  }

  const handleInterpret = () => {
    setError('')
    const result = interpretCommand(inputText)
    if (!inputText.trim()) {
      setError('Digite ou fale um comando antes de interpretar.')
      return
    }
    if (!result || !result.action) {
      setError('Não consegui entender. Tente uma frase mais clara.')
      return
    }
    setParsed(result)
    // push to history for quick reuse
    try {
      pushHistory({ text: inputText, parsed: result })
      setHistory(listHistory())
    } catch {}

    if (!result.supported) {
      setError(result.humanMessage || 'Esta operação será suportada em breve.')
      return
    }

    if (result.missing && result.missing.length > 0) {
      // start conversation mode to ask missing fields one by one
      setAskingFieldIndex(0)
      setCurrentAnswer('')
      setStep('ask')
      return
    }

    setStep('pre-review')
    setTimeout(() => setStep('review'), 600)
  }

  const handleConfirm = () => {
    if (!reviewData) return
    const { action } = reviewData
    let path = '/'
    let state = { universalEntry: reviewData }

    if (action === 'aporte') path = '/financeiro/aportes/novo'
    else if (action === 'transferencia') path = '/financeiro/transferencias/novo'
    else if (action === 'caucao') path = '/financeiro/caucoes/novo'
    else if (action === 'lancamento') {
      const tipo = reviewData.tipo === 'receita' ? 'receita' : 'despesa'
      path = `/financeiro/${tipo}/nova`
    }

    closeModal()
    navigate(path, { state })
  }

  const questionForField = (field) => {
    switch (field) {
      case 'valor': return 'Qual o valor?'
      case 'patrimonio': return 'Qual imóvel (ex: Casa 3, Kitnet 4)?'
      case 'categoria': return 'Qual a categoria (ex: Hidráulica, Aluguel)?'
      case 'data': return 'Qual a data?'
      default: return 'Por favor informe:'
    }
  }

  const handleAnswer = () => {
    const field = parsed?.missing?.[askingFieldIndex]
    if (!field) return
    const ans = currentAnswer.trim()
    if (!ans) return
    // try to interpret the answer to extract possible values
    const sub = interpretCommand(ans)
    const updated = { ...parsed }
    if (field === 'valor' && sub.valor) updated.valor = sub.valor
    if (field === 'patrimonio') {
      if (sub.unidadeId) { updated.unidadeId = sub.unidadeId; updated.unidadeLabel = sub.unidadeLabel }
      else if (sub.patrimonioId) { updated.patrimonioId = sub.patrimonioId; updated.patrimonioLabel = sub.patrimonioLabel }
    }
    if (field === 'categoria' && sub.categoria) { updated.categoria = sub.categoria; updated.subcategoria = sub.subcategoria }
    if (field === 'data' && sub.date) { updated.date = sub.date; updated.dataCompetencia = sub.dataCompetencia }
    // remove the filled field from missing
    const remaining = (updated.missing || []).filter((m) => m !== field)
    updated.missing = remaining
    // rebuild labels
    const final = { ...updated, ...(() => ({ ...updated }))() }
    setParsed(final)
    setCurrentAnswer('')
    if (remaining.length === 0) {
      setStep('pre-review')
      setTimeout(() => setStep('review'), 600)
    } else {
      setAskingFieldIndex(askingFieldIndex + 1)
    }
  }

  const renderOptions = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>Escolha como registrar sua entrada universal.</p>
      <div className="universal-entry-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="button button-primary" onClick={() => handleSelectMode('digitar')}>
          Digitar
        </button>
        <button type="button" className="button button-secondary" onClick={() => handleSelectMode('falar')}>
          Falar
        </button>
      </div>
    </div>
  )

  const renderInput = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {history && history.length > 0 ? (
        <div>
          <label>Últimos comandos</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {history.map((h, idx) => (
              <button key={idx} type="button" className="button button-secondary" onClick={() => { setInputText(h.text); setError('') }}>
                {h.text.length > 30 ? h.text.slice(0,30)+'...' : h.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p>Use o campo abaixo para digitar ou ajustar o texto antes de interpretar.</p>
      <textarea
        className="universal-entry-textarea"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Ex: Despesa hidráulica na Casa 3, R$ 850,00, hoje, paga pelo Inter."
        style={{ minHeight: 140, resize: 'vertical' }}
      />
      {mode === 'falar' ? (
        <VoiceInput value={inputText} onChange={setInputText} />
      ) : null}
      {error ? <div className="field-error">{error}</div> : null}
      <div className="dialog-actions" style={{ position: 'sticky', bottom: 0, background: 'white', paddingTop: 8, marginTop: 8, borderTop: '1px solid #e5e4e7' }}>
        <button type="button" className="button button-secondary" onClick={reset}>
          Cancelar
        </button>
        <button type="button" className="button button-primary" onClick={handleInterpret}>
          Interpretar
        </button>
      </div>
    </div>
  )

  const renderAsk = () => {
    const field = parsed?.missing?.[askingFieldIndex]
    if (!field) return null
    return (
      <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p>{questionForField(field)}</p>
        <input type="text" value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} />
        <div className="dialog-actions" style={{ position: 'sticky', bottom: 0, background: 'white', paddingTop: 8, marginTop: 8, borderTop: '1px solid #e5e4e7' }}>
          <button type="button" className="button" onClick={() => setStep('input')}>Cancelar</button>
          <button type="button" className="button button-primary" onClick={handleAnswer}>Enviar</button>
        </div>
      </div>
    )
  }

  const renderReview = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reviewData?.humanMessage ? <div style={{ marginBottom: 8 }}>{reviewData.humanMessage}</div> : null}
      <EntryReview parsed={reviewData} />
      <div className="dialog-actions" style={{ position: 'sticky', bottom: 0, background: 'white', paddingTop: 8, marginTop: 8, borderTop: '1px solid #e5e4e7' }}>
        <button type="button" className="button button-secondary" onClick={() => setStep('input')}>
          Editar
        </button>
        <button type="button" className="button button-primary" onClick={handleConfirm} disabled={reviewData?.missing?.length > 0}>
          Confirmar e registrar
        </button>
      </div>
      {reviewData?.missing?.length > 0 ? (
        <div className="field-error">Preencha ou corrija os campos em destaque para continuar.</div>
      ) : null}
    </div>
  )

  return (
    <Modal open={open} title="Entrada Universal" onClose={closeModal}>
      {step === 'options' && renderOptions()}
      {step === 'input' && renderInput()}
      {step === 'ask' && renderAsk()}
      {step === 'pre-review' && <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><div>O sistema entendeu que você deseja registrar. A seguir, confirme os dados.</div></div>}
      {step === 'review' && renderReview()}
    </Modal>
  )
}
