import { STORAGE_KEY_AUDITORIA, USUARIO_PADRAO_AUDITORIA } from '../constants/auditoriaConstants.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'

function carregarEventos() {
  const parsed = localGet(STORAGE_KEY_AUDITORIA, [])
  return Array.isArray(parsed) ? parsed : []
}

function salvarEventos(eventos) {
  localSet(STORAGE_KEY_AUDITORIA, eventos)
}

function toComparable(value) {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toComparable)
  if (value && typeof value === 'object') {
    const sorted = {}
    Object.keys(value).sort().forEach((key) => {
      sorted[key] = toComparable(value[key])
    })
    return sorted
  }
  return value ?? null
}

function deepEqual(a, b) {
  return JSON.stringify(toComparable(a)) === JSON.stringify(toComparable(b))
}

export function identificarCamposAlterados(anterior = {}, atual = {}, ignorarCampos = []) {
  const ignored = new Set(ignorarCampos)
  const chaves = new Set([...Object.keys(anterior || {}), ...Object.keys(atual || {})])
  return Array.from(chaves)
    .filter((chave) => !ignored.has(chave))
    .filter((chave) => !deepEqual(anterior?.[chave], atual?.[chave]))
    .sort()
}

export function registrarEventoAuditoria({
  usuario = USUARIO_PADRAO_AUDITORIA,
  modulo,
  acao,
  registroId,
  registro,
  descricao,
  valorAnterior = null,
  novoValor = null,
  camposAlterados = [],
}) {
  if (!modulo || !acao || !registroId) return null

  const evento = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dataHora: new Date().toISOString(),
    usuario,
    modulo,
    acao,
    registroId,
    registro: registro || registroId,
    descricao: descricao || '',
    valorAnterior,
    novoValor,
    camposAlterados: Array.isArray(camposAlterados) ? camposAlterados : [],
  }

  const eventos = carregarEventos()
  eventos.push(evento)
  salvarEventos(eventos)
  return evento
}

export function listarEventosAuditoria({
  periodoInicio = '',
  periodoFim = '',
  modulo = '',
  acao = '',
  usuario = '',
  termo = '',
  registroId = '',
} = {}) {
  const termoBusca = (termo || '').trim().toLowerCase()
  const eventos = carregarEventos()

  return eventos
    .filter((item) => {
      if (!item?.dataHora || Number.isNaN(new Date(item.dataHora).getTime())) return false
      const dataDia = item.dataHora.slice(0, 10)
      if (periodoInicio && dataDia < periodoInicio) return false
      if (periodoFim && dataDia > periodoFim) return false
      if (modulo && item.modulo !== modulo) return false
      if (acao && item.acao !== acao) return false
      if (usuario && item.usuario !== usuario) return false
      if (registroId && item.registroId !== registroId) return false
      if (!termoBusca) return true

      const texto = [
        item.registro,
        item.registroId,
        item.descricao,
        item.modulo,
        item.acao,
      ].join(' ').toLowerCase()

      return texto.includes(termoBusca)
    })
    .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''))
}

export function listarHistoricoRegistro(modulo, registroId) {
  if (!modulo || !registroId) return []
  return listarEventosAuditoria({ modulo, registroId })
}

export function listarResumoFiltrosAuditoria() {
  const eventos = carregarEventos()
  const modulos = Array.from(new Set(eventos.map((item) => item.modulo).filter(Boolean))).sort()
  const acoes = Array.from(new Set(eventos.map((item) => item.acao).filter(Boolean))).sort()
  const usuarios = Array.from(new Set(eventos.map((item) => item.usuario).filter(Boolean))).sort()

  return { modulos, acoes, usuarios }
}
