import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verificarCodigoDuplicado } from '../services/unidadeService.js'
import FormSection from '../../patrimonios/components/FormSection.jsx'
import { gerarCodigoInternoSugestao } from '../utils/unidadeCodeUtils.js'

// Cadastro simplificado (13/09/2026): a tela pede só Patrimônio e Nome —
// tipo/finalidade/situação ganham um valor padrão sensato (editável em
// "Detalhes avançados") e "Código interno" nem aparece mais: é gerado
// sozinho a partir do patrimônio/tipo/nome no momento de salvar (ver
// handleSubmit / gerarCodigoInternoFallback).
const defaultForm = {
  patrimonioId: '',
  codigoInterno: '',
  nome: '',
  tipo: '',
  finalidade: 'Locação',
  situacao: 'Disponível',
  areaUtil: '',
  areaTotal: '',
  observacoes: '',
}

function normalizarSigla(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[^\w\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra) => palavra[0].toUpperCase())
    .join('')
    .slice(0, 3)
}

// Rede de segurança para quando gerarCodigoInternoSugestao não consegue
// sugerir nada (ex.: nome sem número no final, tipo fora do mapa conhecido)
// — garante um código interno único mesmo assim, já que várias telas usam
// "nome || codigoInterno" como rótulo de exibição.
function gerarCodigoInternoFallback({ codigoPatrimonio, nome, idAtual }) {
  const base = (codigoPatrimonio || 'U').trim().toUpperCase()
  const sigla = normalizarSigla(nome) || 'X'
  let codigo = `${base}-${sigla}`
  let contador = 1
  while (verificarCodigoDuplicado(codigo, idAtual)) {
    codigo = `${base}-${sigla}${contador}`
    contador += 1
  }
  return codigo
}

function sugerirTipoPorPatrimonio(patrimonio) {
  const base = `${patrimonio?.grupoPatrimonial || ''} ${patrimonio?.tipo || ''} ${patrimonio?.nome || ''}`.toLowerCase()
  if (base.includes('kitnet')) return 'Kitnet'
  if (base.includes('apart') || base.includes('edif')) return 'Apartamento'
  if (base.includes('casa')) return 'Casa'
  if (base.includes('loja')) return 'Loja'
  if (base.includes('sala')) return 'Sala'
  if (base.includes('galp')) return 'Galpão'
  if (base.includes('terreno')) return 'Terreno'
  return ''
}

