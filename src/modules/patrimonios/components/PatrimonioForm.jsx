import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { codigoUnicoDisponivel, gerarCodigoUnico } from '../services/patrimonioService.js'
import FormSection from './FormSection.jsx'

const defaultForm = {
  nome: '',
  codigo: '',
  grupoPatrimonial: '',
  tipo: '',
  finalidade: '',
  modeloReceita: '',
  situacao: '',
  observacoes: '',
  endereco: {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  },
  quantidadeUnidades: '',
  dataAquisicao: '',
  valorAquisicao: '',
  valorPatrimonial: '',
  situacaoRegistral: '',
  descricaoRegistral: '',
  dataInicioOperacao: '',
  matricula: '',
  cartorio: '',
  inscricaoMunicipal: '',
  observacoesPatrimoniais: '',
  configuracoes: {
    agua: '',
    energia: '',
    condominio: '',
    iptu: '',
    limpeza: '',
    manutencao: '',
    regraRateio: '',
    valorPadraoCondominio: '',
    diaPadraoVencimento: '',
    observacoesOperacionais: '',
  },
}

export default function PatrimonioForm({ initialData = null, options, onSave, headerLabel }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)
  const [codigoTouched, setCodigoTouched] = useState(false)

  useEffect(() => {
    if (initialData) {
      setForm({
        ...defaultForm,
        ...initialData,
        grupoPatrimonial: initialData.grupoPatrimonial || initialData.grupo || '',
        finalidade: initialData.finalidade || '',
        modeloReceita: initialData.modeloReceita || '',
        quantidadeUnidades: initialData.quantidadeUnidades ?? initialData.quantidadePlanejadaUnidades ?? '',
        valorAquisicao: initialData.valorAquisicao ?? '',
        valorPatrimonial: initialData.valorPatrimonial ?? '',
        endereco: {
          ...defaultForm.endereco,
          ...(initialData.endereco || {}),
        },
        configuracoes: {
          ...defaultForm.configuracoes,
          ...(initialData.configuracoes || {}),
        },
      })
    }
  }, [initialData])

  useEffect(() => {
    if (form.nome && !codigoTouched && !form.codigo) {
      const codigo = gerarCodigoUnico(form.nome)
      setForm((current) => ({ ...current, codigo }))
    }
  }, [form.nome, codigoTouched])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  const isDirty = useMemo(() => {
    if (!initialData) {
      return JSON.stringify(form) !== JSON.stringify(defaultForm)
    }
    return JSON.stringify(form) !==
      JSON.stringify({
        ...defaultForm,
        ...initialData,
        grupoPatrimonial: initialData.grupoPatrimonial || initialData.grupo || '',
        finalidade: initialData.finalidade || '',
        modeloReceita: initialData.modeloReceita || '',
        quantidadeUnidades: initialData.quantidadeUnidades ?? initialData.quantidadePlanejadaUnidades ?? '',
        valorAquisicao: initialData.valorAquisicao ?? '',
        valorPatrimonial: initialData.valorPatrimonial ?? '',
        endereco: {
          ...defaultForm.endereco,
          ...(initialData.endereco || {}),
        },
        configuracoes: {
          ...defaultForm.configuracoes,
          ...(initialData.configuracoes || {}),
        },
      })
  }, [form, initialData])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateNestedField = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.nome.trim()) {
      nextErrors.nome = 'Nome obrigatório.'
    }
    if (!form.codigo.trim()) {
      nextErrors.codigo = 'Código obrigatório.'
    } else if (!codigoUnicoDisponivel(form.codigo, initialData?.id)) {
      nextErrors.codigo = 'Código já está em uso.'
    }
    if (!form.grupoPatrimonial) {
      nextErrors.grupoPatrimonial = 'Grupo patrimonial obrigatório.'
    }
    if (!form.tipo) {
      nextErrors.tipo = 'Tipo obrigatório.'
    }
    if (!form.finalidade) {
      nextErrors.finalidade = 'Finalidade obrigatória.'
    }
    if (!form.modeloReceita) {
      nextErrors.modeloReceita = 'Modelo de receita obrigatório.'
    }
    if (!form.situacao) {
      nextErrors.situacao = 'Situação obrigatória.'
    }
    if (form.quantidadeUnidades !== '') {
      const quantidade = Number(form.quantidadeUnidades)
      if (Number.isNaN(quantidade) || quantidade < 0) {
        nextErrors.quantidadeUnidades = 'Quantidade de unidades deve ser zero ou maior.'
      }
    }
    if (form.valorAquisicao !== '') {
      const valor = Number(form.valorAquisicao.toString().replace(',', '.'))
      if (Number.isNaN(valor)) {
        nextErrors.valorAquisicao = 'Valor de aquisição inválido.'
      } else if (valor < 0) {
        nextErrors.valorAquisicao = 'Valor de aquisição não pode ser negativo.'
      }
    }
    if (form.valorPatrimonial !== '') {
      const valor = Number(form.valorPatrimonial.toString().replace(',', '.'))
      if (Number.isNaN(valor)) {
        nextErrors.valorPatrimonial = 'Valor patrimonial inválido.'
      } else if (valor < 0) {
        nextErrors.valorPatrimonial = 'Valor patrimonial não pode ser negativo.'
      }
    }
    if (form.configuracoes.diaPadraoVencimento !== '') {
      const dia = Number(form.configuracoes.diaPadraoVencimento)
      if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
        nextErrors.diaPadraoVencimento = 'Informe um dia entre 1 e 31.'
      }
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
      quantidadeUnidades: form.quantidadeUnidades || '0',
      valorAquisicao: form.valorAquisicao || '',
      valorPatrimonial: form.valorPatrimonial || '',
    })
  }

  const handleValueChange = (field, value) => {
    if (field === 'codigo') {
      setCodigoTouched(true)
    }
    if (field === 'finalidade') {
      const modelosValidos = options.modelos[value] || []
      setForm((prev) => ({
        ...prev,
        finalidade: value,
        modeloReceita: modelosValidos.includes(prev.modeloReceita) ? prev.modeloReceita : '',
      }))
      return
    }
    updateField(field, value)
  }

  return (
    <form className="patrimonio-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div>
          <h1>{headerLabel}</h1>
          <p className="page-subtitle">Preencha as seções abaixo para registrar ou atualizar o patrimônio.</p>
        </div>
      </div>

      {submitMessage ? (
        <div className={`alert-box ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {submitMessage.text}
        </div>
      ) : null}

      <FormSection title="Identificação" description="Dados principais do patrimônio.">
        <div className="form-grid">
          <label className="form-field">
            <span>Nome *</span>
            <input
              value={form.nome}
              onChange={(event) => handleValueChange('nome', event.target.value)}
            />
            {errors.nome ? <span className="field-error">{errors.nome}</span> : null}
          </label>
          <label className="form-field">
            <span>Código *</span>
            <input
              value={form.codigo}
              onChange={(event) => handleValueChange('codigo', event.target.value.toUpperCase())}
            />
            {errors.codigo ? <span className="field-error">{errors.codigo}</span> : null}
          </label>
          <label className="form-field">
            <span>Grupo patrimonial *</span>
            <select value={form.grupoPatrimonial} onChange={(event) => handleValueChange('grupoPatrimonial', event.target.value)}>
              <option value="">Selecione</option>
              {options.grupos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {errors.grupoPatrimonial ? <span className="field-error">{errors.grupoPatrimonial}</span> : null}
          </label>
          <label className="form-field">
            <span>Tipo *</span>
            <select value={form.tipo} onChange={(event) => handleValueChange('tipo', event.target.value)}>
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
            <select value={form.finalidade} onChange={(event) => handleValueChange('finalidade', event.target.value)}>
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
            <span>Modelo de receita *</span>
            <select
              value={form.modeloReceita}
              onChange={(event) => handleValueChange('modeloReceita', event.target.value)}
              disabled={!form.finalidade}
            >
              <option value="">Selecione</option>
              {(options.modelos[form.finalidade] || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {errors.modeloReceita ? <span className="field-error">{errors.modeloReceita}</span> : null}
          </label>
          <label className="form-field">
            <span>Situação *</span>
            <select value={form.situacao} onChange={(event) => handleValueChange('situacao', event.target.value)}>
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
            <span>Situação registral</span>
            <select value={form.situacaoRegistral} onChange={(event) => handleValueChange('situacaoRegistral', event.target.value)}>
              <option value="">Selecione</option>
              {(options.situacoesRegistral || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field form-field-full">
            <span>Descrição registral</span>
            <textarea
              value={form.descricaoRegistral}
              onChange={(event) => handleValueChange('descricaoRegistral', event.target.value)}
            />
          </label>
          <label className="form-field form-field-full">
            <span>Observações</span>
            <textarea
              value={form.observacoes}
              onChange={(event) => handleValueChange('observacoes', event.target.value)}
            />
          </label>
        </div>
      </FormSection>

      <FormSection title="Endereço" description="Informações de localização do patrimônio.">
        <div className="form-grid">
          <label className="form-field">
            <span>CEP</span>
            <input
              value={form.endereco.cep}
              onChange={(event) => updateNestedField('endereco', 'cep', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Logradouro</span>
            <input
              value={form.endereco.logradouro}
              onChange={(event) => updateNestedField('endereco', 'logradouro', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Número</span>
            <input
              value={form.endereco.numero}
              onChange={(event) => updateNestedField('endereco', 'numero', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Complemento</span>
            <input
              value={form.endereco.complemento}
              onChange={(event) => updateNestedField('endereco', 'complemento', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Bairro</span>
            <input
              value={form.endereco.bairro}
              onChange={(event) => updateNestedField('endereco', 'bairro', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Cidade</span>
            <input
              value={form.endereco.cidade}
              onChange={(event) => updateNestedField('endereco', 'cidade', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Estado</span>
            <input
              value={form.endereco.estado}
              onChange={(event) => updateNestedField('endereco', 'estado', event.target.value)}
            />
          </label>
        </div>
      </FormSection>

      <FormSection title="Informações patrimoniais" description="Dados de planejamento e registro do imóvel.">
        <div className="form-grid">
          <label className="form-field">
            <span>Quantidade de unidades</span>
            <input
              type="number"
              min="0"
              value={form.quantidadeUnidades}
              onChange={(event) => updateField('quantidadeUnidades', event.target.value)}
            />
            {errors.quantidadeUnidades ? <span className="field-error">{errors.quantidadeUnidades}</span> : null}
          </label>
          <label className="form-field">
            <span>Data de aquisição</span>
            <input
              type="date"
              value={form.dataAquisicao}
              onChange={(event) => updateField('dataAquisicao', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Valor de aquisição</span>
            <input
              value={form.valorAquisicao}
              placeholder="0,00"
              onChange={(event) => updateField('valorAquisicao', event.target.value)}
            />
            {errors.valorAquisicao ? <span className="field-error">{errors.valorAquisicao}</span> : null}
          </label>
          <label className="form-field">
            <span>Valor patrimonial</span>
            <input
              value={form.valorPatrimonial}
              placeholder="0,00"
              onChange={(event) => updateField('valorPatrimonial', event.target.value)}
            />
            {errors.valorPatrimonial ? <span className="field-error">{errors.valorPatrimonial}</span> : null}
          </label>
          <label className="form-field">
            <span>Data de início da operação</span>
            <input
              type="date"
              value={form.dataInicioOperacao}
              onChange={(event) => updateField('dataInicioOperacao', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Número da matrícula do imóvel</span>
            <input
              value={form.matricula}
              onChange={(event) => updateField('matricula', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Cartório de registro</span>
            <input
              value={form.cartorio}
              onChange={(event) => updateField('cartorio', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Inscrição municipal</span>
            <input
              value={form.inscricaoMunicipal}
              onChange={(event) => updateField('inscricaoMunicipal', event.target.value)}
            />
          </label>
          <label className="form-field form-field-full">
            <span>Observações patrimoniais</span>
            <textarea
              value={form.observacoesPatrimoniais}
              onChange={(event) => updateField('observacoesPatrimoniais', event.target.value)}
            />
          </label>
        </div>
      </FormSection>

      <FormSection title="Configurações operacionais" description="Defina regras de água, energia e rateio para este patrimônio.">
        <div className="form-grid">
          <label className="form-field">
            <span>Água</span>
            <select
              value={form.configuracoes.agua}
              onChange={(event) => updateNestedField('configuracoes', 'agua', event.target.value)}
            >
              <option value="">Selecione</option>
              {options.agua.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Energia</span>
            <select
              value={form.configuracoes.energia}
              onChange={(event) => updateNestedField('configuracoes', 'energia', event.target.value)}
            >
              <option value="">Selecione</option>
              {options.energia.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Condomínio</span>
            <select
              value={form.configuracoes.condominio}
              onChange={(event) => updateNestedField('configuracoes', 'condominio', event.target.value)}
            >
              <option value="">Selecione</option>
              {options.condominio.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>IPTU</span>
            <select
              value={form.configuracoes.iptu}
              onChange={(event) => updateNestedField('configuracoes', 'iptu', event.target.value)}
            >
              <option value="">Selecione</option>
              {options.iptu.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Limpeza</span>
            <select
              value={form.configuracoes.limpeza}
              onChange={(event) => updateNestedField('configuracoes', 'limpeza', event.target.value)}
            >
              <option value="">Selecione</option>
              {options.limpeza.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Manutenção</span>
            <select
              value={form.configuracoes.manutencao}
              onChange={(event) => updateNestedField('configuracoes', 'manutencao', event.target.value)}
            >
              <option value="">Selecione</option>
              {options.manutencao.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Regra de rateio</span>
            <select
              value={form.configuracoes.regraRateio}
              onChange={(event) => updateNestedField('configuracoes', 'regraRateio', event.target.value)}
            >
              <option value="">Selecione</option>
              {options.regraRateio.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Valor padrão de condomínio</span>
            <input
              value={form.configuracoes.valorPadraoCondominio}
              placeholder="0,00"
              onChange={(event) => updateNestedField('configuracoes', 'valorPadraoCondominio', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Dia padrão de vencimento</span>
            <input
              type="number"
              min="1"
              max="31"
              value={form.configuracoes.diaPadraoVencimento}
              onChange={(event) => updateNestedField('configuracoes', 'diaPadraoVencimento', event.target.value)}
            />
            {errors.diaPadraoVencimento ? <span className="field-error">{errors.diaPadraoVencimento}</span> : null}
          </label>
          <label className="form-field form-field-full">
            <span>Observações operacionais</span>
            <textarea
              value={form.configuracoes.observacoesOperacionais}
              onChange={(event) => updateNestedField('configuracoes', 'observacoesOperacionais', event.target.value)}
            />
          </label>
        </div>
      </FormSection>

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
        <button className="button button-primary" type="submit">
          Salvar patrimônio
        </button>
      </div>
    </form>
  )
}
