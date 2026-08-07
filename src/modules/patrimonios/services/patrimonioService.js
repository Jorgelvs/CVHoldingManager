import { STORAGE_KEY } from '../constants/patrimonioConstants.js'
import { gerarId } from '../utils/patrimonioUtils.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'
import { listarUnidadesPorPatrimonio } from '../../unidades/services/unidadeService.js'

// Removido: seed hardcoded com nomes/IDs identicos ao inventario real da
// C&V Holding (Residence Kitnet I/II, Villa D'Oeste, Recanto da Brasa).
// Ter dado de demonstracao indistinguivel do dado real do negocio foi uma
// das causas da contaminacao de dados de teste relatada no handoff do
// projeto. Nao reintroduzir seed de negocio especifico no codigo-fonte.

function garantirEstrutura(item) {
  const source = applyCreationTimestamps(applyDomainSchema('patrimonio', item), {
    legacyCreatedFields: ['criadoEm'],
    legacyUpdatedFields: ['atualizadoEm'],
  })

  const endereco = {
    cep: source.endereco?.cep || '',
    logradouro: source.endereco?.logradouro || '',
    numero: source.endereco?.numero || '',
    complemento: source.endereco?.complemento || '',
    bairro: source.endereco?.bairro || '',
    cidade: source.endereco?.cidade || '',
    estado: source.endereco?.estado || '',
  }

  const configuracoes = {
    agua: source.configuracoes?.agua || '',
    energia: source.configuracoes?.energia || '',
    condominio: source.configuracoes?.condominio || '',
    iptu: source.configuracoes?.iptu || '',
    limpeza: source.configuracoes?.limpeza || '',
    regraRateio: source.configuracoes?.regraRateio || '',
    valorPadraoCondominio: source.configuracoes?.valorPadraoCondominio || '',
    observacoesOperacionais: source.configuracoes?.observacoesOperacionais || '',
  }

  return {
    id: source.id || gerarId(),
    nome: source.nome || '',
    codigo: source.codigo || '',
    grupoPatrimonial: source.grupoPatrimonial || source.grupo || '',
    tipo: source.tipo || '',
    finalidade: source.finalidade || '',
    modeloReceita: source.modeloReceita || '',
    situacao: source.situacao || '',
    situacaoRegistral: source.situacaoRegistral || source.situacaoRegistralPatrimonial || '',
    descricaoRegistral: source.descricaoRegistral || '',
    quantidadeUnidades: Number(source.quantidadeUnidades ?? source.quantidadePlanejadaUnidades) || 0,
    dataAquisicao: source.dataAquisicao || '',
    valorAquisicao: source.valorAquisicao || '',
    valorPatrimonial: source.valorPatrimonial || '',
    matricula: source.matricula || '',
    observacoes: source.observacoes || '',
    endereco,
    configuracoes,
    indicadores: {
      unidadesCadastradas: Number(source.indicadores?.unidadesCadastradas) || 0,
      unidadesOcupadas: Number(source.indicadores?.unidadesOcupadas) || 0,
      unidadesVagas: Number(source.indicadores?.unidadesVagas) || 0,
      unidadesEmManutencao: Number(source.indicadores?.unidadesEmManutencao) || 0,
    },
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    criadoEm: source.criadoEm,
    atualizadoEm: source.atualizadoEm,
  }
}

function carregarPatrimonios() {
  const dados = localGet(STORAGE_KEY, [])
  const parsed = Array.isArray(dados) ? dados : []
  return parsed.map(garantirEstrutura)
}

function salvarPatrimonios(patrimonios) {
  localSet(STORAGE_KEY, patrimonios)
}

export function inicializarPatrimonios() {
  carregarPatrimonios()
}

export function listarPatrimonios() {
  return carregarPatrimonios()
}

export function buscarPatrimonioPorId(id) {
  return listarPatrimonios().find((item) => item.id === id) || null
}

export function criarPatrimonio(dados) {
  const patrimonio = garantirEstrutura({
    ...dados,
    id: gerarId(),
    quantidadeUnidades: Number(dados.quantidadeUnidades) || 0,
    valorAquisicao: dados.valorAquisicao || '',
    valorPatrimonial: dados.valorPatrimonial || '',
    matricula: dados.matricula || '',
    endereco: {
      ...dados.endereco,
    },
    configuracoes: {
      ...dados.configuracoes,
    },
    indicadores: {
      unidadesCadastradas: 0,
      unidadesOcupadas: 0,
      unidadesVagas: 0,
      unidadesEmManutencao: 0,
    },
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  })
  const patrimonios = listarPatrimonios()
  patrimonios.push(patrimonio)
  salvarPatrimonios(patrimonios)

  registrarEventoAuditoria({
    modulo: 'Patrimônios',
    acao: 'INCLUSAO',
    registroId: patrimonio.id,
    registro: patrimonio.nome || patrimonio.codigo || patrimonio.id,
    descricao: `Inclusão do patrimônio ${patrimonio.nome || patrimonio.codigo || patrimonio.id}`,
    valorAnterior: null,
    novoValor: patrimonio,
    camposAlterados: Object.keys(patrimonio),
  })

  return patrimonio
}

