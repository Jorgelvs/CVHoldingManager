import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { listarLocatarios } from '../../locatarios/services/locatarioService.js'
import { listarPatrimonios, buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades, buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { listarImobiliariasAtivas } from '../../imobiliarias/services/imobiliariaService.js'
import { contratoAtivoPorUnidade, validarContrato } from '../services/contratoService.js'
import { reajusteTipos, indicesReajuste, periodicidadesReajuste, situacoesContrato } from '../constants/contratoConstants.js'
import FormSection from '../../patrimonios/components/FormSection.jsx'
import { obterParametrosContratos, obterParametrosDocumentos } from '../../configuracoes/services/configuracaoService.js'
import { buscarDocumentosFiltrados } from '../../documentos/services/documentoService.js'
import SearchableSelect from '../../../components/SearchableSelect.jsx'
import CurrencyInput from '../../../components/CurrencyInput.jsx'

// Mesma validação usada em Documentos (DocumentoFormPage.jsx) — reaproveitada
// aqui porque o upload do arquivo do contrato agora acontece direto nesta
// tela, em vez de exigir uma segunda etapa em Documentos.
function validarArquivoContrato(file, parametrosDocumentos) {
  const tiposPermitidos = parametrosDocumentos?.tiposArquivoPermitidos || []
  const tamanhoMaximo = Number(parametrosDocumentos?.tamanhoMaximoBytes || 0)

  if (!file) return ''
  if (tiposPermitidos.length && !tiposPermitidos.includes(file.type)) {
    return 'Tipo de arquivo não permitido.'
  }
  if (tamanhoMaximo > 0 && file.size > tamanhoMaximo) {
    return `Tamanho máximo permitido é ${Math.round(tamanhoMaximo / 1024 / 1024)} MB.`
  }
  return ''
}

// Antes o usuário preenchia "Prazo (meses)" manualmente mesmo já tendo
// informado data de início e data de fim — um campo redundante que podia
// ficar inconsistente com as datas reais. Agora, sempre que as duas datas
// estiverem preenchidas, o prazo é calculado a partir delas.
function calcularPrazoMeses(dataInicio, dataFim) {
  const inicio = new Date(`${dataInicio}T00:00:00`)
  const fim = new Date(`${dataFim}T00:00:00`)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) return 0
  const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())
  const ajusteDia = fim.getDate() < inicio.getDate() ? -1 : 0
  return Math.max(0, meses + ajusteDia)
}

const defaultForm = {
  patrimonioId: '',
  unidadeId: '',
  locatarioId: '',
  imobiliariaId: '',
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
  percentualReajuste: '',
  periodicidadeReajuste: 'Anual',
  prazoAlertaReajusteDias: '',
  dataBaseReajuste: '',
  historicoReajustes: [],
  prazoMeses: '',
  situacao: 'Rascunho',
  observacoes: '',
}

