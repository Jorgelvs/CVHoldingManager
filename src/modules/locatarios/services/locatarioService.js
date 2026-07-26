import { STORAGE_KEY } from '../constants/locatarioConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'

function garantirEstrutura(item) {
  return {
    id: item.id || gerarId(),
    nomeCompleto: item.nomeCompleto || '',
    cpf: item.cpf || '',
    rg: item.rg || '',
    dataNascimento: item.dataNascimento || '',
    telefone: item.telefone || '',
    whatsapp: item.whatsapp || '',
    email: item.email || '',
    endereco: item.endereco || '',
    numero: item.numero || '',
    complemento: item.complemento || '',
    bairro: item.bairro || '',
    cidade: item.cidade || '',
    estado: item.estado || '',
    cep: item.cep || '',
    nomePagador: item.nomePagador || '',
    cpfPagador: item.cpfPagador || '',
    telefonePagador: item.telefonePagador || '',
    observacoes: item.observacoes || '',
    situacao: item.situacao || 'Ativo',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }
}

function carregarLocatarios() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Dados inválidos')
    return parsed.map(garantirEstrutura)
  } catch {
    const empty = []
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty))
    return empty
  }
}

function salvarLocatarios(locatarios) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locatarios))
}

export function inicializarLocatarios() {
  carregarLocatarios()
}

export function listarLocatarios() {
  return carregarLocatarios()
}

export function buscarLocatarioPorId(id) {
  return listarLocatarios().find((item) => item.id === id) || null
}

export function criarLocatario(dados) {
  const locatario = garantirEstrutura({
    ...dados,
    id: gerarId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const locatarios = listarLocatarios()
  locatarios.push(locatario)
  salvarLocatarios(locatarios)
  return locatario
}

export function atualizarLocatario(id, dados) {
  const locatarios = listarLocatarios()
  const index = locatarios.findIndex((item) => item.id === id)
  if (index === -1) return null

  locatarios[index] = garantirEstrutura({
    ...locatarios[index],
    ...dados,
    updatedAt: new Date().toISOString(),
  })

  salvarLocatarios(locatarios)
  return locatarios[index]
}

function locatarioTemContratos(id) {
  const raw = localStorage.getItem('cvholding_contratos')
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return false
    return parsed.some((item) => item.locatarioId === id)
  } catch {
    return false
  }
}

export function excluirLocatario(id) {
  if (locatarioTemContratos(id)) {
    return false
  }

  const locatarios = listarLocatarios()
  const index = locatarios.findIndex((item) => item.id === id)
  if (index === -1) return false

  locatarios.splice(index, 1)
  salvarLocatarios(locatarios)
  return true
}

export function cpfUnicoDisponivel(cpf, id = null) {
  const valor = (cpf || '').replace(/\D/g, '').trim()
  if (!valor) return true
  return !listarLocatarios().some(
    (item) =>
      item.id !== id &&
      (item.cpf || '').replace(/\D/g, '').trim() === valor,
  )
}