export function atualizarPatrimonio(id, dados) {
  const patrimonios = listarPatrimonios()
  const index = patrimonios.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = patrimonios[index]
  patrimonios[index] = garantirEstrutura({
    ...touchUpdatedAt({ ...anterior, ...dados }, { legacyUpdatedFields: ['atualizadoEm'] }),
    quantidadeUnidades: Number(dados.quantidadeUnidades) || 0,
    valorAquisicao: dados.valorAquisicao || '',
    valorPatrimonial: dados.valorPatrimonial || '',
    matricula: dados.matricula || '',
    endereco: {
      ...patrimonios[index].endereco,
      ...dados.endereco,
    },
    configuracoes: {
      ...patrimonios[index].configuracoes,
      ...dados.configuracoes,
    },
  })
  salvarPatrimonios(patrimonios)

  const atualizado = patrimonios[index]
  const camposAlterados = identificarCamposAlterados(anterior, atualizado, ['atualizadoEm', 'updatedAt'])
  if (camposAlterados.length > 0) {
    registrarEventoAuditoria({
      modulo: 'Patrimônios',
      acao: 'ALTERACAO',
      registroId: atualizado.id,
      registro: atualizado.nome || atualizado.codigo || atualizado.id,
      descricao: `Alteração do patrimônio ${atualizado.nome || atualizado.codigo || atualizado.id}`,
      valorAnterior: anterior,
      novoValor: atualizado,
      camposAlterados,
    })
  }

  return patrimonios[index]
}

export function excluirPatrimonio(id) {
  const patrimonios = listarPatrimonios()
  const index = patrimonios.findIndex((item) => item.id === id)
  if (index === -1) return false
  if (!podeExcluirPatrimonio(patrimonios[index])) return false
  const removido = patrimonios[index]
  patrimonios.splice(index, 1)
  salvarPatrimonios(patrimonios)

  registrarEventoAuditoria({
    modulo: 'Patrimônios',
    acao: 'EXCLUSAO',
    registroId: removido.id,
    registro: removido.nome || removido.codigo || removido.id,
    descricao: `Exclusão do patrimônio ${removido.nome || removido.codigo || removido.id}`,
    valorAnterior: removido,
    novoValor: null,
    camposAlterados: ['id'],
  })

  return true
}

export function alterarSituacaoPatrimonio(id, situacao) {
  const patrimonios = listarPatrimonios()
  const index = patrimonios.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = patrimonios[index]
  patrimonios[index] = {
    ...touchUpdatedAt(anterior, { legacyUpdatedFields: ['atualizadoEm'] }),
    situacao,
  }
  salvarPatrimonios(patrimonios)

  const atualizado = patrimonios[index]
  const acao = situacao === 'Inativo' ? 'EXCLUSAO_LOGICA' : 'ALTERACAO'
  registrarEventoAuditoria({
    modulo: 'Patrimônios',
    acao,
    registroId: atualizado.id,
    registro: atualizado.nome || atualizado.codigo || atualizado.id,
    descricao: `Alteração de situação do patrimônio para ${situacao}`,
    valorAnterior: anterior,
    novoValor: atualizado,
    camposAlterados: ['situacao'],
  })

  return patrimonios[index]
}

export function podeExcluirPatrimonio(patrimonio) {
  if (!patrimonio?.id) return false
  const unidadesVinculadas = listarUnidadesPorPatrimonio(patrimonio.id)
  return unidadesVinculadas.length === 0
}

export function codigoUnicoDisponivel(codigo, id = null) {
  const valor = (codigo || '').trim().toLowerCase()
  if (!valor) return false
  return !listarPatrimonios().some((item) => item.codigo.trim().toLowerCase() === valor && item.id !== id)
}

export function gerarCodigoUnico(nome) {
  const base = (nome || '').trim()
    .normalize('NFD')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('')
    .slice(0, 3)
    .padEnd(3, 'X')
  let codigo = base
  let contador = 1
  while (!codigoUnicoDisponivel(codigo)) {
    codigo = `${base}${contador}`.slice(0, 6)
    contador += 1
  }
  return codigo
}