export default function UnidadeForm({
  initialData = null,
  patrimonios,
  options,
  onSave,
  onCancel,
  headerLabel,
  submitLabel = 'Salvar unidade',
  lockPatrimonio = false,
  simplified = false,
}) {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [codigoSugestao, setCodigoSugestao] = useState('')
  const [codigoManualAlterado, setCodigoManualAlterado] = useState(false)
  const [mensagemPatrimonioSemCodigo, setMensagemPatrimonioSemCodigo] = useState('')

  const isEditingExisting = Boolean(initialData?.id)
  const patrimonioSelecionado = useMemo(
    () => patrimonios.find((patrimonio) => patrimonio.id === form.patrimonioId) || null,
    [patrimonios, form.patrimonioId],
  )

  useEffect(() => {
    if (initialData) {
      const nextForm = {
        ...defaultForm,
        ...initialData,
      }
      setForm(nextForm)
      setCodigoManualAlterado(Boolean(initialData.codigoInterno))
      setCodigoSugestao('')
      setMensagemPatrimonioSemCodigo('')
    }
  }, [initialData])

  useEffect(() => {
    if (isEditingExisting || codigoManualAlterado || !patrimonioSelecionado) {
      return
    }

    const sugestao = gerarCodigoInternoSugestao({
      codigoPatrimonio: patrimonioSelecionado.codigo,
      tipo: form.tipo,
      nome: form.nome,
    })

    if (sugestao) {
      setCodigoSugestao(sugestao)
      setForm((prev) => ({ ...prev, codigoInterno: sugestao }))
      setMensagemPatrimonioSemCodigo('')
      return
    }

    if (patrimonioSelecionado.codigo) {
      setCodigoSugestao('')
      setMensagemPatrimonioSemCodigo('')
      return
    }

    setCodigoSugestao('')
    setMensagemPatrimonioSemCodigo('O patrimônio selecionado não possui código interno. Cadastre ou informe o código da unidade.')
  }, [form.nome, form.patrimonioId, form.tipo, isEditingExisting, codigoManualAlterado, patrimonioSelecionado])

  useEffect(() => {
    if (isEditingExisting || !patrimonioSelecionado) return
    if (form.tipo) return

    // Cadastro simplificado: "Tipo" não aparece na tela por padrão, então
    // precisa sempre acabar com algum valor válido — nunca em branco. Usa a
    // sugestão baseada no patrimônio quando existe; senão cai em "Outro",
    // que fica disponível para ajuste em "Detalhes avançados".
    const tipoSugerido = sugerirTipoPorPatrimonio(patrimonioSelecionado) || 'Outro'

    setForm((prev) => ({
      ...prev,
      tipo: prev.tipo || tipoSugerido,
    }))
  }, [isEditingExisting, patrimonioSelecionado, form.tipo])

  const isDirty = useMemo(() => {
    if (!initialData) {
      return JSON.stringify(form) !== JSON.stringify(defaultForm)
    }
    return JSON.stringify(form) !== JSON.stringify({ ...defaultForm, ...initialData })
  }, [form, initialData])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty || submitting) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, submitting])

  const updateField = (key, value) => {
    if (key === 'codigoInterno') {
      setCodigoManualAlterado(true)
    }
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.patrimonioId) nextErrors.patrimonioId = 'Patrimônio obrigatório.'
    if (!form.nome.trim()) nextErrors.nome = 'Nome obrigatório.'
    if (!form.tipo) nextErrors.tipo = 'Tipo obrigatório.'
    if (!form.finalidade) nextErrors.finalidade = 'Finalidade obrigatória.'
    if (!form.situacao) nextErrors.situacao = 'Situação obrigatória.'
    if (form.codigoInterno.trim() && verificarCodigoDuplicado(form.codigoInterno, initialData?.id)) {
      nextErrors.codigoInterno = 'Já existe uma unidade com este código interno.'
    }
    const validarArea = (campo, valor) => {
      if (valor === '' || valor === null || valor === undefined) return
      const numero = Number(valor.toString().replace(',', '.'))
      if (Number.isNaN(numero) || numero < 0) {
        nextErrors[campo] = 'Informe um número igual ou maior que zero.'
      }
    }
    validarArea('areaUtil', form.areaUtil)
    validarArea('areaTotal', form.areaTotal)
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    if (!validate()) {
      setSubmitMessage({ type: 'error', text: 'Corrija os erros antes de salvar.' })
      return
    }

    setSubmitting(true)
    setSubmitMessage(null)
    try {
      const codigoInternoFinal = form.codigoInterno.trim() || gerarCodigoInternoFallback({
        codigoPatrimonio: patrimonioSelecionado?.codigo,
        nome: form.nome,
        idAtual: initialData?.id || null,
      })
      await onSave({
        ...form,
        codigoInterno: codigoInternoFinal,
        areaUtil: form.areaUtil || '',
        areaTotal: form.areaTotal || '',
      })
    } catch (error) {
      setSubmitMessage({ type: 'error', text: error?.message || 'Falha ao salvar unidade.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoltar = () => {
    if (isDirty && !submitting) {
      const confirmLeave = window.confirm('Existem alterações não salvas. Deseja sair desta tela?')
      if (!confirmLeave) return
    }
    navigate(-1)
  }

  return (
    <form className="patrimonio-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div>
          <h1>{headerLabel}</h1>
          <p className="page-subtitle">Preencha os dados básicos da unidade.</p>
        </div>
      </div>

      {submitMessage ? (
        <div className={`alert-box ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {submitMessage.text}
        </div>
      ) : null}

      <FormSection title="Dados da unidade" description="A unidade precisa estar vinculada a um patrimônio existente.">
        <div className="form-grid">
          <label className="form-field">
            <span>Patrimônio *</span>
            <select
              value={form.patrimonioId}
              onChange={(event) => updateField('patrimonioId', event.target.value)}
              disabled={lockPatrimonio}
            >
              <option value="">Selecione</option>
              {patrimonios.map((patrimonio) => (
                <option key={patrimonio.id} value={patrimonio.id}>
                  {patrimonio.nome}
                </option>
              ))}
            </select>
            {errors.patrimonioId ? <span className="field-error">{errors.patrimonioId}</span> : null}
          </label>
          <label className="form-field">
            <span>Nome *</span>
            <input value={form.nome} onChange={(event) => updateField('nome', event.target.value)} placeholder="Ex.: Kitnet 1" />
            {errors.nome ? <span className="field-error">{errors.nome}</span> : null}
          </label>
        </div>
      </FormSection>

      {/* Cadastro simplificado (13/09/2026): código interno, tipo, finalidade,
          situação e área têm valor padrão sensato e continuam disponíveis
          aqui, só ficam recolhidos por padrão. */}
      <details className="collapsible-card">
        <summary>
          <span className="collapsible-card-title">
            <span className="name">Detalhes avançados (opcional)</span>
          </span>
        </summary>
        <div className="collapsible-card-body">
          <FormSection title="Classificação" description="Tipo, finalidade e situação da unidade.">
            <div className="form-grid">
              <label className="form-field">
                <span>Tipo *</span>
                <select value={form.tipo} onChange={(event) => updateField('tipo', event.target.value)}>
                  <option value="">Selecione</option>
                  {options.tipos.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {errors.tipo ? <span className="field-error">{errors.tipo}</span> : null}
              </label>
              <label className="form-field">
                <span>Finalidade *</span>
                <select value={form.finalidade} onChange={(event) => updateField('finalidade', event.target.value)}>
                  <option value="">Selecione</option>
                  {options.finalidades.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {errors.finalidade ? <span className="field-error">{errors.finalidade}</span> : null}
              </label>
              <label className="form-field">
                <span>Situação *</span>
                <select value={form.situacao} onChange={(event) => updateField('situacao', event.target.value)}>
                  <option value="">Selecione</option>
                  {options.situacoes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {errors.situacao ? <span className="field-error">{errors.situacao}</span> : null}
              </label>
              <label className="form-field">
                <span>Código interno</span>
                <input
                  value={form.codigoInterno}
                  onChange={(event) => updateField('codigoInterno', event.target.value)}
                  placeholder="Gerado automaticamente se deixar em branco"
                />
                {codigoSugestao ? <small className="field-hint">Sugestão: {codigoSugestao}</small> : null}
                {mensagemPatrimonioSemCodigo ? <small className="field-hint">{mensagemPatrimonioSemCodigo}</small> : null}
                {errors.codigoInterno ? <span className="field-error">{errors.codigoInterno}</span> : null}
              </label>
            </div>
          </FormSection>

          <FormSection title="Área" description="Metragem da unidade, se quiser registrar.">
            <div className="form-grid">
              <label className="form-field">
                <span>Área útil</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.areaUtil}
                  onChange={(event) => updateField('areaUtil', event.target.value)}
                />
                {errors.areaUtil ? <span className="field-error">{errors.areaUtil}</span> : null}
              </label>
              <label className="form-field">
                <span>Área total</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.areaTotal}
                  onChange={(event) => updateField('areaTotal', event.target.value)}
                />
                {errors.areaTotal ? <span className="field-error">{errors.areaTotal}</span> : null}
              </label>
            </div>
          </FormSection>

          <FormSection title="Observações" description="Notas gerais sobre a unidade.">
            <label className="form-field form-field-full">
              <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} />
            </label>
          </FormSection>
        </div>
      </details>

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onCancel || handleVoltar}>
          Voltar
        </button>
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
