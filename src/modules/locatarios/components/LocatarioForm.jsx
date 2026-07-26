import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cpfUnicoDisponivel } from '../services/locatarioService.js'
import FormSection from '../../patrimonios/components/FormSection.jsx'

const defaultForm = {
  nomeCompleto: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  telefone: '',
  whatsapp: '',
  email: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  nomePagador: '',
  cpfPagador: '',
  telefonePagador: '',
  observacoes: '',
  situacao: 'Ativo',
}

function validarEmail(email) {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validarCpfFormat(cpf) {
  if (!cpf) return true
  return /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/.test(cpf.replace(/\s+/g, ''))
}

function validarCep(cep) {
  if (!cep) return true
  return /^\d{5}-?\d{3}$/.test(cep.replace(/\s+/g, ''))
}

export default function LocatarioForm({ initialData = null, onSave, headerLabel }) {
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
    if (!form.nomeCompleto.trim()) {
      nextErrors.nomeCompleto = 'Nome obrigatório.'
    }
    if (form.cpf && !validarCpfFormat(form.cpf)) {
      nextErrors.cpf = 'CPF inválido.'
    } else if (form.cpf && !cpfUnicoDisponivel(form.cpf, initialData?.id)) {
      nextErrors.cpf = 'CPF já está em uso.'
    }
    if (form.email && !validarEmail(form.email)) {
      nextErrors.email = 'E-mail inválido.'
    }
    if (form.cep && !validarCep(form.cep)) {
      nextErrors.cep = 'CEP inválido.'
    }
    if (!form.situacao) {
      nextErrors.situacao = 'Situação obrigatória.'
    }
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
      cpf: form.cpf.trim(),
      email: form.email.trim(),
      nomeCompleto: form.nomeCompleto.trim(),
      situacao: form.situacao,
    })
  }

  return (
    <form className="patrimonio-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div>
          <h1>{headerLabel}</h1>
          <p className="page-subtitle">Preencha as informações básicas e de contato do locatário.</p>
        </div>
      </div>

      {submitMessage ? (
        <div className={`alert-box ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {submitMessage.text}
        </div>
      ) : null}

      <FormSection title="Dados pessoais" description="Informações do locatário." >
        <div className="form-grid">
          <label className="form-field">
            <span>Nome completo *</span>
            <input value={form.nomeCompleto} onChange={(event) => updateField('nomeCompleto', event.target.value)} />
            {errors.nomeCompleto ? <span className="field-error">{errors.nomeCompleto}</span> : null}
          </label>
          <label className="form-field">
            <span>CPF</span>
            <input value={form.cpf} onChange={(event) => updateField('cpf', event.target.value)} />
            {errors.cpf ? <span className="field-error">{errors.cpf}</span> : null}
          </label>
          <label className="form-field">
            <span>RG</span>
            <input value={form.rg} onChange={(event) => updateField('rg', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Data de nascimento</span>
            <input type="date" value={form.dataNascimento} onChange={(event) => updateField('dataNascimento', event.target.value)} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Contato" description="Informações de contato do locatário.">
        <div className="form-grid">
          <label className="form-field">
            <span>Telefone</span>
            <input value={form.telefone} onChange={(event) => updateField('telefone', event.target.value)} />
          </label>
          <label className="form-field">
            <span>WhatsApp</span>
            <input value={form.whatsapp} onChange={(event) => updateField('whatsapp', event.target.value)} />
          </label>
          <label className="form-field">
            <span>E-mail</span>
            <input value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>
          <label className="form-field">
            <span>Situação *</span>
            <select value={form.situacao} onChange={(event) => updateField('situacao', event.target.value)}>
              <option value="">Selecione</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
            {errors.situacao ? <span className="field-error">{errors.situacao}</span> : null}
          </label>
        </div>
      </FormSection>

      <FormSection title="Endereço" description="Endereço do locatário.">
        <div className="form-grid">
          <label className="form-field">
            <span>Endereço</span>
            <input value={form.endereco} onChange={(event) => updateField('endereco', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Número</span>
            <input value={form.numero} onChange={(event) => updateField('numero', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Complemento</span>
            <input value={form.complemento} onChange={(event) => updateField('complemento', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Bairro</span>
            <input value={form.bairro} onChange={(event) => updateField('bairro', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Cidade</span>
            <input value={form.cidade} onChange={(event) => updateField('cidade', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Estado</span>
            <input value={form.estado} onChange={(event) => updateField('estado', event.target.value)} />
          </label>
          <label className="form-field">
            <span>CEP</span>
            <input value={form.cep} onChange={(event) => updateField('cep', event.target.value)} />
            {errors.cep ? <span className="field-error">{errors.cep}</span> : null}
          </label>
        </div>
      </FormSection>

      <FormSection title="Dados do pagador" description="Informações do pagador, quando diferente do locatário.">
        <div className="form-grid">
          <label className="form-field">
            <span>Nome do pagador</span>
            <input value={form.nomePagador} onChange={(event) => updateField('nomePagador', event.target.value)} />
          </label>
          <label className="form-field">
            <span>CPF do pagador</span>
            <input value={form.cpfPagador} onChange={(event) => updateField('cpfPagador', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Telefone do pagador</span>
            <input value={form.telefonePagador} onChange={(event) => updateField('telefonePagador', event.target.value)} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Observações" description="Observações adicionais sobre o locatário.">
        <label className="form-field form-field-full">
          <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} />
        </label>
      </FormSection>

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
        <button className="button button-primary" type="submit">
          Salvar locatário
        </button>
      </div>
    </form>
  )
}
