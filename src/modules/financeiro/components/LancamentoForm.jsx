import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidadesPorPatrimonio, buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { contratoAtivoPorUnidade } from '../../contratos/services/contratoService.js'
import { listarCategorias, listarSubcategorias, categoriaTemSubcategorias, adicionarSubcategoriaPersonalizada } from '../services/categoriaFinanceiraService.js'
import { listarContas } from '../services/contaService.js'
import AdicionarSubcategoriaDialog from './AdicionarSubcategoriaDialog.jsx'
import { obterParametrosFinanceiros } from '../../configuracoes/services/configuracaoService.js'

const initialState = {
  tipo: 'receita',
  categoria: '',
  subcategoria: null,
  descricao: '',
  valor: '',
  dataCompetencia: '',
  dataVencimento: '',
  dataPagamento: '',
  status: 'pendente',
  patrimonioId: '',
  unidadeId: '',
  contratoId: null,
  locatarioId: null,
  contaFinanceiraId: '',
  observacoes: '',
}

export default function LancamentoForm({ initialData = null, onSave, submitLabel = 'Salvar lançamento' }) {
  const navigate = useNavigate()
  const [data, setData] = useState(initialState)
  const [alert, setAlert] = useState(null)
  const [showSubcategoriaDialog, setShowSubcategoriaDialog] = useState(false)
  const [subcategories, setSubcategories] = useState([])
  const [defaultsAplicados, setDefaultsAplicados] = useState(false)

  const parametrosFinanceiros = useMemo(() => obterParametrosFinanceiros(), [])

  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const contas = useMemo(() => listarContas(), [])
  const unidades = useMemo(() => {
    if (!data.patrimonioId) return []
    return listarUnidadesPorPatrimonio(data.patrimonioId)
  }, [data.patrimonioId])

  const aplicarDefaultsFinanceiros = (current) => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    const diaPadrao = Number(parametrosFinanceiros?.diaPadraoVencimento || 5)
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate()
    const diaFinal = Math.min(Math.max(diaPadrao, 1), ultimoDiaMes)
    const dataVencimentoPadrao = new Date(ano, mes, diaFinal).toISOString().slice(0, 10)
    const dataCompetenciaPadrao = `${ano}-${String(mes + 1).padStart(2, '0')}`

    return {
      ...current,
      contaFinanceiraId: current.contaFinanceiraId || parametrosFinanceiros?.contaFinanceiraPadraoId || '',
      dataCompetencia: current.dataCompetencia || dataCompetenciaPadrao,
      dataVencimento: current.dataVencimento || dataVencimentoPadrao,
      categoria: current.categoria || (listarCategorias(current.tipo)[0] || ''),
      status: current.status || (parametrosFinanceiros?.statusFinanceiros?.[0] || 'pendente'),
    }
  }

  useEffect(() => {
    if (initialData) {
      const base = {
        ...initialData,
        valor: initialData.valor ?? '',
      }
      setData(initialData.id ? base : aplicarDefaultsFinanceiros(base))
      setDefaultsAplicados(true)
    }
  }, [initialData])

  useEffect(() => {
    if (initialData || defaultsAplicados) return

    setData((current) => aplicarDefaultsFinanceiros(current))
    setDefaultsAplicados(true)
  }, [initialData, defaultsAplicados, parametrosFinanceiros])

  useEffect(() => {
    if (data.categoria) {
      setSubcategories(listarSubcategorias(data.tipo, data.categoria))
    } else {
      setSubcategories([])
    }
  }, [data.tipo, data.categoria])

  const handleFieldChange = (field, value) => {
    setData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleTipoChange = (value) => {
    setData((current) => ({
      ...current,
      tipo: value,
      categoria: listarCategorias(value)[0] || '',
      subcategoria: null,
    }))
  }

  const handlePatrimonioChange = (value) => {
    setData((current) => ({
      ...current,
      patrimonioId: value,
      unidadeId: '',
      contratoId: null,
      locatarioId: null,
    }))
  }

  const handleUnidadeChange = (value) => {
    const unidade = buscarUnidadePorId(value)
    const contrato = contratoAtivoPorUnidade(value)
    setData((current) => ({
      ...current,
      unidadeId: value,
      contratoId: contrato?.id || null,
      locatarioId: contrato?.locatarioId || null,
    }))
    if (unidade && unidade.patrimonioId !== data.patrimonioId) {
      setAlert({ type: 'error', text: 'A unidade não pertence ao patrimônio selecionado.' })
    }
  }

  const handleCategoriaChange = (value) => {
    setData((current) => ({
      ...current,
      categoria: value,
      subcategoria: null,
    }))
  }

  const validar = () => {
    const errors = {}
    if (!data.descricao.trim()) errors.descricao = 'Descrição obrigatória.'
    if (!data.valor || Number(data.valor) <= 0) errors.valor = 'Valor deve ser maior que zero.'
    if (!data.patrimonioId) errors.patrimonioId = 'Patrimônio obrigatório.'
    if (!data.categoria) errors.categoria = 'Categoria obrigatória.'
    if (!data.dataCompetencia) errors.dataCompetencia = 'Data de competência obrigatória.'
    if (categoriaTemSubcategorias(data.tipo, data.categoria) && !data.subcategoria) {
      errors.subcategoria = 'Subcategoria obrigatória para esta categoria.'
    }
    if (data.status === 'pago' && !data.dataPagamento) {
      errors.dataPagamento = 'Data de pagamento obrigatória para lançamentos pagos.'
    }
    if (data.unidadeId && data.patrimonioId) {
      const unidade = buscarUnidadePorId(data.unidadeId)
      if (unidade && unidade.patrimonioId !== data.patrimonioId) {
        errors.unidadeId = 'Unidade não pertence ao patrimônio selecionado.'
      }
    }
    if (data.subcategoria && !subcategories.includes(data.subcategoria)) {
      errors.subcategoria = 'Subcategoria inválida para a categoria selecionada.'
    }
    return errors
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setAlert(null)
    const errors = validar()
    if (Object.keys(errors).length > 0) {
      setAlert({ type: 'error', text: Object.values(errors)[0] })
      return
    }

    const payload = {
      ...data,
      valor: Number(data.valor),
      subcategoria: data.subcategoria || null,
      dataVencimento: data.dataVencimento || null,
      dataPagamento: data.dataPagamento || null,
    }
    onSave(payload)
  }

  const handleAdicionarSubcategoria = (nome) => {
    const resultado = adicionarSubcategoriaPersonalizada(data.tipo, data.categoria, nome)
    if (resultado.error) {
      setAlert({ type: 'error', text: resultado.error })
      return
    }
    const novasSubcategorias = listarSubcategorias(data.tipo, data.categoria)
    setSubcategories(novasSubcategorias)
    setData((current) => ({ ...current, subcategoria: resultado.item.nome }))
    setShowSubcategoriaDialog(false)
    setAlert({ type: 'success', text: 'Subcategoria adicionada com sucesso.' })
  }

  const handleMarcarPagoToggle = () => {
    if (data.status === 'pago') {
      handleFieldChange('status', 'pendente')
      handleFieldChange('dataPagamento', '')
    } else {
      handleFieldChange('status', 'pago')
      if (!data.dataPagamento) {
        const hoje = new Date().toISOString().slice(0, 10)
        handleFieldChange('dataPagamento', hoje)
      }
    }
  }

  return (
    <form className="page-content" onSubmit={handleSubmit}>
      <div className="page-header">
        <div>
          <p className="page-subtitle">Cadastre ou edite lançamentos financeiros.</p>
          <h1>{submitLabel}</h1>
        </div>
      </div>
      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.text}</div> : null}
      <div className="form-section">
        <div className="form-grid">
          <div className="form-field">
            <label className="required-label">Natureza</label>
            <select value={data.tipo} onChange={(event) => handleTipoChange(event.target.value)}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <div className="form-field">
            <label className="required-label">Patrimônio</label>
            <select value={data.patrimonioId || ''} onChange={(event) => handlePatrimonioChange(event.target.value)}>
              <option value="">Selecione um patrimônio</option>
              {patrimonios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Unidade</label>
            <select value={data.unidadeId || ''} onChange={(event) => handleUnidadeChange(event.target.value)}>
              <option value="">Sem unidade</option>
              {unidades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="required-label">Categoria</label>
            <select value={data.categoria || ''} onChange={(event) => handleCategoriaChange(event.target.value)}>
              <option value="">Selecione a categoria</option>
              {listarCategorias(data.tipo).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {subcategories.length > 0 ? (
            <div className="form-field">
              <label className={categoriaTemSubcategorias(data.tipo, data.categoria) ? 'required-label' : ''}>Subcategoria</label>
              <div className="inline-form-row">
                <select
                  value={data.subcategoria || ''}
                  onChange={(event) => handleFieldChange('subcategoria', event.target.value)}
                >
                  <option value="">Selecione a subcategoria</option>
                  {subcategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button type="button" className="button button-secondary" onClick={() => setShowSubcategoriaDialog(true)}>
                  + Adicionar subcategoria
                </button>
              </div>
            </div>
          ) : null}
          <AdicionarSubcategoriaDialog
            open={showSubcategoriaDialog}
            tipo={data.tipo}
            categoria={data.categoria}
            onSave={handleAdicionarSubcategoria}
            onCancel={() => setShowSubcategoriaDialog(false)}
          />
          <div className="form-field">
            <label>Conta financeira</label>
            <select value={data.contaFinanceiraId || ''} onChange={(event) => handleFieldChange('contaFinanceiraId', event.target.value)}>
              <option value="">Sem conta</option>
              {contas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field form-field-full">
            <label className="required-label">Descrição</label>
            <input
              type="text"
              value={data.descricao}
              onChange={(event) => handleFieldChange('descricao', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="required-label">Valor</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={data.valor}
              onChange={(event) => handleFieldChange('valor', event.target.value)}
              placeholder={`1500 (${parametrosFinanceiros?.moedaPadrao || 'BRL'})`}
            />
          </div>
          <div className="form-field">
            <label className="required-label">Data de competência</label>
            <input
              type="month"
              value={data.dataCompetencia}
              onChange={(event) => handleFieldChange('dataCompetencia', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Data de vencimento</label>
            <input
              type="date"
              value={data.dataVencimento || ''}
              onChange={(event) => handleFieldChange('dataVencimento', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Data de pagamento</label>
            <input
              type="date"
              value={data.dataPagamento || ''}
              onChange={(event) => handleFieldChange('dataPagamento', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="required-label">Status</label>
            <select value={data.status} onChange={(event) => handleFieldChange('status', event.target.value)}>
              {(parametrosFinanceiros?.statusFinanceiros || ['pendente', 'pago', 'atrasado', 'cancelado']).map((status) => (
                <option key={status} value={status}>{String(status).charAt(0).toUpperCase() + String(status).slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-field form-field-full">
            <label>Observações</label>
            <textarea
              value={data.observacoes}
              onChange={(event) => handleFieldChange('observacoes', event.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={() => navigate(-1)}>
          Voltar
        </button>
        <button type="submit" className="button button-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
