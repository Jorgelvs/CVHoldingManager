import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidadesPorPatrimonio, buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { listarLocatarios, buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import { contratoAtivoPorUnidade, contratoAtivoPorLocatario } from '../../contratos/services/contratoService.js'
import { listarCategorias, listarSubcategoriasDetalhadas, categoriaTemSubcategorias, adicionarSubcategoriaPersonalizada, buscarSubcategoriaDetalhe } from '../services/categoriaFinanceiraService.js'
import { listarContas } from '../services/contaService.js'
import AdicionarSubcategoriaDialog from './AdicionarSubcategoriaDialog.jsx'
import { obterParametrosFinanceiros } from '../../configuracoes/services/configuracaoService.js'
import CurrencyInput from '../../../components/CurrencyInput.jsx'
import SearchableSelect from '../../../components/SearchableSelect.jsx'

const TIPO_MANUTENCAO_AREA_COMUM = 'area_comum'
const TIPO_MANUTENCAO_UNIDADE_ESPECIFICA = 'unidade_especifica'

function montarDataVencimentoPorDia(anoMes, diaVencimento) {
  if (!anoMes || !diaVencimento) return ''
  const [anoTxt, mesTxt] = String(anoMes).split('-')
  const ano = Number(anoTxt)
  const mes = Number(mesTxt)
  const dia = Number(diaVencimento)
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return ''
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return ''
  const ultimoDiaMes = new Date(ano, mes, 0).getDate()
  const diaFinal = Math.min(dia, ultimoDiaMes)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`
}

const initialState = {
  tipo: 'receita',
  categoria: '',
  subcategoria: null,
  subcategoriaId: '',
  subcategoriaLabel: '',
  descricao: '',
  valor: '',
  dataCompetencia: '',
  dataVencimento: '',
  dataPagamento: '',
  status: 'pendente',
  patrimonioId: '',
  unidadeId: '',
  tipoManutencao: '',
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
  const [suggestedSubcategoria, setSuggestedSubcategoria] = useState('')
  const [defaultsAplicados, setDefaultsAplicados] = useState(false)

  const parametrosFinanceiros = useMemo(() => obterParametrosFinanceiros(), [])

  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const contas = useMemo(() => listarContas(), [])
  const locatarios = useMemo(() => listarLocatarios(), [])
  const unidades = useMemo(() => {
    if (!data.patrimonioId) return []
    return listarUnidadesPorPatrimonio(data.patrimonioId)
  }, [data.patrimonioId])
  const patrimonioSelecionado = useMemo(
    () => patrimonios.find((item) => item.id === data.patrimonioId) || null,
    [patrimonios, data.patrimonioId],
  )
  const isMaintenanceExpense = data.tipo === 'despesa' && data.categoria === 'Manutenção'
  const requiresUnitForMaintenance = isMaintenanceExpense && data.tipoManutencao === TIPO_MANUTENCAO_UNIDADE_ESPECIFICA
  const shouldShowSubcategoriaField = Boolean(data.categoria) && (subcategories.length > 0 || data.categoria === 'Manutenção' || Boolean(suggestedSubcategoria))

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
        subcategoriaId: initialData.subcategoriaId || '',
        subcategoriaLabel: initialData.subcategoriaLabel || initialData.subcategoria || '',
        tipoManutencao:
          initialData.tipoManutencao
          || (initialData.tipo === 'despesa' && initialData.categoria === 'Manutenção'
            ? (initialData.unidadeId ? TIPO_MANUTENCAO_UNIDADE_ESPECIFICA : TIPO_MANUTENCAO_AREA_COMUM)
            : ''),
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
      const options = listarSubcategoriasDetalhadas(data.tipo, data.categoria)
      setSubcategories(options)

      if (data.subcategoria || data.subcategoriaId) {
        const match = buscarSubcategoriaDetalhe(data.tipo, data.categoria, data.subcategoriaId || data.subcategoria)
        if (match) {
          if (match.id !== data.subcategoriaId || match.nome !== data.subcategoria) {
            setData((current) => ({
              ...current,
              subcategoriaId: match.id,
              subcategoria: match.nome,
              subcategoriaLabel: match.nome,
            }))
          }
          setSuggestedSubcategoria('')
        } else if (data.subcategoria) {
          setSuggestedSubcategoria(data.subcategoria)
        }
      } else {
        setSuggestedSubcategoria('')
      }
    } else {
      setSubcategories([])
      setSuggestedSubcategoria('')
    }
  }, [data.tipo, data.categoria, data.subcategoria, data.subcategoriaId])

  useEffect(() => {
    if (!data.unidadeId) return
    const unidade = buscarUnidadePorId(data.unidadeId)
    if (!unidade?.patrimonioId) return
    if (data.patrimonioId === unidade.patrimonioId) return
    setData((current) => ({
      ...current,
      patrimonioId: unidade.patrimonioId,
      unidadeId: unidade.id,
    }))
  }, [data.unidadeId, data.patrimonioId])

  const handleFieldChange = (field, value) => {
    if (field === 'subcategoria') {
      const match = subcategories.find((item) => item.id === value)
      setData((current) => ({
        ...current,
        subcategoriaId: match?.id || '',
        subcategoria: match?.nome || null,
        subcategoriaLabel: match?.nome || '',
      }))
      return
    }

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
      subcategoriaId: '',
      subcategoriaLabel: '',
      tipoManutencao: '',
      unidadeId: '',
      contratoId: null,
      locatarioId: null,
    }))
  }

  const handlePatrimonioChange = (value) => {
    setData((current) => ({
      ...current,
      patrimonioId: value,
      unidadeId: current.unidadeId && buscarUnidadePorId(current.unidadeId)?.patrimonioId === value ? current.unidadeId : '',
      contratoId: null,
      locatarioId: null,
    }))
  }

  const handleUnidadeChange = (value) => {
    const unidade = buscarUnidadePorId(value)
    const contrato = contratoAtivoPorUnidade(value)
    const ehReceitaAluguel = data.tipo === 'receita' && data.categoria === 'Aluguel'
    const dataVencimentoContrato = ehReceitaAluguel
      ? montarDataVencimentoPorDia(data.dataCompetencia, contrato?.diaVencimento)
      : ''
    setData((current) => ({
      ...current,
      unidadeId: value,
      contratoId: contrato?.id || null,
      locatarioId: contrato?.locatarioId || null,
      dataVencimento: dataVencimentoContrato || current.dataVencimento,
    }))
    if (unidade && unidade.patrimonioId !== data.patrimonioId) {
      setAlert({ type: 'error', text: 'A unidade não pertence ao patrimônio selecionado.' })
    }
  }

  // Caminho inverso do handleUnidadeChange: o usuário pode preencher por
  // unidade OU por locatário — ao escolher o locatário, deriva a unidade
  // (e o patrimônio) a partir do contrato ativo dele, em vez de exigir que
  // a unidade seja selecionada primeiro.
  const handleLocatarioChange = (value) => {
    if (!value) {
      setData((current) => ({ ...current, locatarioId: null }))
      return
    }

    const contrato = contratoAtivoPorLocatario(value)
    if (!contrato) {
      setData((current) => ({ ...current, locatarioId: value }))
      setAlert({ type: 'error', text: 'Este locatário não possui contrato ativo — vincule a unidade manualmente, se necessário.' })
      return
    }

    const unidade = buscarUnidadePorId(contrato.unidadeId)
    const ehReceitaAluguel = data.tipo === 'receita' && data.categoria === 'Aluguel'
    const dataVencimentoContrato = ehReceitaAluguel
      ? montarDataVencimentoPorDia(data.dataCompetencia, contrato.diaVencimento)
      : ''

    setData((current) => ({
      ...current,
      locatarioId: value,
      unidadeId: contrato.unidadeId,
      patrimonioId: unidade?.patrimonioId || current.patrimonioId,
      contratoId: contrato.id,
      dataVencimento: dataVencimentoContrato || current.dataVencimento,
    }))
  }

  const handleCategoriaChange = (value) => {
    const ehReceitaAluguel = data.tipo === 'receita' && value === 'Aluguel'
    const contrato = data.unidadeId ? contratoAtivoPorUnidade(data.unidadeId) : null
    const dataVencimentoContrato = ehReceitaAluguel
      ? montarDataVencimentoPorDia(data.dataCompetencia, contrato?.diaVencimento)
      : ''

    setData((current) => ({
      ...current,
      categoria: value,
      subcategoria: null,
      subcategoriaId: '',
      subcategoriaLabel: '',
      tipoManutencao: value === 'Manutenção' && current.tipo === 'despesa' ? current.tipoManutencao : '',
      unidadeId: value === 'Manutenção' && current.tipo === 'despesa' ? current.unidadeId : '',
      contratoId: value === 'Manutenção' && current.tipo === 'despesa' ? current.contratoId : null,
      locatarioId: value === 'Manutenção' && current.tipo === 'despesa' ? current.locatarioId : null,
      dataVencimento: dataVencimentoContrato || current.dataVencimento,
    }))
  }

  useEffect(() => {
    if (!(data.tipo === 'receita' && data.categoria === 'Aluguel')) return
    if (!data.unidadeId || !data.dataCompetencia) return

    const contrato = contratoAtivoPorUnidade(data.unidadeId)
    const dataVencimentoContrato = montarDataVencimentoPorDia(data.dataCompetencia, contrato?.diaVencimento)
    if (!dataVencimentoContrato || data.dataVencimento === dataVencimentoContrato) return

    setData((current) => ({
      ...current,
      contratoId: contrato?.id || current.contratoId,
      locatarioId: contrato?.locatarioId || current.locatarioId,
      dataVencimento: dataVencimentoContrato,
    }))
  }, [data.tipo, data.categoria, data.unidadeId, data.dataCompetencia, data.dataVencimento])

  const handleTipoManutencaoChange = (value) => {
    setData((current) => ({
      ...current,
      tipoManutencao: value,
      unidadeId: value === TIPO_MANUTENCAO_UNIDADE_ESPECIFICA ? current.unidadeId : '',
      contratoId: value === TIPO_MANUTENCAO_UNIDADE_ESPECIFICA ? current.contratoId : null,
      locatarioId: value === TIPO_MANUTENCAO_UNIDADE_ESPECIFICA ? current.locatarioId : null,
    }))
  }

  const validar = () => {
    const errors = {}
    if (!data.valor || Number(data.valor) <= 0) errors.valor = 'Valor deve ser maior que zero.'
    if (!data.patrimonioId) errors.patrimonioId = 'Patrimônio obrigatório.'
    if (!data.categoria) errors.categoria = 'Categoria obrigatória.'
    if (!data.dataCompetencia) errors.dataCompetencia = 'Data de competência obrigatória.'
    if (isMaintenanceExpense && !data.tipoManutencao) {
      errors.tipoManutencao = 'Tipo da manutenção obrigatório.'
    }
    if (isMaintenanceExpense && data.tipoManutencao === TIPO_MANUTENCAO_UNIDADE_ESPECIFICA && !data.unidadeId) {
      errors.unidadeId = 'Unidade obrigatória para manutenção em unidade específica.'
    }
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
    if (data.subcategoria && !subcategories.some((item) => item.nome === data.subcategoria)) {
      errors.subcategoria = 'Subcategoria inválida para a categoria selecionada.'
    }
    return errors
  }

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
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
      subcategoriaId: data.subcategoriaId || null,
      subcategoriaLabel: data.subcategoriaLabel || data.subcategoria || null,
      tipoManutencao: isMaintenanceExpense ? data.tipoManutencao : null,
      unidadeId: isMaintenanceExpense && data.tipoManutencao !== TIPO_MANUTENCAO_UNIDADE_ESPECIFICA
        ? null
        : (data.unidadeId || null),
      contratoId: isMaintenanceExpense && data.tipoManutencao !== TIPO_MANUTENCAO_UNIDADE_ESPECIFICA
        ? null
        : (data.contratoId || null),
      locatarioId: isMaintenanceExpense && data.tipoManutencao !== TIPO_MANUTENCAO_UNIDADE_ESPECIFICA
        ? null
        : (data.locatarioId || null),
      dataVencimento: data.dataVencimento || null,
      dataPagamento: data.dataPagamento || null,
    }

    setSubmitting(true)
    try {
      const resultado = await onSave(payload)
      if (resultado?.error) {
        setAlert({ type: 'error', text: resultado.error })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdicionarSubcategoria = (nome) => {
    const resultado = adicionarSubcategoriaPersonalizada(data.tipo, data.categoria, nome)
    if (resultado.error) {
      setAlert({ type: 'error', text: resultado.error })
      return
    }
    const novasSubcategorias = listarSubcategoriasDetalhadas(data.tipo, data.categoria)
    setSubcategories(novasSubcategorias)
    setData((current) => ({
      ...current,
      subcategoriaId: resultado.item.id,
      subcategoria: resultado.item.nome,
      subcategoriaLabel: resultado.item.nome,
      categoria: current.categoria || data.categoria || 'Manutenção',
    }))
    setSuggestedSubcategoria('')
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
          {isMaintenanceExpense ? (
            <div className="form-field">
              <label className="required-label">Tipo da manutenção</label>
              <select
                value={data.tipoManutencao || ''}
                onChange={(event) => handleTipoManutencaoChange(event.target.value)}
              >
                <option value="">Selecione</option>
                <option value={TIPO_MANUTENCAO_AREA_COMUM}>Área comum / estrutura do patrimônio</option>
                <option value={TIPO_MANUTENCAO_UNIDADE_ESPECIFICA}>Unidade específica</option>
              </select>
            </div>
          ) : null}
          <div className="form-field">
            <label className={requiresUnitForMaintenance ? 'required-label' : ''}>Unidade</label>
            <select
              value={data.unidadeId || ''}
              onChange={(event) => handleUnidadeChange(event.target.value)}
              disabled={isMaintenanceExpense && data.tipoManutencao === TIPO_MANUTENCAO_AREA_COMUM}
            >
              <option value="">Sem unidade</option>
              {unidades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
            {isMaintenanceExpense && data.tipoManutencao === TIPO_MANUTENCAO_AREA_COMUM ? (
              <small className="field-help">
                Manutenção de área comum usa a regra de rateio do patrimônio: {patrimonioSelecionado?.configuracoes?.regraRateio || 'Não se aplica'}.
              </small>
            ) : null}
          </div>
          <div className="form-field">
            <label>Locatário</label>
            <SearchableSelect
              value={data.locatarioId || ''}
              onChange={handleLocatarioChange}
              options={locatarios.map((item) => ({
                id: item.id,
                label: item.nomeCompleto,
                sublabel: item.cpf || item.telefone || '',
              }))}
              placeholder="Digite o nome do locatário"
              emptyMessage="Nenhum locatário encontrado"
              disabled={isMaintenanceExpense && data.tipoManutencao === TIPO_MANUTENCAO_AREA_COMUM}
            />
            <small className="field-help">
              Pode preencher por unidade ou por locatário — o outro campo é preenchido automaticamente pelo contrato ativo.
            </small>
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
          {shouldShowSubcategoriaField ? (
            <div className="form-field">
              <label className={categoriaTemSubcategorias(data.tipo, data.categoria) ? 'required-label' : ''}>Subcategoria</label>
              <div className="inline-form-row">
                <select
                  value={data.subcategoriaId || ''}
                  onChange={(event) => handleFieldChange('subcategoria', event.target.value)}
                >
                  <option value="">Selecione a subcategoria</option>
                  {subcategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
                <button type="button" className="button button-secondary" onClick={() => setShowSubcategoriaDialog(true)}>
                  + Adicionar subcategoria
                </button>
              </div>
              {suggestedSubcategoria ? (
                <div className="field-error">
                  A subcategoria "{suggestedSubcategoria}" não existe nesta categoria. Clique em "+ Adicionar subcategoria" para criar e selecionar automaticamente.
                </div>
              ) : null}
            </div>
          ) : null}
          <AdicionarSubcategoriaDialog
            open={showSubcategoriaDialog}
            tipo={data.tipo}
            categoria={data.categoria}
            initialName={suggestedSubcategoria}
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
            <label>Descrição</label>
            <input
              type="text"
              value={data.descricao || ''}
              onChange={(event) => handleFieldChange('descricao', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="required-label">Valor</label>
            <CurrencyInput value={data.valor} onChange={(valor) => handleFieldChange('valor', valor)} />
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
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
