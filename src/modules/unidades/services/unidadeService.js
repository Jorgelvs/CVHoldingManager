import { STORAGE_KEY } from '../constants/unidadeConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'

const defaultUnidades = []

function garantirEstrutura(item) {
  return {
    id: item.id || gerarId(),
    patrimonioId: item.patrimonioId || '',
    codigoInterno: item.codigoInterno || '',
    nome: item.nome || '',
    tipo: item.tipo || '',
    finalidade: item.finalidade || '',
    situacao: item.situacao || '',
    areaUtil: item.areaUtil ?? '',
    areaTotal: item.areaTotal ?? '',
    observacoes: item.observacoes || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }
}

function carregarUnidades() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    salvarUnidades(defaultUnidades)
    return defaultUnidades.map(garantirEstrutura)
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Dados inválidos')
    return parsed.map(garantirEstrutura)
  } catch {
    salvarUnidades(defaultUnidades)
    return defaultUnidades.map(garantirEstrutura)
  }
}

function salvarUnidades(unidades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unidades))
}

export function inicializarUnidades() {
  const unidadesExistentes = carregarUnidades()
  const atualizados = [...unidadesExistentes]

  defaultUnidades.forEach((item) => {
    const existe = unidadesExistentes.some(
      (current) => current.id === item.id || current.codigoInterno.toLowerCase() === item.codigoInterno.toLowerCase(),
    )
    if (!existe) {
      atualizados.push(garantirEstrutura(item))
    }
  })

  if (atualizados.length !== unidadesExistentes.length) {
    salvarUnidades(atualizados)
  }
}

export function listarUnidades() {
  return carregarUnidades()
}

export function listarUnidadesPorPatrimonio(patrimonioId) {
  return listarUnidades().filter((unidade) => unidade.patrimonioId === patrimonioId)
}

export function buscarUnidadePorId(id) {
  return listarUnidades().find((item) => item.id === id) || null
}

export function criarUnidade(dados) {
  const unidade = garantirEstrutura({
    ...dados,
    id: gerarId(),
    areaUtil: dados.areaUtil ?? '',
    areaTotal: dados.areaTotal ?? '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const unidades = listarUnidades()
  unidades.push(unidade)
  salvarUnidades(unidades)
  return unidade
}

export function atualizarUnidade(id, dados) {
  const unidades = listarUnidades()
  const index = unidades.findIndex((item) => item.id === id)
  if (index === -1) return null
  unidades[index] = garantirEstrutura({
    ...unidades[index],
    ...dados,
    updatedAt: new Date().toISOString(),
  })
  salvarUnidades(unidades)
  return unidades[index]
}

export function alterarSituacaoUnidade(id, situacao) {
  const unidades = listarUnidades()
  const index = unidades.findIndex((item) => item.id === id)
  if (index === -1) return null
  unidades[index] = {
    ...unidades[index],
    situacao,
    updatedAt: new Date().toISOString(),
  }
  salvarUnidades(unidades)
  return unidades[index]
}

export function verificarCodigoDuplicado(codigoInterno, id = null) {
  const valor = (codigoInterno || '').trim().toLowerCase()
  if (!valor) return false
  return listarUnidades().some((item) => item.codigoInterno.trim().toLowerCase() === valor && item.id !== id)
}
