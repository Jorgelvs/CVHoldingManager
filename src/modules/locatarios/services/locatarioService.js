import { STORAGE_KEY } from '../constants/locatarioConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { locatarioTemContratos as contratoVinculadoAoLocatario } from '../../contratos/services/contratoService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'

function garantirEstrutura(item) {
  const source = applyCreationTimestamps(applyDomainSchema('locatario', item), {
    legacyCreatedFields: ['criadoEm', 'dataCriacao'],
    legacyUpdatedFields: ['atualizadoEm', 'dataAtualizacao'],
  })

  return {
    id: source.id || gerarId(),
    nomeCompleto: source.nomeCompleto || '',
    cpf: source.cpf || '',
    rg: source.rg || '',
    dataNascimento: source.dataNascimento || '',
    telefone: source.telefone || '',
    whatsapp: source.whatsapp || '',
    email: source.email || '',
    endereco: source.endereco || '',
    numero: source.numero || '',
    complemento: source.complemento || '',
    bairro: source.bairro || '',
    cidade: source.cidade || '',
    estado: source.estado || '',
    cep: source.cep || '',
    nomePagador: source.nomePagador || '',
    cpfPagador: source.cpfPagador || '',
    telefonePagador: source.telefonePagador || '',
    observacoes: source.observacoes || '',
    situacao: source.situacao || 'Ativo',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

function carregarLocatarios() {
  const dados = localGet(STORAGE_KEY, [])
  const parsed = Array.isArray(dados) ? dados : []
  return parsed.map(garantirEstrutura)
}

function salvarLocatarios(locatarios) {
  localSet(STORAGE_KEY, locatarios)
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

  registrarEventoAuditoria({
    modulo: 'Locatários',
    acao: 'INCLUSAO',
    registroId: locatario.id,
    registro: locatario.nomeCompleto || locatario.id,
    descricao: `Inclusão do locatário ${locatario.nomeCompleto || locatario.id}`,
    valorAnterior: null,
    novoValor: locatario,
    camposAlterados: Object.keys(locatario),
  })

  return locatario
}

export function atualizarLocatario(id, dados) {
  const locatarios = listarLocatarios()
  const index = locatarios.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = locatarios[index]

  locatarios[index] = garantirEstrutura({
    ...touchUpdatedAt({ ...anterior, ...dados }),
  })

  salvarLocatarios(locatarios)

  const atualizado = locatarios[index]
  const camposAlterados = identificarCamposAlterados(anterior, atualizado, ['updatedAt'])
  if (camposAlterados.length > 0) {
    registrarEventoAuditoria({
      modulo: 'Locatários',
      acao: 'ALTERACAO',
      registroId: atualizado.id,
      registro: atualizado.nomeCompleto || atualizado.id,
      descricao: `Alteração do locatário ${atualizado.nomeCompleto || atualizado.id}`,
      valorAnterior: anterior,
      novoValor: atualizado,
      camposAlterados,
    })
  }

  return locatarios[index]
}

export function excluirLocatario(id) {
  if (contratoVinculadoAoLocatario(id)) {
    return false
  }

  const locatarios = listarLocatarios()
  const index = locatarios.findIndex((item) => item.id === id)
  if (index === -1) return false
  const removido = locatarios[index]

  locatarios.splice(index, 1)
  salvarLocatarios(locatarios)

  registrarEventoAuditoria({
    modulo: 'Locatários',
    acao: 'EXCLUSAO',
    registroId: removido.id,
    registro: removido.nomeCompleto || removido.id,
    descricao: `Exclusão do locatário ${removido.nomeCompleto || removido.id}`,
    valorAnterior: removido,
    novoValor: null,
    camposAlterados: ['id'],
  })

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