export default function ContratoForm({ initialData = null, headerLabel = 'Contrato', onSave, presetUnidadeId = '' }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)
  const [locatarios, setLocatarios] = useState([])
  const [patrimonios, setPatrimonios] = useState([])
  const [unidades, setUnidades] = useState([])
  const [imobiliarias, setImobiliarias] = useState([])
  const [defaultsAplicados, setDefaultsAplicados] = useState(false)
  // Arquivo do contrato: mantido separado de "form" porque não é um campo
  // do contrato em si, e sim de um registro em Documentos (categoria
  // "Contratos") que é criado/atualizado junto ao salvar o contrato.
  const [arquivoContrato, setArquivoContrato] = useState(null)
  const [arquivoErro, setArquivoErro] = useState('')
  const [documentoExistente, setDocumentoExistente] = useState(null)

  const patrimoniosPorId = React.useMemo(() => new Map(patrimonios.map((item) => [item.id, item])), [patrimonios])

  const parametrosContratos = React.useMemo(() => obterParametrosContratos(), [])
  const parametrosDocumentos = React.useMemo(() => obterParametrosDocumentos(), [])
  const opcoesIndiceReajuste = React.useMemo(
    () => (parametrosContratos?.indicesReajustePermitidos?.length ? parametrosContratos.indicesReajustePermitidos : indicesReajuste),
    [parametrosContratos],
  )
  const opcoesPeriodicidade = React.useMemo(() => {
    const base = periodicidadesReajuste
    const padrao = parametrosContratos?.periodicidadePadrao
    if (!padrao) return base
    return Array.from(new Set([padrao, ...base]))
  }, [parametrosContratos])

  useEffect(() => {
    setLocatarios(listarLocatarios())
    setPatrimonios(listarPatrimonios())
    setUnidades(listarUnidades())
    setImobiliarias(listarImobiliariasAtivas())
  }, [])

  const imobiliariaSelecionada = imobiliarias.find((item) => item.id === form.imobiliariaId) || null

  useEffect(() => {
    if (initialData) {
      setForm({
        ...defaultForm,
        ...initialData,
      })
      setDefaultsAplicados(true)
    } else {
      setForm(defaultForm)
      setDefaultsAplicados(false)
    }
  }, [initialData])

  // Ao editar um contrato que já existe, busca o documento (categoria
  // "Contratos") já vinculado a ele, se houver, para mostrar na tela em vez
  // de fazer o usuário procurar em Documentos.
  useEffect(() => {
    if (!initialData?.id) {
      setDocumentoExistente(null)
      return
    }
    const vinculado = buscarDocumentosFiltrados({ contratoId: initialData.id, categoria: 'Contratos' })[0] || null
    setDocumentoExistente(vinculado)
  }, [initialData?.id])

  const handleArquivoContratoChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const erro = validarArquivoContrato(file, parametrosDocumentos)
    if (erro) {
      setArquivoErro(erro)
      return
    }
    const blob = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
      reader.readAsDataURL(file)
    })
    setArquivoContrato({ url: blob, filename: file.name, tipo: file.type, tamanho: file.size })
    setArquivoErro('')
  }

  useEffect(() => {
    if (initialData || defaultsAplicados) return

    setForm((current) => ({
      ...current,
      indiceReajuste: current.indiceReajuste === 'Sem índice'
        ? (parametrosContratos?.indicesReajustePermitidos?.[0] || current.indiceReajuste)
        : current.indiceReajuste,
      periodicidadeReajuste: current.periodicidadeReajuste || parametrosContratos?.periodicidadePadrao || 'Anual',
      prazoAlertaReajusteDias: current.prazoAlertaReajusteDias || String(parametrosContratos?.prazoAlertaReajusteDias || ''),
      observacoes: current.observacoes || parametrosContratos?.textoPadraoObservacoes || '',
    }))
    setDefaultsAplicados(true)
  }, [initialData, defaultsAplicados, parametrosContratos])

  // Preenche automaticamente a unidade (e o patrimônio dela) quando o
  // formulário é aberto a partir da tela de uma unidade específica (ex.:
  // botão "Novo contrato" na página da unidade), evitando que o usuário
  // precise buscar de novo algo que ele já estava vendo.
  useEffect(() => {
    if (initialData || !presetUnidadeId || form.unidadeId) return
    const unidadePreset = buscarUnidadePorId(presetUnidadeId)
    if (unidadePreset) {
      setForm((current) => ({
        ...current,
        unidadeId: unidadePreset.id,
        patrimonioId: unidadePreset.patrimonioId || current.patrimonioId,
      }))
    }
  }, [presetUnidadeId, initialData, form.unidadeId])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Patrimônio é derivado automaticamente da unidade escolhida — o usuário
  // busca direto pela unidade (por nome/código), sem precisar selecionar o
  // patrimônio como um passo separado antes.
  const handleUnidadeChange = (unidadeId) => {
    const unidadeSelecionada = unidades.find((item) => item.id === unidadeId)
    setForm((prev) => ({
      ...prev,
      unidadeId,
      patrimonioId: unidadeSelecionada ? unidadeSelecionada.patrimonioId : prev.patrimonioId,
    }))
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
    const response = onSave({
      ...form,
      valorAluguel: form.valorAluguel || '0',
      valorCondominio: form.valorCondominio || '0',
      valorCaucao: form.valorCaucao || '0',
      percentualMulta: form.percentualMulta || '0',
      percentualJuros: form.percentualJuros || '0',
      prazoMeses: form.dataInicio && form.dataFim
        ? calcularPrazoMeses(form.dataInicio, form.dataFim)
        : form.prazoMeses,
      // Não é um campo do contrato — a página de formulário (ContratoFormPage)
      // extrai isto e cria/atualiza o registro em Documentos separadamente.
      documentoArquivo: arquivoContrato,
    })

    if (response?.error) {
      setSubmitMessage({ type: 'error', text: response.error })
      return
    }

    setSubmitMessage({ type: 'success', text: 'Contrato salvo com sucesso.' })
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
            <span>Unidade *</span>
            <SearchableSelect
              value={form.unidadeId}
              onChange={handleUnidadeChange}
              options={unidadesElegiveis.map((item) => ({
                id: item.id,
                label: `${item.nome} - ${item.codigoInterno}`,
                sublabel: `${patrimoniosPorId.get(item.patrimonioId)?.nome || 'Patrimônio não identificado'} · ${item.situacao}`,
              }))}
              placeholder="Digite o nome ou código da unidade"
              emptyMessage="Nenhuma unidade encontrada"
            />
            {errors.unidadeId ? <span className="field-error">{errors.unidadeId}</span> : null}
          </label>
          <label className="form-field">
            <span>Patrimônio</span>
            <input value={patrimoniosPorId.get(form.patrimonioId)?.nome || ''} readOnly placeholder="Definido automaticamente pela unidade" />
            {errors.patrimonioId ? <span className="field-error">{errors.patrimonioId}</span> : null}
          </label>
          <label className="form-field">
            <span>Locatário *</span>
            <SearchableSelect
              value={form.locatarioId}
              onChange={(id) => updateField('locatarioId', id)}
              options={locatarios.map((item) => ({
                id: item.id,
                label: item.nomeCompleto,
                sublabel: item.cpf || item.telefone || '',
              }))}
              placeholder="Digite o nome do locatário"
              emptyMessage="Nenhum locatário encontrado"
            />
            {errors.locatarioId ? <span className="field-error">{errors.locatarioId}</span> : null}
            <span className="field-hint">
              Não encontrou? <Link to="/locatarios/novo" target="_blank" rel="noopener noreferrer">Cadastrar novo locatário</Link> (abre em nova aba)
            </span>
          </label>
          <label className="form-field">
            <span>Imobiliária responsável</span>
            <select value={form.imobiliariaId} onChange={(event) => updateField('imobiliariaId', event.target.value)}>
              <option value="">Nenhuma (sem comissão)</option>
              {imobiliarias.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} ({Number(item.percentualComissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%)
                </option>
              ))}
            </select>
            {imobiliariaSelecionada ? (
              <span className="field-hint">
                Comissão de {Number(imobiliariaSelecionada.percentualComissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% sobre aluguel e multa deste contrato.
              </span>
            ) : null}
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
            <span>Dia de vencimento do aluguel {form.situacao === 'Ativo' ? '*' : ''}</span>
            <input type="number" min="1" max="31" value={form.diaVencimento} onChange={(event) => updateField('diaVencimento', event.target.value)} />
            {errors.diaVencimento ? <span className="field-error">{errors.diaVencimento}</span> : null}
          </label>
        </div>
        {form.dataInicio && form.dataFim ? (
          <p className="field-hint" style={{ marginTop: 8 }}>
            Prazo: {calcularPrazoMeses(form.dataInicio, form.dataFim)} mês(es) — calculado automaticamente a partir das datas de início e fim.
          </p>
        ) : null}
      </FormSection>

      <FormSection title="Valores" description="Valores do aluguel, condomínio e caução.">
        <div className="form-grid">
          <label className="form-field">
            <span>Valor do aluguel</span>
            <CurrencyInput value={form.valorAluguel} onChange={(valor) => updateField('valorAluguel', valor)} />
            {errors.valorAluguel ? <span className="field-error">{errors.valorAluguel}</span> : null}
          </label>
          <label className="form-field">
            <span>Valor do condomínio</span>
            <CurrencyInput value={form.valorCondominio} onChange={(valor) => updateField('valorCondominio', valor)} />
            {errors.valorCondominio ? <span className="field-error">{errors.valorCondominio}</span> : null}
          </label>
          <label className="form-field">
            <span>Valor da caução</span>
            <CurrencyInput value={form.valorCaucao} onChange={(valor) => updateField('valorCaucao', valor)} />
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
              {opcoesIndiceReajuste.map((indice) => (
                <option key={indice} value={indice}>
                  {indice}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Periodicidade</span>
            <select value={form.periodicidadeReajuste} onChange={(event) => updateField('periodicidadeReajuste', event.target.value)}>
              {opcoesPeriodicidade.map((periodicidade) => (
                <option key={periodicidade} value={periodicidade}>
                  {periodicidade}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Percentual de reajuste</span>
            <input type="number" min="0" step="0.01" value={form.percentualReajuste} onChange={(event) => updateField('percentualReajuste', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Data base do reajuste</span>
            <input type="date" value={form.dataBaseReajuste} onChange={(event) => updateField('dataBaseReajuste', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Prazo de alerta (dias)</span>
            <input type="number" min="1" value={form.prazoAlertaReajusteDias || ''} onChange={(event) => updateField('prazoAlertaReajusteDias', event.target.value)} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Documento do contrato" description="Anexe o arquivo assinado do contrato (fica salvo em Documentos, categoria 'Contratos').">
        <div className="form-grid">
          <label className="form-field">
            <span>Arquivo do contrato</span>
            <input type="file" accept={(parametrosDocumentos?.tiposArquivoPermitidos || []).join(',')} onChange={handleArquivoContratoChange} />
            {arquivoErro ? <span className="field-error">{arquivoErro}</span> : null}
            {arquivoContrato ? (
              <span className="field-hint">Novo arquivo selecionado: {arquivoContrato.filename} ({Math.round(arquivoContrato.tamanho / 1024)} KB)</span>
            ) : documentoExistente ? (
              <span className="field-hint">
                Já existe um arquivo salvo: {documentoExistente.arquivo?.filename || documentoExistente.nome}. Escolher outro arquivo o substitui.{' '}
                <Link to="/documentos" target="_blank" rel="noopener noreferrer">Ver em Documentos</Link>
              </span>
            ) : (
              <span className="field-hint">Nenhum arquivo anexado ainda. Outros tipos de documento (escritura, seguro, vistoria etc.) continuam sendo cadastrados em Documentos.</span>
            )}
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
