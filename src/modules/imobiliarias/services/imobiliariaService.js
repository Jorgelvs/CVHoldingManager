import { STORAGE_KEY } from '../constants/imobiliariaConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'

function garantirEstrutura(item) {
  const source = applyCreationTimestamps(applyDomainSchema('imobiliaria', item), {
    legacyCreatedFields: ['criadoEm'],
    legacyUpdatedFields: ['atualizadoEm'],
  })

  return {
    id: source.id || gerarId(),
    nome: source.nome || '',
    // Percentual de comissão aplicado somente sobre aluguel e multa
    // (nunca sobre condomínio/água/energia) — ver comissaoService.js.
    percentualComissao: Number(source.percentualComissao ?? 0),
    contato: source.contato || '',
    telefone: source.telefone || '',
    email: source.email || '',
    situacao: source.situacao || 'Ativa',
    observacoes: source.observacoes || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

function carregarImobiliarias() {
  const dados = localGet(STORAGE_KEY, [])
  const parsed = Array.isArray(dados) ? dados : []
  return parsed.map(garantirEstrutura)
}

function salvarImobiliarias(imobiliarias) {
  localSet(STORAGE_KEY, imobiliarias)
}

export function inicializarImobiliarias() {
  carregarImobiliarias()
}

export function listarImobiliarias() {
  return carregarImobiliarias()
}

export function listarImobiliariasAtivas() {
  return listarImobiliarias().filter((item) => item.situacao === 'Ativa')
}

export function buscarImobiliariaPorId(id) {
  if (!id) return null
  return listarImobiliarias().find((item) => item.id === id) || null
}

export function validarImobiliaria(dados) {
  const errors = {}
  if (!dados.nome || !dados.nome.trim()) errors.nome = 'Nome obrigatório.'
  const percentual = Number(dados.percentualComissao)
  if (dados.percentualComissao === '' || dados.percentualComissao === null || dados.percentualComissao === undefined) {
    errors.percentualComissao = 'Percentual de comissão obrigatório.'
  } else if (Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
    errors.percentualComissao = 'Percentual deve estar entre 0 e 100.'
  }
  return errors
}

export function criarImobiliaria(dados) {
  const errors = validarImobiliaria(dados)
  if (Object.keys(errors).length > 0) {
    return { error: Object.values(errors)[0], errors }
  }

  const imobiliaria = garantirEstrutura({
    ...dados,
    id: gerarId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const imobiliarias = listarImobiliarias()
  imobiliarias.push(imobiliaria)
  salvarImobiliarias(imobiliarias)

  registrarEventoAuditoria({
    modulo: 'Imobiliárias',
    acao: 'INCLUSAO',
    registroId: imobiliaria.id,
    registro: imobiliaria.nome || imobiliaria.id,
    descricao: `Inclusão da imobiliária ${imobiliaria.nome || imobiliaria.id}`,
    valorAnterior: null,
    novoValor: imobiliaria,
    camposAlterados: Object.keys(imobiliaria),
  })

  return imobiliaria
}

export function atualizarImobiliaria(id, dados) {
  const imobiliarias = listarImobiliarias()
  const index = imobiliarias.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = imobiliarias[index]

  const dadosValidacao = { ...anterior, ...dados }
  const errors = validarImobiliaria(dadosValidacao)
  if (Object.keys(errors).length > 0) {
    return { error: Object.values(errors)[0], errors }
  }

  imobiliarias[index] = garantirEstrutura({
    ...touchUpdatedAt({ ...anterior, ...dados }, { legacyUpdatedFields: ['atualizadoEm'] }),
  })

  salvarImobiliarias(imobiliarias)

  const atualizado = imobiliarias[index]
  const camposAlterados = identificarCamposAlterados(anterior, atualizado, ['updatedAt', 'atualizadoEm'])
  if (camposAlterados.length > 0) {
    registrarEventoAuditoria({
      modulo: 'Imobiliárias',
      acao: 'ALTERACAO',
      registroId: atualizado.id,
      registro: atualizado.nome || atualizado.id,
      descricao: `Alteração da imobiliária ${atualizado.nome || atualizado.id}`,
      valorAnterior: anterior,
      novoValor: atualizado,
      camposAlterados,
    })
  }

  return atualizado
}

export function imobiliariaEmUsoPorContrato(imobiliariaId) {
  // Checagem indireta (sem import circular): contratoService.js poderia
  // importar imobiliariaService, então aqui lemos a storage key de
  // contratos diretamente em vez de importar o serviço.
  const contratos = localGet('cvholding_contratos', [])
  if (!Array.isArray(contratos)) return false
  return contratos.some((item) => item.imobiliariaId === imobiliariaId)
}

export function excluirImobiliaria(id) {
  if (imobiliariaEmUsoPorContrato(id)) return false

  const imobiliarias = listarImobiliarias()
  const index = imobiliarias.findIndex((item) => item.id === id)
  if (index === -1) return false
  const removida = imobiliarias[index]

  imobiliarias.splice(index, 1)
  salvarImobiliarias(imobiliarias)

  registrarEventoAuditoria({
    modulo: 'Imobiliárias',
    acao: 'EXCLUSAO',
    registroId: removida.id,
    registro: removida.nome || removida.id,
    descricao: `Exclusão da imobiliária ${removida.nome || removida.id}`,
    valorAnterior: removida,
    novoValor: null,
    camposAlterados: ['id'],
  })

  return true
}
