import {
  CATEGORIAS_FINANCEIRAS,
  STATUS_FINANCEIRO,
} from '../../financeiro/constants/financeiroConstants.js'
import {
  indicesReajuste,
  periodicidadesReajuste,
} from '../../contratos/constants/contratoConstants.js'
import {
  CATEGORIAS_DOCUMENTOS,
  TIPOS_PERMITIDOS_DOCUMENTO,
  TAMANHO_MAXIMO_DOCUMENTO_BYTES,
} from '../../documentos/constants/documentoConstants.js'
import { PRIORIDADE_NOTIFICACAO, TIPOS_NOTIFICACAO } from '../../notificacoes/constants/notificacaoConstants.js'
import { listarContas } from '../../financeiro/services/contaService.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import {
  EVENTO_CONFIGURACOES_ATUALIZADAS,
  STORAGE_KEY_CONFIGURACOES,
} from '../constants/configuracaoConstants.js'

function agoraISO() {
  return new Date().toISOString()
}

function clonar(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function getContaPadraoId() {
  const contas = listarContas().filter((item) => item.ativa)
  return contas[0]?.id || ''
}

function getDefaults() {
  return {
    holding: {
      razaoSocial: '',
      nomeFantasia: 'C&V Holding',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: '',
      logo: '',
      dadosBancariosPrincipais: '',
    },
    financeiro: {
      diaPadraoVencimento: 5,
      categoriasReceitas: CATEGORIAS_FINANCEIRAS.receita.map((item) => item.nome),
      categoriasDespesas: CATEGORIAS_FINANCEIRAS.despesa.map((item) => item.nome),
      statusFinanceiros: STATUS_FINANCEIRO,
      contaFinanceiraPadraoId: getContaPadraoId(),
      moedaPadrao: 'BRL',
    },
    contratos: {
      indicesReajustePermitidos: indicesReajuste,
      periodicidadePadrao: periodicidadesReajuste[0] || 'Anual',
      prazoAlertaVencimentoDias: [30, 60, 90],
      prazoAlertaReajusteDias: 90,
      textoPadraoObservacoes: '',
    },
    documentos: {
      categoriasPermitidas: CATEGORIAS_DOCUMENTOS,
      tiposArquivoPermitidos: TIPOS_PERMITIDOS_DOCUMENTO,
      tamanhoMaximoBytes: TAMANHO_MAXIMO_DOCUMENTO_BYTES,
      prazoPadraoAlertaVencimentoDias: 90,
    },
    notificacoes: {
      tiposAtivos: {
        [TIPOS_NOTIFICACAO.ALUGUEL_VENCIDO]: true,
        [TIPOS_NOTIFICACAO.CONTA_VENCIDA]: true,
        [TIPOS_NOTIFICACAO.CONTA_VENCENDO_7_DIAS]: true,
        [TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_30_DIAS]: true,
        [TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_60_DIAS]: true,
        [TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_90_DIAS]: true,
        [TIPOS_NOTIFICACAO.REAJUSTE_PENDENTE]: true,
        [TIPOS_NOTIFICACAO.DOCUMENTO_VENCENDO]: true,
        [TIPOS_NOTIFICACAO.UNIDADE_VAGA]: true,
        [TIPOS_NOTIFICACAO.SALDO_NEGATIVO_CONTA]: true,
      },
      prazosAntecedencia: {
        contaVencendoDias: 7,
        contratoVencendoDias: [30, 60, 90],
        reajusteDias: 90,
        documentoDias: 90,
      },
      prioridadesPadrao: {
        [TIPOS_NOTIFICACAO.ALUGUEL_VENCIDO]: PRIORIDADE_NOTIFICACAO.ALTA,
        [TIPOS_NOTIFICACAO.CONTA_VENCIDA]: PRIORIDADE_NOTIFICACAO.ALTA,
        [TIPOS_NOTIFICACAO.CONTA_VENCENDO_7_DIAS]: PRIORIDADE_NOTIFICACAO.MEDIA,
        [TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_30_DIAS]: PRIORIDADE_NOTIFICACAO.ALTA,
        [TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_60_DIAS]: PRIORIDADE_NOTIFICACAO.MEDIA,
        [TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_90_DIAS]: PRIORIDADE_NOTIFICACAO.BAIXA,
        [TIPOS_NOTIFICACAO.REAJUSTE_PENDENTE]: PRIORIDADE_NOTIFICACAO.MEDIA,
        [TIPOS_NOTIFICACAO.DOCUMENTO_VENCENDO]: PRIORIDADE_NOTIFICACAO.MEDIA,
        [TIPOS_NOTIFICACAO.UNIDADE_VAGA]: PRIORIDADE_NOTIFICACAO.MEDIA,
        [TIPOS_NOTIFICACAO.SALDO_NEGATIVO_CONTA]: PRIORIDADE_NOTIFICACAO.ALTA,
      },
    },
    interface: {
      tema: 'auto',
      itensPorPagina: 20,
      formatoData: 'DD/MM/AAAA',
      exibicaoValores: 'simbolo',
      manterLogoPreparada: true,
    },
    updatedAt: null,
  }
}

function mergeDeep(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base
  }
  if (!base || typeof base !== 'object') {
    return override ?? base
  }

  const resultado = { ...base }
  Object.keys(override || {}).forEach((key) => {
    const valorOverride = override[key]
    if (valorOverride && typeof valorOverride === 'object' && !Array.isArray(valorOverride)) {
      resultado[key] = mergeDeep(base[key], valorOverride)
    } else {
      resultado[key] = valorOverride
    }
  })

  return resultado
}

