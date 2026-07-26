import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verificarCodigoDuplicado } from '../services/unidadeService.js'
import FormSection from '../../patrimonios/components/FormSection.jsx'

const defaultForm = {
  patrimonioId: '',
  codigoInterno: '',
  nome: '',
  tipo: '',
  finalidade: '',
  situacao: '',
  areaUtil: '',
  areaTotal: '',
  observacoes: '',
}

export default function UnidadeForm({ initialData = null, patrimonios, options, onSave, headerLabel }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)

  useEffect(() => {
    if (initialData) {
      setForm({
        ...defaultForm,
        ...initialData,
      })
    }
  }, [initialData])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.patrimonioId) nextErrors.patrimonioId = 'Patrimônio obrigatório.'
    if (!form.codigoInterno.trim()) nextErrors.codigoInterno = 'Código interno obrigatório.'
    if (!form.nome.trim()) nextErrors.nome = 'Nome obrigatório.'
    if (!form.tipo) nextErrors.tipo = 'Tipo obrigatório.'
    if (!form.finalidade) nextErrors.finalidade = 'Finalidade obrigatória.'
    if (!form.situacao) nextErrors.situacao = 'Situação obrigatória.'
    if (form.codigoInterno.trim() && verificarCodigoDuplicado(form.codigoInterno, initialData?.id)) {
      nextErrors.codigoInterno = 'Já existe uma unidade com este código.'
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

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      setSubmitMessage({ type: 'error', text: 'Corrija os erros antes de salvar.' })
      return
    }
    onSave({
      ...form,
      codigoInterno: form.codigoInterno.trim(),
      areaUtil: form.areaUtil || '',
      areaTotal: form.areaTotal || '',
    })
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
            <select value={form.patrimonioId} onChange={(event) => updateField('patrimonioId', event.target.value)}>
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
            <span>Código interno *</span>
            <input
              value={form.codigoInterno}
              onChange={(event) => updateField('codigoInterno', event.target.value)}
            />
            {errors.codigoInterno ? <span className="field-error">{errors.codigoInterno}</span> : null}
          </label>
          <label className="form-field">
            <span>Nome *</span>
            <input value={form.nome} onChange={(event) => updateField('nome', event.target.value)} />
            {errors.nome ? <span className="field-error">{errors.nome}</span> : null}
          </label>
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
          <label className="form-field form-field-full">
            <span>Observações</span>
            <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} />
          </label>
        </div>
      </FormSection>

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
        <button className="button button-primary" type="submit">
          Salvar unidade
        </button>
      </div>
    </form>
  )
}
