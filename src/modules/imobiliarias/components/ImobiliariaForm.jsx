import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormSection from '../../patrimonios/components/FormSection.jsx'
import { situacoesImobiliaria } from '../constants/imobiliariaConstants.js'

const defaultForm = {
  nome: '',
  percentualComissao: '',
  contato: '',
  telefone: '',
  email: '',
  situacao: 'Ativa',
  observacoes: '',
}

export default function ImobiliariaForm({ initialData = null, onSave, headerLabel }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [submitMessage, setSubmitMessage] = useState(null)

  useEffect(() => {
    if (initialData) {
      setForm({ ...defaultForm, ...initialData })
    }
  }, [initialData])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const resultado = onSave({
      ...form,
      nome: form.nome.trim(),
      percentualComissao: form.percentualComissao,
    })

    if (resultado?.error) {
      setSubmitMessage({ type: 'error', text: resultado.error })
    }
  }

  return (
    <form className="patrimonio-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div>
          <h1>{headerLabel}</h1>
          <p className="page-subtitle">
            Cadastre a imobiliária e o percentual de comissão. A comissão incide somente sobre aluguel e multa dos contratos vinculados a ela.
          </p>
        </div>
      </div>

      {submitMessage ? (
        <div className={`alert-box ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {submitMessage.text}
        </div>
      ) : null}

      <FormSection title="Dados da imobiliária" description="Nome e percentual de comissão.">
        <div className="form-grid">
          <label className="form-field">
            <span>Nome *</span>
            <input value={form.nome} onChange={(event) => updateField('nome', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Percentual de comissão (%) *</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.percentualComissao}
              onChange={(event) => updateField('percentualComissao', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Situação</span>
            <select value={form.situacao} onChange={(event) => updateField('situacao', event.target.value)}>
              {situacoesImobiliaria.map((situacao) => (
                <option key={situacao} value={situacao}>
                  {situacao}
                </option>
              ))}
            </select>
          </label>
        </div>
      </FormSection>

      <FormSection title="Contato" description="Informações de contato, opcional.">
        <div className="form-grid">
          <label className="form-field">
            <span>Pessoa de contato</span>
            <input value={form.contato} onChange={(event) => updateField('contato', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Telefone</span>
            <input value={form.telefone} onChange={(event) => updateField('telefone', event.target.value)} />
          </label>
          <label className="form-field">
            <span>E-mail</span>
            <input value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Observações" description="Observações adicionais.">
        <label className="form-field form-field-full">
          <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} />
        </label>
      </FormSection>

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
        <button className="button button-primary" type="submit">
          Salvar imobiliária
        </button>
      </div>
    </form>
  )
}
