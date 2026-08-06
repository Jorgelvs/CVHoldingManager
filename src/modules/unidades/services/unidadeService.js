import { STORAGE_KEY } from '../constants/unidadeConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { exists as localExists, get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'

const defaultUnidades = []

function notifyUnidadesUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('cvholding_unidades_updated'))
}

function garantirEstrutura(item) {
  const source = applyCreationTimestamps(applyDomainSchema('unidade', item), {
    legacyCreatedFields: ['criadoEm', 'dataCriacao'],
    legacyUpdatedFields: ['atualizadoEm', 'dataAtualizacao'],
  })

  return {
    id: source.id || gerarId(),
    patrimonioId: source.patrimonioId || source.patrimonio_id || '',
    codigoInterno: source.codigoInterno || '',
    nome: source.nome || '',
    tipo: source.tipo || '',
    finalidade: source.finalidade || '',
    situacao: source.situacao || '',
    areaUtil: source.areaUtil ?? '',
    areaTotal: source.areaTotal ?? '',
    observacoes: source.observacoes || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

function carregarUnidades() {
  const chaveExiste = localExists(STORAGE_KEY)
  const dados = localGet(STORAGE_KEY, defaultUnidades)
  const parsed = Array.isArray(dados) ? dados : defaultUnidades
  const normalizados = parsed.map(garantirEstrutura)

  if (!chaveExiste) {
    salvarUnidades(normalizados)
  }

  return normalizados
}

function salvarUnidades(unidades) {
  localSet(STORAGE_KEY, unidades)
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

  registrarEventoAuditoria({
    modulo: 'Unidades',
    acao: 'INCLUSAO',
    registroId: unidade.id,
    registro: unidade.nome || unidade.codigoInterno || unidade.id,
    descricao: `Inclusão da unidade ${unidade.nome || unidade.codigoInterno || unidade.id}`,
    valorAnterior: null,
    novoValor: unidade,
    camposAlterados: Object.keys(unidade),
  })

  notifyUnidadesUpdated()

  return unidade
}

export function atualizarUnidade(id, dados) {
  const unidades = listarUnidades()
  const index = unidades.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = unidades[index]
  unidades[index] = garantirEstrutura({
    ...touchUpdatedAt({ ...anterior, ...dados }),
  })
  salvarUnidades(unidades)

  const atualizado = unidades[index]
  const camposAlterados = identificarCamposAlterados(anterior, atualizado, ['updatedAt'])
  if (camposAlterados.length > 0) {
    registrarEventoAuditoria({
      modulo: 'Unidades',
      acao: 'ALTERACAO',
      registroId: atualizado.id,
      registro: atualizado.nome || atualizado.codigoInterno || atualizado.id,
      descricao: `Alteração da unidade ${atualizado.nome || atualizado.codigoInterno || atualizado.id}`,
      valorAnterior: anterior,
      novoValor: atualizado,
      camposAlterados,
    })
  }

  notifyUnidadesUpdated()

  return unidades[index]
}

export function alterarSituacaoUnidade(id, situacao) {
  const unidades = listarUnidades()
  const index = unidades.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = unidades[index]
  unidades[index] = {
    ...touchUpdatedAt(anterior),
    situacao,
  }
  salvarUnidades(unidades)

  const atualizado = unidades[index]
  const acao = situacao === 'Inativo' ? 'EXCLUSAO_LOGICA' : 'ALTERACAO'
  registrarEventoAuditoria({
    modulo: 'Unidades',
    acao,
    registroId: atualizado.id,
    registro: atualizado.nome || atualizado.codigoInterno || atualizado.id,
    descricao: `Alteração de situação da unidade para ${situacao}`,
    valorAnterior: anterior,
    novoValor: atualizado,
    camposAlterados: ['situacao'],
  })

  notifyUnidadesUpdated()

  return unidades[index]
}

export function verificarCodigoDuplicado(codigoInterno, id = null) {
  const valor = (codigoInterno || '').trim().toLowerCase()
  if (!valor) return false
  return listarUnidades().some((item) => item.codigoInterno.trim().toLowerCase() === valor && item.id !== id)
}
