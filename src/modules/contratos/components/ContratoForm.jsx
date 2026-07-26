import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarLocatarios } from '../../locatarios/services/locatarioService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidadesPorPatrimonio } from '../../unidades/services/unidadeService.js'
import { contratoAtivoPorUnidade, validarContrato } from '../services/contratoService.js'
import { reajusteTipos, indicesReajuste, situacoesContrato } from '../constants/contratoConstants.js'
import FormSection from '../../patrimonios/components/FormSection.jsx'

const defaultForm = {
  patrimonioId: '',
  unidadeId: '',
  locatarioId: '',
  dataInicio: '',
  dataFim: '',
  diaVencimento: '',
  valorAluguel: '',
  valorCondominio: '',
  valorCaucao: '',
  percentualMulta: '',
  percentualJuros: '',
  reajusteTipo: 'Sem reajuste',
  indiceReajuste: 'Sem índice',
  dataBaseReajuste: '',
  prazoMeses: '',
  situacao: 'Rascunho',
  observacoes: '',
}

export default function ContratoForm({ initialData = null, onSave, headerLabel }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)
  const [locatarios, setLocatarios] = useState([])
  const [patrimonios, setPatrimonios] = useState([])
  const [unidades, setUnidades] = useState([])

  useEffect(() => {
    setLocatarios(listarLocatarios())
    setPatrimonios(listarPatrimonios())
  }, [])

  useEffect(() => {
    if (initialData) {
      setForm({
        ...defaultForm,
        ...initialData,
      })
    }
  }, [initialData])

  useEffect(() => {
    if (form.patrimonioId) {
      setUnidades(listarUnidadesPorPatrimonio(form.patrimonioId))
    } else {
      setUnidades([])
    }
  }, [form.patrimonioId])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    const validationErrors = validarContrato(form)
    if (form.situacao === 'Ativo' && form.unidadeId) {
      const conflito = contratoAtivoPorUnidade(form.unidadeId)
      if (conflito && (!form.id || conflito.id !== form.id)) {
        validationErrors.unidadeId = `Já existe contrato ativo ${conflito.codigoInterno} nesta unidade.`
      }
    }
    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      setSubmitMessage({ type: 'error', text: 'Corrija os erros antes de salvar.' })
      return
    }
    onSave({
      ...form,
      valorAluguel: form.valorAluguel || '0',
      valorCondominio: form.valorCondominio || '0',
      valorCaucao: form.valorCaucao || '0',
      percentualMulta: form.percentualMulta || '0',
      percentualJuros: form.percentualJuros || '0',
    })
  }

  const unidadesElegiveis = unidades.filter((unidade) => unidade.situacao !== 'Em implantação' && unidade.situacao !== 'Inativa')

  return (
    <form className="patrimonio-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div>
          <h1>{headerLabel}</h1>
          <p className="page-subtitle">Cadastre ou atualize um contrato sem vincular o locatário diretamente à unidade.</p>
        </div>
      </div>

      {submitMessage ? (
        <div className={`alert-box ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {submitMessage.text}
        </div>
      ) : null}

      <FormSection title="Identificação" description="Dados básicos do contrato.">
        <div className="form-grid">
          <label className="form-field">
            <span>Patrimônio *</span>
            <select value={form.patrimonioId} onChange={(event) => updateField('patrimonioId', event.target.value)}>
              <option value="">Selecione</option>
              {patrimonios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
            {errors.patrimonioId ? <span className="field-error">{errors.patrimonioId}</span> : null}
          </label>
          <label className="form-field">
            <span>Unidade *</span>
            <select value={form.unidadeId} onChange={(event) => updateField('unidadeId', event.target.value)}>
              <option value="">Selecione</option>
              {unidadesElegiveis.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} - {item.codigoInterno} ({item.situacao})
                </option>
              ))}
            </select>
            {errors.unidadeId ? <span className="field-error">{errors.unidadeId}</span> : null}
          </label>
          <label className="form-field">
            <span>Locatário *</span>
            <select value={form.locatarioId} onChange={(event) => updateField('locatarioId', event.target.value)}>
              <option value="">Selecione</option>
              {locatarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nomeCompleto}
                </option>
              ))}
            </select>
            {errors.locatarioId ? <span className="field-error">{errors.locatarioId}</span> : null}
          </label>
        </div>
      </FormSection>

      <FormSection title="Vigência" description="Período do contrato.">
        <div className="form-grid">
          <label className="form-field">
            <span>Data de início *</span>
            <input type="date" value={form.dataInicio} onChange={(event) => updateField('dataInicio', event.target.value)} />
            {errors.dataInicio ? <span className="field-error">{errors.dataInicio}</span> : null}
          </label>
          <label className="form-field">
            <span>Data de fim</span>
            <input type="date" value={form.dataFim} onChange={(event) => updateField('dataFim', event.target.value)} />
            {errors.dataFim ? <span className="field-error">{errors.dataFim}</span> : null}
          </label>
          <label className="form-field">
            <span>Dia de vencimento</span>
            <input type="number" min="1" max="31" value={form.diaVencimento} onChange={(event) => updateField('diaVencimento', event.target.value)} />
            {errors.diaVencimento ? <span className="field-error">{errors.diaVencimento}</span> : null}
          </label>
          <label className="form-field">
            <span>Prazo (meses)</span>
            <input type="number" min="0" value={form.prazoMeses} onChange={(event) => updateField('prazoMeses', event.target.value)} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Valores" description="Valores do aluguel, condomínio e caução.">
        <div className="form-grid">
          <label className="form-field">
            <span>Valor do aluguel</span>
            <input type="number" min="0" step="0.01" value={form.valorAluguel} onChange={(event) => updateField('valorAluguel', event.target.value)} />
            {errors.valorAluguel ? <span className="field-error">{errors.valorAluguel}</span> : null}
          </label>
          <label className="form-field">
            <span>Valor do condomínio</span>
            <input type="number" min="0" step="0.01" value={form.valorCondominio} onChange={(event) => updateField('valorCondominio', event.target.value)} />
            {errors.valorCondominio ? <span className="field-error">{errors.valorCondominio}</span> : null}
          </label>
          <label className="form-field">
            <span>Valor da caução</span>
            <input type="number" min="0" step="0.01" value={form.valorCaucao} onChange={(event) => updateField('valorCaucao', event.target.value)} />
            {errors.valorCaucao ? <span className="field-error">{errors.valorCaucao}</span> : null}
          </label>
        </div>
      </FormSection>

      <FormSection title="Multa e juros" description="Configuração de penalidades.">
        <div className="form-grid">
          <label className="form-field">
            <span>Percentual de multa</span>
            <input type="number" min="0" step="0.01" value={form.percentualMulta} onChange={(event) => updateField('percentualMulta', event.target.value)} />
            {errors.percentualMulta ? <span className="field-error">{errors.percentualMulta}</span> : null}
          </label>
          <label className="form-field">
            <span>Percentual de juros</span>
            <input type="number" min="0" step="0.01" value={form.percentualJuros} onChange={(event) => updateField('percentualJuros', event.target.value)} />
            {errors.percentualJuros ? <span className="field-error">{errors.percentualJuros}</span> : null}
          </label>
        </div>
      </FormSection>

      <FormSection title="Reajuste" description="Dados de reajuste do contrato.">
        <div className="form-grid">
          <label className="form-field">
            <span>Tipo de reajuste</span>
            <select value={form.reajusteTipo} onChange={(event) => updateField('reajusteTipo', event.target.value)}>
              {reajusteTipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Índice de reajuste</span>
            <select value={form.indiceReajuste} onChange={(event) => updateField('indiceReajuste', event.target.value)}>
              {indicesReajuste.map((indice) => (
                <option key={indice} value={indice}>
                  {indice}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Data base do reajuste</span>
            <input type="date" value={form.dataBaseReajuste} onChange={(event) => updateField('dataBaseReajuste', event.target.value)} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Observações" description="Notas gerais do contrato.">
        <label className="form-field form-field-full">
          <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} />
        </label>
      </FormSection>

      <FormSection title="Situação" description="Defina o estado do contrato.">
        <div className="form-grid">
          <label className="form-field">
            <span>Situação</span>
            <select value={form.situacao} onChange={(event) => updateField('situacao', event.target.value)}>
              {situacoesContrato.map((situacao) => (
                <option key={situacao} value={situacao}>
                  {situacao}
                </option>
              ))}
            </select>
          </label>
        </div>
      </FormSection>

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
        <button className="button button-primary" type="submit">
          Salvar contrato
        </button>
      </div>
    </form>
  )
}