function carregarRaw() {
  return localGet(STORAGE_KEY_CONFIGURACOES, null)
}

function salvarRaw(config) {
  return localSet(STORAGE_KEY_CONFIGURACOES, config)
}

function emitirAtualizacao() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENTO_CONFIGURACOES_ATUALIZADAS))
}

function normalizarListaTexto(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (typeof valor === 'string') {
    return valor
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizarNumeroInteiro(valor, fallback, min = 0) {
  const numero = Number(valor)
  if (Number.isNaN(numero)) return fallback
  return Math.max(min, Math.trunc(numero))
}

function normalizarConfiguracoes(config) {
  const defaults = getDefaults()
  const merged = mergeDeep(defaults, config || {})

  merged.financeiro.diaPadraoVencimento = normalizarNumeroInteiro(merged.financeiro.diaPadraoVencimento, defaults.financeiro.diaPadraoVencimento, 1)
  if (merged.financeiro.diaPadraoVencimento > 31) merged.financeiro.diaPadraoVencimento = 31
  merged.financeiro.moedaPadrao = 'BRL'
  merged.financeiro.categoriasReceitas = normalizarListaTexto(merged.financeiro.categoriasReceitas)
  merged.financeiro.categoriasDespesas = normalizarListaTexto(merged.financeiro.categoriasDespesas)
  merged.financeiro.statusFinanceiros = normalizarListaTexto(merged.financeiro.statusFinanceiros)

  merged.contratos.indicesReajustePermitidos = normalizarListaTexto(merged.contratos.indicesReajustePermitidos)
  merged.contratos.prazoAlertaVencimentoDias = normalizarListaTexto(merged.contratos.prazoAlertaVencimentoDias).map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0).sort((a, b) => a - b)
  if (merged.contratos.prazoAlertaVencimentoDias.length === 0) {
    merged.contratos.prazoAlertaVencimentoDias = defaults.contratos.prazoAlertaVencimentoDias
  }
  merged.contratos.prazoAlertaReajusteDias = normalizarNumeroInteiro(merged.contratos.prazoAlertaReajusteDias, defaults.contratos.prazoAlertaReajusteDias, 1)

  merged.documentos.categoriasPermitidas = normalizarListaTexto(merged.documentos.categoriasPermitidas)
  merged.documentos.tiposArquivoPermitidos = normalizarListaTexto(merged.documentos.tiposArquivoPermitidos)
  merged.documentos.tamanhoMaximoBytes = normalizarNumeroInteiro(merged.documentos.tamanhoMaximoBytes, defaults.documentos.tamanhoMaximoBytes, 1024)
  merged.documentos.prazoPadraoAlertaVencimentoDias = normalizarNumeroInteiro(
    merged.documentos.prazoPadraoAlertaVencimentoDias,
    defaults.documentos.prazoPadraoAlertaVencimentoDias,
    1,
  )

  merged.notificacoes.prazosAntecedencia.contaVencendoDias = normalizarNumeroInteiro(
    merged.notificacoes.prazosAntecedencia.contaVencendoDias,
    defaults.notificacoes.prazosAntecedencia.contaVencendoDias,
    1,
  )
  merged.notificacoes.prazosAntecedencia.contratoVencendoDias = normalizarListaTexto(
    merged.notificacoes.prazosAntecedencia.contratoVencendoDias,
  ).map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0).sort((a, b) => a - b)
  if (merged.notificacoes.prazosAntecedencia.contratoVencendoDias.length === 0) {
    merged.notificacoes.prazosAntecedencia.contratoVencendoDias = defaults.notificacoes.prazosAntecedencia.contratoVencendoDias
  }
  merged.notificacoes.prazosAntecedencia.reajusteDias = normalizarNumeroInteiro(
    merged.notificacoes.prazosAntecedencia.reajusteDias,
    defaults.notificacoes.prazosAntecedencia.reajusteDias,
    1,
  )
  merged.notificacoes.prazosAntecedencia.documentoDias = normalizarNumeroInteiro(
    merged.notificacoes.prazosAntecedencia.documentoDias,
    defaults.notificacoes.prazosAntecedencia.documentoDias,
    1,
  )

  Object.keys(defaults.notificacoes.tiposAtivos).forEach((tipo) => {
    merged.notificacoes.tiposAtivos[tipo] = Boolean(merged.notificacoes.tiposAtivos[tipo])
  })

  Object.keys(defaults.notificacoes.prioridadesPadrao).forEach((tipo) => {
    const prioridade = merged.notificacoes.prioridadesPadrao[tipo]
    merged.notificacoes.prioridadesPadrao[tipo] = Object.values(PRIORIDADE_NOTIFICACAO).includes(prioridade)
      ? prioridade
      : defaults.notificacoes.prioridadesPadrao[tipo]
  })

  merged.interface.itensPorPagina = normalizarNumeroInteiro(merged.interface.itensPorPagina, defaults.interface.itensPorPagina, 5)
  merged.interface.tema = ['auto', 'claro', 'escuro'].includes(merged.interface.tema) ? merged.interface.tema : 'auto'
  merged.interface.formatoData = merged.interface.formatoData || defaults.interface.formatoData
  merged.interface.exibicaoValores = merged.interface.exibicaoValores || defaults.interface.exibicaoValores
  merged.interface.manterLogoPreparada = Boolean(merged.interface.manterLogoPreparada)

  return merged
}

