import { STORAGE_KEY as STORAGE_KEY_PATRIMONIOS } from '../../patrimonios/constants/patrimonioConstants.js'
import { STORAGE_KEY as STORAGE_KEY_UNIDADES } from '../../unidades/constants/unidadeConstants.js'
import { STORAGE_KEY as STORAGE_KEY_LOCATARIOS } from '../../locatarios/constants/locatarioConstants.js'
import { STORAGE_KEY as STORAGE_KEY_CONTRATOS } from '../../contratos/constants/contratoConstants.js'
import { STORAGE_KEY_DOCUMENTOS } from '../../documentos/constants/documentoConstants.js'
import { STORAGE_KEY_AUDITORIA } from '../../auditoria/constants/auditoriaConstants.js'
import {
  STORAGE_KEY as STORAGE_KEY_LANCAMENTOS,
  STORAGE_KEY_APORTES,
  STORAGE_KEY_BAIXAS,
  STORAGE_KEY_CAUCOES,
  STORAGE_KEY_CONTAS,
  STORAGE_KEY_LIVRO_CAIXA,
  STORAGE_KEY_RATEIOS,
  STORAGE_KEY_SUBCATEGORIES,
} from '../../financeiro/constants/financeiroConstants.js'
import { STORAGE_KEY_CONFIGURACOES, EVENTO_CONFIGURACOES_ATUALIZADAS } from '../../configuracoes/constants/configuracaoConstants.js'
import {
  STORAGE_KEY_NOTIFICACOES,
  STORAGE_KEY_TAREFAS,
  EVENTO_ATUALIZACAO_NOTIFICACOES,
} from '../../notificacoes/constants/notificacaoConstants.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { listarLocatarios } from '../../locatarios/services/locatarioService.js'
import { listarContratos } from '../../contratos/services/contratoService.js'
import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { listarContas } from '../../financeiro/services/contaService.js'
import { listarMovimentos } from '../../financeiro/services/livroCaixaService.js'
import { listarBaixas } from '../../financeiro/services/baixaService.js'
import { listarAportes } from '../../financeiro/services/aporteService.js'
import { listarCaucoes } from '../../financeiro/services/caucaoService.js'
import { listarRateios } from '../../financeiro/services/rateioService.js'
import { criarLancamento } from '../../financeiro/services/financeiroService.js'
import { listarDocumentos } from '../../documentos/services/documentoService.js'
import { listarEventosAuditoria, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { listarNotificacoes, listarTarefasManuais } from '../../notificacoes/services/notificacaoService.js'
import { obterConfiguracoes } from '../../configuracoes/services/configuracaoService.js'

export const BACKUP_VERSION = '20.0.0'
export const APP_VERSION = '1.0.0'

export const BACKUP_MODULOS = [
  { id: 'configuracoes', nome: 'Configuracoes' },
  { id: 'patrimonios', nome: 'Patrimonios' },
  { id: 'unidades', nome: 'Unidades' },
  { id: 'locatarios', nome: 'Locatarios' },
  { id: 'contratos', nome: 'Contratos' },
  { id: 'financeiro', nome: 'Financeiro' },
  { id: 'documentos', nome: 'Documentos (metadados)' },
  { id: 'auditoria', nome: 'Auditoria' },
  { id: 'notificacoes', nome: 'Notificacoes' },
]

const KNOWN_MODULOS = new Set(BACKUP_MODULOS.map((item) => item.id))
const CONTRATO_SEQUENCE_KEY = `${STORAGE_KEY_CONTRATOS}_sequence`

function parseJsonSafe(raw, fallback) {
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function readStorageArray(key) {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  const parsed = parseJsonSafe(raw, [])
  return Array.isArray(parsed) ? parsed : []
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function moduloSelecionado(modulos, id) {
  return Array.isArray(modulos) && modulos.includes(id)
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return source
  }
  const base = target && typeof target === 'object' && !Array.isArray(target) ? target : {}
  const output = { ...base }
  Object.keys(source).forEach((key) => {
    const value = source[key]
    if (Array.isArray(value)) {
      output[key] = [...value]
      return
    }
    if (value && typeof value === 'object') {
      output[key] = deepMerge(base[key], value)
      return
    }
    output[key] = value
  })
  return output
}

function mergeById(current, incoming) {
  const atual = Array.isArray(current) ? current : []
  const novos = Array.isArray(incoming) ? incoming : []
  const mapa = new Map()

  atual.forEach((item) => {
    const key = item?.id || `raw-${JSON.stringify(item)}`
    mapa.set(key, item)
  })

  novos.forEach((item) => {
    const key = item?.id || `raw-${JSON.stringify(item)}`
    mapa.set(key, item)
  })

  return Array.from(mapa.values())
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sanitizeDocumentoMetadados(item) {
  return {
    ...item,
    arquivo: null,
    arquivoPresenteNoOrigem: Boolean(item?.arquivo),
  }
}

function getFinanceiroSnapshot() {
  return {
    lancamentos: listarLancamentos(),
    contas: listarContas(),
    movimentos: listarMovimentos(),
    baixas: listarBaixas(),
    aportes: listarAportes(),
    caucoes: listarCaucoes(),
    rateios: listarRateios(),
    subcategorias: readStorageArray(STORAGE_KEY_SUBCATEGORIES),
  }
}

function getDataByModulo(id) {
  if (id === 'configuracoes') return obterConfiguracoes()
  if (id === 'patrimonios') return listarPatrimonios()
  if (id === 'unidades') return listarUnidades()
  if (id === 'locatarios') return listarLocatarios()
  if (id === 'contratos') return listarContratos()
  if (id === 'financeiro') return getFinanceiroSnapshot()
  if (id === 'documentos') return listarDocumentos(true).map(sanitizeDocumentoMetadados)
  if (id === 'auditoria') return listarEventosAuditoria()
  if (id === 'notificacoes') {
    return {
      notificacoes: listarNotificacoes(),
      tarefas: listarTarefasManuais({}),
    }
  }
  return null
}

export function gerarEstruturaBackup(modulosSelecionados = BACKUP_MODULOS.map((item) => item.id)) {
  const modulos = Array.from(new Set((modulosSelecionados || []).filter((item) => KNOWN_MODULOS.has(item))))
  const data = {}

  modulos.forEach((id) => {
    data[id] = getDataByModulo(id)
  })

  return {
    metadata: {
      app: 'CVHolding Manager',
      appVersion: APP_VERSION,
      backupVersion: BACKUP_VERSION,
      generatedAt: new Date().toISOString(),
      storageStrategy: 'local-storage-v1',
      sync: {
        cloudReady: true,
        provider: 'none',
      },
    },
    modules: modulos,
    data,
  }
}

export function gerarNomeArquivoBackup(prefixo = 'cvholding-backup') {
  const iso = new Date().toISOString().replace(/[:]/g, '-').slice(0, 19)
  return `${prefixo}-${iso}.json`
}

export function gerarResumoBackup(payload) {
  const data = payload?.data || {}
  const resumo = {}

  Object.keys(data).forEach((modulo) => {
    const conteudo = data[modulo]
    if (Array.isArray(conteudo)) {
      resumo[modulo] = conteudo.length
      return
    }
    if (!conteudo || typeof conteudo !== 'object') {
      resumo[modulo] = conteudo ? 1 : 0
      return
    }

    resumo[modulo] = Object.values(conteudo).reduce((total, item) => {
      if (Array.isArray(item)) return total + item.length
      if (item && typeof item === 'object') return total + 1
      return total
    }, 0)
  })

  return resumo
}

function validarModuloData(modulo, payload) {
  if (modulo === 'configuracoes') return payload && typeof payload === 'object' && !Array.isArray(payload)
  if (modulo === 'financeiro') return payload && typeof payload === 'object' && !Array.isArray(payload)
  if (modulo === 'notificacoes') return payload && typeof payload === 'object' && !Array.isArray(payload)
  return Array.isArray(payload)
}

export function validarEstruturaBackup(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valido: false, erro: 'Arquivo de backup invalido.' }
  }

  const metadata = payload.metadata || {}
  const backupVersion = String(metadata.backupVersion || '')
  if (!backupVersion) {
    return { valido: false, erro: 'Versao de backup ausente.' }
  }

  const major = backupVersion.split('.')[0]
  if (major !== '20') {
    return { valido: false, erro: `Versao de backup nao suportada: ${backupVersion}.` }
  }

  if (!Array.isArray(payload.modules) || payload.modules.length === 0) {
    return { valido: false, erro: 'Backup sem modulos selecionados.' }
  }

  if (!payload.data || typeof payload.data !== 'object') {
    return { valido: false, erro: 'Estrutura de dados do backup ausente.' }
  }

  for (const modulo of payload.modules) {
    if (!KNOWN_MODULOS.has(modulo)) {
      return { valido: false, erro: `Modulo desconhecido no backup: ${modulo}.` }
    }
    if (!(modulo in payload.data)) {
      return { valido: false, erro: `Dados ausentes para o modulo ${modulo}.` }
    }
    if (!validarModuloData(modulo, payload.data[modulo])) {
      return { valido: false, erro: `Estrutura invalida para o modulo ${modulo}.` }
    }
  }

  return { valido: true }
}

function resolveLista(baseModulo, incomingModulo, modo) {
  if (modo === 'substituir') return Array.isArray(incomingModulo) ? incomingModulo : []
  return mergeById(baseModulo, incomingModulo)
}

function processarConfiguracoes(incoming, modo) {
  if (modo === 'substituir') {
    writeStorage(STORAGE_KEY_CONFIGURACOES, incoming)
    return incoming
  }

  const atuais = parseJsonSafe(localStorage.getItem(STORAGE_KEY_CONFIGURACOES) || '{}', {})
  const merged = deepMerge(atuais, incoming || {})
  writeStorage(STORAGE_KEY_CONFIGURACOES, merged)
  return merged
}

function processarFinanceiro(incoming, modo) {
  const atual = {
    lancamentos: readStorageArray(STORAGE_KEY_LANCAMENTOS),
    contas: readStorageArray(STORAGE_KEY_CONTAS),
    movimentos: readStorageArray(STORAGE_KEY_LIVRO_CAIXA),
    baixas: readStorageArray(STORAGE_KEY_BAIXAS),
    aportes: readStorageArray(STORAGE_KEY_APORTES),
    caucoes: readStorageArray(STORAGE_KEY_CAUCOES),
    rateios: readStorageArray(STORAGE_KEY_RATEIOS),
    subcategorias: readStorageArray(STORAGE_KEY_SUBCATEGORIES),
  }

  const novo = incoming && typeof incoming === 'object' ? incoming : {}

  writeStorage(STORAGE_KEY_LANCAMENTOS, resolveLista(atual.lancamentos, novo.lancamentos, modo))
  writeStorage(STORAGE_KEY_CONTAS, resolveLista(atual.contas, novo.contas, modo))
  writeStorage(STORAGE_KEY_LIVRO_CAIXA, resolveLista(atual.movimentos, novo.movimentos, modo))
  writeStorage(STORAGE_KEY_BAIXAS, resolveLista(atual.baixas, novo.baixas, modo))
  writeStorage(STORAGE_KEY_APORTES, resolveLista(atual.aportes, novo.aportes, modo))
  writeStorage(STORAGE_KEY_CAUCOES, resolveLista(atual.caucoes, novo.caucoes, modo))
  writeStorage(STORAGE_KEY_RATEIOS, resolveLista(atual.rateios, novo.rateios, modo))
  writeStorage(STORAGE_KEY_SUBCATEGORIES, resolveLista(atual.subcategorias, novo.subcategorias, modo))

  return true
}

function atualizarSequenciaContratos(contratos) {
  const max = (Array.isArray(contratos) ? contratos : []).reduce((maior, item) => {
    const codigo = String(item?.codigoInterno || '')
    const match = codigo.match(/CTR-\d{4}-(\d+)/)
    if (!match) return maior
    const valor = Number(match[1])
    return Number.isFinite(valor) ? Math.max(maior, valor) : maior
  }, 0)

  if (max > 0) {
    localStorage.setItem(CONTRATO_SEQUENCE_KEY, String(max))
  }
}

function restaurarModulo(modulo, payloadModulo, modo) {
  if (modulo === 'configuracoes') {
    processarConfiguracoes(payloadModulo, modo)
    return
  }

  if (modulo === 'financeiro') {
    processarFinanceiro(payloadModulo, modo)
    return
  }

  if (modulo === 'notificacoes') {
    const atualNotificacoes = readStorageArray(STORAGE_KEY_NOTIFICACOES)
    const atualTarefas = readStorageArray(STORAGE_KEY_TAREFAS)
    const payloadNotificacoes = Array.isArray(payloadModulo?.notificacoes) ? payloadModulo.notificacoes : []
    const payloadTarefas = Array.isArray(payloadModulo?.tarefas) ? payloadModulo.tarefas : []
    writeStorage(STORAGE_KEY_NOTIFICACOES, resolveLista(atualNotificacoes, payloadNotificacoes, modo))
    writeStorage(STORAGE_KEY_TAREFAS, resolveLista(atualTarefas, payloadTarefas, modo))
    return
  }

  const moduleStorageKeys = {
    patrimonios: STORAGE_KEY_PATRIMONIOS,
    unidades: STORAGE_KEY_UNIDADES,
    locatarios: STORAGE_KEY_LOCATARIOS,
    contratos: STORAGE_KEY_CONTRATOS,
    documentos: STORAGE_KEY_DOCUMENTOS,
    auditoria: STORAGE_KEY_AUDITORIA,
  }

  const key = moduleStorageKeys[modulo]
  if (!key) return

  const atual = readStorageArray(key)
  const incoming = Array.isArray(payloadModulo) ? payloadModulo : []
  const persistir = modulo === 'documentos'
    ? incoming.map((item) => ({ ...item, arquivo: null }))
    : incoming

  writeStorage(key, resolveLista(atual, persistir, modo))

  if (modulo === 'contratos') {
    atualizarSequenciaContratos(resolveLista(atual, persistir, modo))
  }
}

export async function restaurarBackup(payload, { modo = 'merge', modulos = [], onProgress } = {}) {
  const validacao = validarEstruturaBackup(payload)
  if (!validacao.valido) {
    return { error: validacao.erro }
  }

  const modoAplicado = modo === 'substituir' ? 'substituir' : 'merge'
  const modulosArquivo = payload.modules.filter((id) => KNOWN_MODULOS.has(id))
  const modulosSelecionados = (modulos && modulos.length > 0 ? modulos : modulosArquivo)
    .filter((id) => modulosArquivo.includes(id))

  let processados = 0
  const total = modulosSelecionados.length || 1

  modulosSelecionados.forEach((modulo) => {
    restaurarModulo(modulo, payload.data[modulo], modoAplicado)
    processados += 1
    const percentual = Math.min(100, Math.round((processados / total) * 100))
    if (typeof onProgress === 'function') {
      onProgress(percentual)
    }
  })

  if (modulosSelecionados.includes('configuracoes')) {
    window.dispatchEvent(new Event(EVENTO_CONFIGURACOES_ATUALIZADAS))
  }
  if (modulosSelecionados.includes('notificacoes')) {
    window.dispatchEvent(new Event(EVENTO_ATUALIZACAO_NOTIFICACOES))
  }

  registrarEventoAuditoria({
    modulo: 'Backup',
    acao: 'BACKUP_RESTAURACAO',
    registroId: `backup-${Date.now()}`,
    registro: 'restauracao-backup',
    descricao: `Restauracao executada em modo ${modoAplicado} para ${modulosSelecionados.length} modulo(s).`,
    valorAnterior: null,
    novoValor: {
      backupVersion: payload?.metadata?.backupVersion,
      modo: modoAplicado,
      modulos: modulosSelecionados,
    },
    camposAlterados: ['modulos'],
  })

  return {
    ok: true,
    modo: modoAplicado,
    modulos: modulosSelecionados,
    resumo: gerarResumoBackup({ data: payload.data }),
  }
}

function validarTipoLancamento(tipo) {
  return tipo === 'receita' || tipo === 'despesa'
}

function validarMesAno(valor) {
  return /^\d{4}-\d{2}$/.test(valor)
}

function validarData(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

function splitCsvLine(line, delimiter) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result
}

function detectarDelimitador(headerLine) {
  const comma = (headerLine.match(/,/g) || []).length
  const semicolon = (headerLine.match(/;/g) || []).length
  return semicolon > comma ? ';' : ','
}

function normalizarHeader(header) {
  return String(header || '').trim().toLowerCase()
}

export function analisarCsvLancamentos(csvText) {
  const raw = String(csvText || '').trim()
  if (!raw) {
    return { error: 'Arquivo CSV vazio.' }
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    return { error: 'CSV deve conter cabecalho e ao menos uma linha de dados.' }
  }

  const delimiter = detectarDelimitador(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map(normalizarHeader)
  const required = ['tipo', 'categoria', 'descricao', 'valor', 'datacompetencia', 'datavencimento']
  const missing = required.filter((campo) => !headers.includes(campo))
  if (missing.length > 0) {
    return { error: `Colunas obrigatorias ausentes: ${missing.join(', ')}.` }
  }

  const preview = []
  const erros = []

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const lineNumber = lineIndex + 1
    const values = splitCsvLine(lines[lineIndex], delimiter)
    const row = {}

    headers.forEach((header, idx) => {
      row[header] = String(values[idx] || '').trim()
    })

    const tipo = row.tipo.toLowerCase()
    const valor = safeNumber(row.valor.replace(',', '.'))

    const errosLinha = []
    if (!validarTipoLancamento(tipo)) errosLinha.push('tipo deve ser receita ou despesa')
    if (!row.categoria) errosLinha.push('categoria obrigatoria')
    if (!row.descricao) errosLinha.push('descricao obrigatoria')
    if (!(valor > 0)) errosLinha.push('valor deve ser maior que zero')
    if (!validarMesAno(row.datacompetencia)) errosLinha.push('datacompetencia deve ser AAAA-MM')
    if (!validarData(row.datavencimento)) errosLinha.push('datavencimento deve ser AAAA-MM-DD')
    if (row.status && !['pendente', 'pago', 'atrasado', 'cancelado'].includes(row.status.toLowerCase())) {
      errosLinha.push('status invalido')
    }

    const itemPreview = {
      linha: lineNumber,
      tipo,
      categoria: row.categoria,
      descricao: row.descricao,
      valor,
      dataCompetencia: row.datacompetencia,
      dataVencimento: row.datavencimento,
      status: row.status ? row.status.toLowerCase() : 'pendente',
      patrimonioId: row.patrimonioid || '',
      unidadeId: row.unidadeid || '',
      contaFinanceiraId: row.contafinanceiraid || '',
      observacoes: row.observacoes || '',
      valido: errosLinha.length === 0,
      erros: errosLinha,
    }

    if (errosLinha.length > 0) {
      erros.push({ linha: lineNumber, erros: errosLinha })
    }

    preview.push(itemPreview)
  }

  return {
    headers,
    delimiter,
    totalLinhas: preview.length,
    validos: preview.filter((item) => item.valido),
    invalidos: erros,
    preview,
  }
}

export async function importarLancamentosCsv(itens, { onProgress } = {}) {
  const linhas = Array.isArray(itens) ? itens : []
  const validos = linhas.filter((item) => item.valido)
  if (validos.length === 0) {
    return { error: 'Nenhum registro valido para importacao.' }
  }

  const criados = []
  const erros = []

  for (let i = 0; i < validos.length; i += 1) {
    const item = validos[i]
    try {
      const created = criarLancamento({
        tipo: item.tipo,
        categoria: item.categoria,
        descricao: item.descricao,
        valor: item.valor,
        dataCompetencia: item.dataCompetencia,
        dataVencimento: item.dataVencimento,
        status: item.status,
        patrimonioId: item.patrimonioId || null,
        unidadeId: item.unidadeId || null,
        contaFinanceiraId: item.contaFinanceiraId || null,
        observacoes: item.observacoes || '',
        origem: 'manual',
      })
      criados.push(created)
    } catch (error) {
      erros.push({ linha: item.linha, erro: error?.message || 'Falha ao importar linha.' })
    }

    const percentual = Math.min(100, Math.round(((i + 1) / validos.length) * 100))
    if (typeof onProgress === 'function') {
      onProgress(percentual)
    }
  }

  registrarEventoAuditoria({
    modulo: 'Backup',
    acao: 'BACKUP_IMPORTACAO_CSV_FINANCEIRO',
    registroId: `csv-${Date.now()}`,
    registro: 'importacao-csv-financeiro',
    descricao: `Importacao CSV financeira executada. Sucesso: ${criados.length}, erros: ${erros.length}.`,
    valorAnterior: null,
    novoValor: {
      criados: criados.length,
      erros: erros.length,
    },
    camposAlterados: ['financeiro.lancamentos'],
  })

  return {
    ok: true,
    criados,
    erros,
  }
}
