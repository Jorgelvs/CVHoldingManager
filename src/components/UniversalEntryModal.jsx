import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import VoiceInput from './VoiceInput.jsx'
import EntryReview from './EntryReview.jsx'
import { interpretCommand, refreshParsedEntry, resolveUnitFromCatalog, suggestUnitsFromCatalog } from '../utils/commandInterpreter.js'
import { listHistory, pushHistory } from '../utils/universalHistory.js'
import { consultarEntradaUniversal, executarLancamentoUniversal } from '../modules/financeiro/services/universalEntryFinanceiroService.js'

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function buildUnitCandidateLabel(item) {
  if (!item) return ''
  if (!item.patrimonioLabel) return item.nome || ''
  return `${item.nome || ''} - ${item.patrimonioLabel}`
}

function resolveCandidateChoice(answerText, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  const normalizedAnswer = normalizeText(answerText)
  if (!normalizedAnswer) return null

  const exactLabelMatch = candidates.filter((item) => normalizeText(buildUnitCandidateLabel(item)) === normalizedAnswer)
  if (exactLabelMatch.length === 1) return exactLabelMatch[0]

  const nameAndPatrimonioMatch = candidates.filter((item) => {
    const normalizedName = normalizeText(item.nome)
    const normalizedPatrimonio = normalizeText(item.patrimonioLabel)
    return normalizedName && normalizedPatrimonio && normalizedAnswer.includes(normalizedName) && normalizedAnswer.includes(normalizedPatrimonio)
  })
  if (nameAndPatrimonioMatch.length === 1) return nameAndPatrimonioMatch[0]

  return null
}

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [askAttempts, setAskAttempts] = useState({})
  const [askLimitField, setAskLimitField] = useState('')
  const [askAlternatives, setAskAlternatives] = useState([])
  const [queryResult, setQueryResult] = useState(null)
  const reviewTimeoutRef = useRef(null)
  const lastExecutionKeyRef = useRef('')

  const reviewData = useMemo(() => parsed, [parsed])

  const clearReviewTimeout = () => {
    if (reviewTimeoutRef.current) {
      window.clearTimeout(reviewTimeoutRef.current)
      reviewTimeoutRef.current = null
    }
  }

  const goToReview = () => {
    clearReviewTimeout()
    setStep('pre-review')
    reviewTimeoutRef.current = window.setTimeout(() => {
      reviewTimeoutRef.current = null
      setStep('review')
    }, 500)
  }

  const reset = () => {
    clearReviewTimeout()
    setMode(null)
    setInputText('')
    setStep('options')
    setParsed(null)
    setError('')
    setAskingFieldIndex(0)
    setCurrentAnswer('')
    setIsProcessing(false)
    setIsSubmitting(false)
    setAskAttempts({})
    setAskLimitField('')
    setAskAlternatives([])
    setQueryResult(null)
    lastExecutionKeyRef.current = ''
  }

  useEffect(() => {
    if (!open) clearReviewTimeout()
  }, [open])

  useEffect(() => () => clearReviewTimeout(), [])

  useEffect(() => {
    if (step !== 'ask') return
    if (!parsed) return

    const refreshed = refreshParsedEntry(parsed)
    const before = JSON.stringify(parsed.missing || [])
    const after = JSON.stringify(refreshed.missing || [])

    if (before !== after) {
      setParsed(refreshed)
      return
    }

    if ((refreshed.missing || []).length === 0) {
      if (refreshed.intentType === 'query') {
        handleRunQuery(refreshed)
      } else {
        goToReview()
      }
      return
    }

    if (askingFieldIndex >= (refreshed.missing || []).length || askingFieldIndex < 0) {
      setAskingFieldIndex(0)
    }
  }, [step, parsed, askingFieldIndex])

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

  const handleRunQuery = (candidate) => {
    try {
      const result = consultarEntradaUniversal(candidate)
      setQueryResult(result)
      setStep('query-result')
    } catch (err) {
      setError('Não foi possível executar a consulta agora.')
      setStep('input')
    }
  }

  const handleInterpret = () => {
    if (isProcessing) return
    setIsProcessing(true)
    setError('')

    if (!inputText.trim()) {
      setError('Digite ou fale um comando antes de interpretar.')
      setIsProcessing(false)
      return
    }

    const result = interpretCommand(inputText)
    setParsed(result)

    try {
      pushHistory({ text: inputText, parsed: result })
      setHistory(listHistory())
    } catch {
      // noop
    }

    if (!result.supported) {
      setError(result.humanMessage || 'Comando não suportado nesta sprint.')
      setIsProcessing(false)
      return
    }

    if (result.unidadeCatalogoVazio) {
      setStep('catalog-empty')
      setIsProcessing(false)
      return
    }

    if (result.missing && result.missing.length > 0) {
      setAskingFieldIndex(0)
      setCurrentAnswer('')
      setStep('ask')
      setAskAttempts({})
      setAskLimitField('')
      setAskAlternatives([])
      setIsProcessing(false)
      return
    }

    if (result.intentType === 'query') {
      handleRunQuery(result)
      setIsProcessing(false)
      return
    }

    goToReview()
    setIsProcessing(false)
  }

  const buildExecutionKey = (entry) => {
    return JSON.stringify({
      natureza: entry.natureza,
      valor: entry.valor,
      categoria: entry.categoria,
      subcategoria: entry.subcategoria,
      patrimonioId: entry.patrimonioId,
      unidadeId: entry.unidadeId,
      contaId: entry.contaId,
      dateIso: entry.dateIso,
      descricao: entry.descricao,
    })
  }

  const handleConfirm = () => {
    if (!reviewData || isSubmitting) return
    if ((reviewData.missing || []).length > 0) return

    const executionKey = buildExecutionKey(reviewData)
    if (lastExecutionKeyRef.current && lastExecutionKeyRef.current === executionKey) {
      setError('Este lançamento já foi confirmado nesta sessão.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const created = executarLancamentoUniversal(reviewData)
      if (created?.duplicate) {
        setError('Lançamento duplicado bloqueado para evitar registro em dobro.')
        setIsSubmitting(false)
        return
      }
      if (!created?.id) {
        setError('Não foi possível registrar o lançamento. Revise os dados e tente novamente.')
        setIsSubmitting(false)
        return
      }

      lastExecutionKeyRef.current = executionKey
      closeModal()
      navigate(`/financeiro/${created.id}`)
    } catch (err) {
      setError('Falha ao registrar lançamento. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  const handleEditInForm = () => {
    if (!reviewData) return
    const tipo = reviewData.natureza === 'receita' ? 'receita' : 'despesa'
    closeModal()
    navigate(`/financeiro/${tipo}/nova`, { state: { universalEntry: reviewData } })
  }

  const questionForField = (field) => {
    switch (field) {
      case 'natureza':
        return 'É uma receita ou despesa?'
      case 'valor':
        return 'Qual o valor? (ex: 850 ou 1.500,00)'
      case 'categoria':
        return 'Qual a categoria? (ex: Aluguel, Manutenção, Água)'
      case 'patrimonio':
        return 'Qual unidade/imóvel? (ex: Casa 3, Kitnet 7)'
      case 'confirmar_unidade': {
        const nomes = (parsed?.unidadeCandidates || []).map((item) => buildUnitCandidateLabel(item)).slice(0, 5)
        if (nomes.length > 0) {
          return `Encontrei mais de uma unidade. Qual é a correta? (${nomes.join(', ')})`
        }
        return 'Encontrei mais de uma unidade. Informe o nome completo da unidade.'
      }
      case 'conta':
        return 'Qual conta você quer consultar? (ex: Conta Corrente)'
      default:
        return 'Informe o dado pendente:'
    }
  }

  const canContinueWithoutUnit = useMemo(() => {
    const source = reviewData || parsed
    if (!source) return false
    if (source.intentType !== 'register') return false
    return !source.requiresPropertyLink
  }, [reviewData, parsed])

  const openFormForManualSelection = () => {
    if (parsed?.intentType === 'register') {
      handleEditInForm()
      return
    }
    setStep('input')
  }

  const goToUnitRegistration = () => {
    closeModal()
    navigate('/unidades/nova')
  }

  const handleAskLimitContinueWithoutUnit = () => {
    if (!canContinueWithoutUnit || !parsed) return
    const refreshed = refreshParsedEntry({
      ...parsed,
      missing: (parsed.missing || []).filter((item) => item !== 'patrimonio' && item !== 'confirmar_unidade'),
      unidadeAmbigua: false,
      unidadeNaoEncontrada: false,
    })
    setParsed(refreshed)
    setAskLimitField('')
    if (refreshed.intentType === 'query') {
      handleRunQuery(refreshed)
      return
    }
    setStep('review')
  }

  const applyAnswer = (base, field, answerText) => {
    const answerParsed = interpretCommand(answerText)
    const updated = { ...base }

    if (field === 'natureza') {
      if (answerParsed.natureza === 'receita' || answerParsed.natureza === 'despesa') {
        updated.natureza = answerParsed.natureza
        updated.tipo = answerParsed.natureza
      }
    }

    if (field === 'valor' && answerParsed.valor != null) {
      updated.valor = answerParsed.valor
    }

    if (field === 'categoria' && answerParsed.categoria) {
      updated.categoria = answerParsed.categoria
      updated.subcategoria = answerParsed.subcategoria
      updated.subcategoriaId = answerParsed.subcategoriaId || ''
      updated.subcategoriaLabel = answerParsed.subcategoriaLabel || answerParsed.subcategoria || ''
    }

    if (field === 'patrimonio' || field === 'confirmar_unidade') {
      const pickedCandidate = field === 'confirmar_unidade' ? resolveCandidateChoice(answerText, parsed?.unidadeCandidates || []) : null
      if (pickedCandidate) {
        updated.unidadeId = pickedCandidate.id
        updated.unidadeLabel = pickedCandidate.nome
        updated.patrimonioId = pickedCandidate.patrimonioId || updated.patrimonioId
        updated.patrimonioLabel = pickedCandidate.patrimonioLabel || updated.patrimonioLabel
        updated.unidadeAmbigua = false
        updated.unidadeNaoEncontrada = false
        updated.unidadeCandidates = []
      }

      const resolved = resolveUnitFromCatalog(answerText)
      if (!pickedCandidate && resolved.status === 'exact') {
        updated.unidadeId = resolved.unidadeId
        updated.unidadeLabel = resolved.unidadeLabel
        updated.patrimonioId = resolved.patrimonioId || updated.patrimonioId
        updated.patrimonioLabel = resolved.patrimonioLabel || updated.patrimonioLabel
        updated.unidadeAmbigua = false
        updated.unidadeNaoEncontrada = false
        updated.unidadeCandidates = []
      } else if (resolved.status === 'ambiguous') {
        updated.unidadeAmbigua = true
        updated.unidadeNaoEncontrada = false
        updated.unidadeCandidates = (resolved.matches || []).map((item) => ({ id: item.id, nome: item.nome, patrimonioId: item.patrimonioId }))
        updated.unidadeQuery = resolved.query
      } else if (resolved.status === 'not_found') {
        updated.unidadeNaoEncontrada = true
        updated.unidadeAmbigua = false
        updated.unidadeCandidates = []
        updated.unidadeQuery = resolved.query
      } else if (answerParsed.patrimonioId) {
        updated.patrimonioId = answerParsed.patrimonioId
        updated.patrimonioLabel = answerParsed.patrimonioLabel || updated.patrimonioLabel
      }
    }

    if (field === 'conta') {
      if (answerParsed.contaId) {
        updated.contaId = answerParsed.contaId
        updated.contaLabel = answerParsed.contaLabel
      }
    }

    const isFilled = (() => {
      if (field === 'natureza') return updated.natureza === 'receita' || updated.natureza === 'despesa'
      if (field === 'valor') return updated.valor != null && Number(updated.valor) > 0
      if (field === 'categoria') return Boolean(updated.categoria)
      if (field === 'patrimonio') return Boolean(updated.patrimonioId)
      if (field === 'confirmar_unidade') return Boolean(updated.unidadeId)
      if (field === 'conta') return Boolean(updated.contaId)
      return true
    })()

    const remaining = isFilled ? (updated.missing || []).filter((item) => item !== field) : (updated.missing || [])
    updated.missing = remaining

    return {
      updated,
      isFilled,
      answerParsed,
    }
  }

  const handleAnswer = () => {
    if (isProcessing) return
    setIsProcessing(true)

    const field = parsed?.missing?.[askingFieldIndex]
    if (!field) {
      setIsProcessing(false)
      return
    }

    const ans = currentAnswer.trim()
    if (!ans) {
      setIsProcessing(false)
      return
    }

    const { updated, isFilled } = applyAnswer(parsed, field, ans)
    const refreshed = refreshParsedEntry(updated)

    setParsed(refreshed)
    setCurrentAnswer('')

    if (!isFilled) {
      const nextAttempts = (askAttempts[field] || 0) + 1
      setAskAttempts((current) => ({ ...current, [field]: nextAttempts }))

      if ((field === 'patrimonio' || field === 'confirmar_unidade') && parsed) {
        const resolved = resolveUnitFromCatalog(ans)
        const alternatives = (resolved.matches || []).length > 0
          ? (resolved.matches || []).map((item) => buildUnitCandidateLabel(item))
          : suggestUnitsFromCatalog(ans)
        setAskAlternatives(alternatives)
      }

      if (nextAttempts >= 2) {
        setAskLimitField(field)
        setStep('ask-limit')
        setIsProcessing(false)
        return
      }

      setError('Não consegui identificar esse campo. Responda com uma informação mais objetiva.')
      setIsProcessing(false)
      return
    }

    setAskAttempts((current) => ({ ...current, [field]: 0 }))
    setError('')

    if ((refreshed.missing || []).length === 0) {
      if (refreshed.intentType === 'query') {
        handleRunQuery(refreshed)
      } else {
        goToReview()
      }
    } else {
      setAskingFieldIndex(0)
    }

    setIsProcessing(false)
  }

  const renderOptions = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>Escolha como deseja usar a Entrada Universal.</p>
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
            {history.map((item, idx) => (
              <button key={idx} type="button" className="button button-secondary" onClick={() => { setInputText(item.text); setError('') }}>
                {item.text.length > 30 ? `${item.text.slice(0, 30)}...` : item.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p>Descreva o comando financeiro completo.</p>
      <textarea
        className="universal-entry-textarea"
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        placeholder="Ex: Paguei 3000 eletricista casa 3"
        style={{ minHeight: 140, resize: 'vertical' }}
      />

      {mode === 'falar' ? <VoiceInput value={inputText} onChange={setInputText} /> : null}
      {error ? <div className="field-error">{error}</div> : null}

      <div className="dialog-actions universal-entry-sticky-actions">
        <button type="button" className="button button-secondary" onClick={reset}>
          Cancelar
        </button>
        <button type="button" className="button button-primary" onClick={handleInterpret}>
          {isProcessing ? 'Processando...' : 'Interpretar'}
        </button>
      </div>
    </div>
  )

  const renderAsk = () => {
    const field = parsed?.missing?.[askingFieldIndex]
    if (!field) {
      return (
        <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p>Recalculando pendências...</p>
          <div className="dialog-actions universal-entry-sticky-actions">
            <button type="button" className="button" onClick={() => setStep('input')}>Voltar</button>
          </div>
        </div>
      )
    }

    return (
      <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {parsed?.humanMessage ? <div>{parsed.humanMessage}</div> : null}
        <p>{questionForField(field)}</p>
        {askAlternatives.length > 0 ? <div>Alternativas no cadastro: {askAlternatives.join(', ')}</div> : null}
        <input type="text" value={currentAnswer} onChange={(event) => setCurrentAnswer(event.target.value)} />
        {error ? <div className="field-error">{error}</div> : null}
        <div className="dialog-actions universal-entry-sticky-actions">
          <button type="button" className="button" onClick={() => setStep('input')}>Cancelar</button>
          <button type="button" className="button button-primary" onClick={handleAnswer}>
            {isProcessing ? 'Processando...' : 'Enviar'}
          </button>
        </div>
      </div>
    )
  }

  const renderCatalogEmpty = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>Não existem unidades cadastradas para vincular esse lançamento.</p>
      <div className="dialog-actions universal-entry-sticky-actions">
        <button type="button" className="button button-primary" onClick={goToUnitRegistration}>Ir para cadastro de unidades</button>
        <button type="button" className="button button-secondary" onClick={openFormForManualSelection}>Selecionar no formulário</button>
        {canContinueWithoutUnit ? (
          <button type="button" className="button" onClick={handleAskLimitContinueWithoutUnit}>Continuar sem vínculo</button>
        ) : null}
        <button type="button" className="button" onClick={closeModal}>Cancelar</button>
      </div>
    </div>
  )

  const renderAskLimit = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>Não consegui concluir esse campo após duas tentativas.</p>
      {askAlternatives.length > 0 ? <div>Alternativas no cadastro: {askAlternatives.join(', ')}</div> : null}
      <div className="dialog-actions universal-entry-sticky-actions">
        <button type="button" className="button button-primary" onClick={openFormForManualSelection}>Selecionar no formulário</button>
        {canContinueWithoutUnit ? (
          <button type="button" className="button button-secondary" onClick={handleAskLimitContinueWithoutUnit}>Continuar sem vínculo</button>
        ) : null}
        <button type="button" className="button" onClick={reset}>Reiniciar</button>
        <button type="button" className="button" onClick={closeModal}>Cancelar</button>
      </div>
    </div>
  )

  const renderReview = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reviewData?.humanMessage ? <div style={{ marginBottom: 8 }}>{reviewData.humanMessage}</div> : null}
      <EntryReview parsed={reviewData} />
      {error ? <div className="field-error">{error}</div> : null}
      <div className="dialog-actions universal-entry-sticky-actions">
        <button type="button" className="button button-secondary" onClick={handleEditInForm}>
          Editar
        </button>
        <button type="button" className="button button-primary" onClick={handleConfirm} disabled={(reviewData?.missing || []).length > 0 || isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Confirmar e registrar'}
        </button>
        <button type="button" className="button" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      {(reviewData?.missing || []).length > 0 ? (
        <div className="field-error">Preencha os campos obrigatórios em destaque para continuar.</div>
      ) : null}
    </div>
  )

  const renderQueryResult = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h4 style={{ margin: 0 }}>{queryResult?.title || 'Consulta'}</h4>
      {(queryResult?.lines || []).length === 0 ? <p>Sem dados para exibir.</p> : null}
      {(queryResult?.lines || []).map((line, idx) => <p key={idx} style={{ margin: 0 }}>{line}</p>)}
      <div className="dialog-actions universal-entry-sticky-actions">
        <button type="button" className="button button-secondary" onClick={reset}>Nova consulta</button>
        <button type="button" className="button button-primary" onClick={closeModal}>Fechar</button>
      </div>
    </div>
  )

  const renderFallback = () => (
    <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>Não foi possível montar a tela da Entrada Universal neste momento.</p>
      <div className="dialog-actions universal-entry-sticky-actions">
        <button type="button" className="button button-secondary" onClick={reset}>Reiniciar</button>
        <button type="button" className="button button-primary" onClick={closeModal}>Fechar</button>
      </div>
    </div>
  )

  const renderStepContent = () => {
    if (step === 'options') return renderOptions()
    if (step === 'input') return renderInput()
    if (step === 'ask') return renderAsk()
    if (step === 'ask-limit') return renderAskLimit()
    if (step === 'catalog-empty') return renderCatalogEmpty()
    if (step === 'query-result') return renderQueryResult()
    if (step === 'pre-review') {
      return (
        <div className="universal-entry-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>Interpretação concluída. Revise os dados antes de confirmar.</div>
        </div>
      )
    }
    if (step === 'review') return renderReview()
    return renderFallback()
  }

  return (
    <Modal open={open} title="Entrada Universal" onClose={closeModal}>
      {renderStepContent()}
    </Modal>
  )
}