export function obterConfiguracoes() {
  const raw = carregarRaw()
  return normalizarConfiguracoes(raw)
}

export function obterDefaultsConfiguracoes() {
  return getDefaults()
}

export function salvarConfiguracoes(parcial) {
  const atual = obterConfiguracoes()
  const merged = normalizarConfiguracoes(mergeDeep(atual, parcial || {}))
  const camposAlterados = identificarCamposAlterados(atual, merged, ['updatedAt'])

  if (camposAlterados.length === 0) {
    return { data: atual, semAlteracoes: true }
  }

  merged.updatedAt = agoraISO()

  const salvou = salvarRaw(merged)
  if (!salvou) {
    return { error: 'Falha ao salvar configuracoes.' }
  }

  registrarEventoAuditoria({
    modulo: 'Configuracoes',
    acao: 'CONFIGURACOES_ALTERADAS',
    registroId: 'configuracoes',
    registro: 'configuracoes',
    descricao: 'Atualizacao de parametros e preferencias do sistema.',
    valorAnterior: atual,
    novoValor: merged,
    camposAlterados,
  })

  emitirAtualizacao()
  return { data: merged }
}

export function resetarConfiguracoes() {
  const atual = obterConfiguracoes()
  const defaults = normalizarConfiguracoes(getDefaults())
  defaults.updatedAt = agoraISO()
  salvarRaw(defaults)

  registrarEventoAuditoria({
    modulo: 'Configuracoes',
    acao: 'CONFIGURACOES_REDEFINIDAS',
    registroId: 'configuracoes',
    registro: 'configuracoes',
    descricao: 'Redefinicao das configuracoes para valores padrao.',
    valorAnterior: atual,
    novoValor: defaults,
    camposAlterados: ['holding', 'financeiro', 'contratos', 'documentos', 'notificacoes', 'interface'],
  })

  emitirAtualizacao()
  return defaults
}

export function obterParametrosNotificacoes() {
  const config = obterConfiguracoes()
  return config.notificacoes
}

export function obterParametrosFinanceiros() {
  const config = obterConfiguracoes()
  return config.financeiro
}

export function obterParametrosContratos() {
  const config = obterConfiguracoes()
  return config.contratos
}

export function obterParametrosDocumentos() {
  const config = obterConfiguracoes()
  return config.documentos
}

export function obterPreferenciasInterface() {
  const config = obterConfiguracoes()
  return config.interface
}

export function formatarDataConfigurada(valor, fallback = '-') {
  if (!valor) return fallback
  const texto = String(valor)

  const iso = /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : ''
  const data = iso ? new Date(`${iso}T00:00:00`) : new Date(texto)
  if (Number.isNaN(data.getTime())) return fallback

  const preferencias = obterPreferenciasInterface()
  const formato = preferencias?.formatoData || 'DD/MM/AAAA'

  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = String(data.getFullYear())

  if (formato === 'AAAA-MM-DD') return `${ano}-${mes}-${dia}`
  return `${dia}/${mes}/${ano}`
}
