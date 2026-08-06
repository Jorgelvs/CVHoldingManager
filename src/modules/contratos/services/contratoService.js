import { STORAGE_KEY } from '../constants/contratoConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { buscarUnidadePorId, alterarSituacaoUnidade } from '../../unidades/services/unidadeService.js'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'

const SEQUENCE_KEY = `${STORAGE_KEY}_sequence`

function garantirEstrutura(item) {
  const source = applyCreationTimestamps(applyDomainSchema('contrato', item), {
    legacyCreatedFields: ['criadoEm', 'dataCriacao'],
    legacyUpdatedFields: ['atualizadoEm', 'dataAtualizacao'],
  })

  return {
    id: source.id || gerarId(),
    codigoInterno: source.codigoInterno || gerarCodigoInterno(),
    patrimonioId: source.patrimonioId || '',
    unidadeId: source.unidadeId || '',
    locatarioId: source.locatarioId || '',
    dataInicio: source.dataInicio || '',
    dataFim: source.dataFim || '',
    diaVencimento: source.diaVencimento ?? '',
    valorAluguel: source.valorAluguel ?? '',
    valorCondominio: source.valorCondominio ?? '',
    valorCaucao: source.valorCaucao ?? '',
    percentualMulta: source.percentualMulta ?? '',
    percentualJuros: source.percentualJuros ?? '',
    reajusteTipo: source.reajusteTipo || 'Sem reajuste',
    indiceReajuste: source.indiceReajuste || 'Sem índice',
    percentualReajuste: source.percentualReajuste ?? '',
    periodicidadeReajuste: source.periodicidadeReajuste || source.reajusteTipo || '',
    prazoAlertaReajusteDias: source.prazoAlertaReajusteDias ?? '',
    dataBaseReajuste: source.dataBaseReajuste || '',
    proximaDataReajuste: source.proximaDataReajuste || '',
    historicoReajustes: Array.isArray(source.historicoReajustes) ? source.historicoReajustes : [],
    prazoMeses: source.prazoMeses ?? '',
    situacao: source.situacao || 'Rascunho',
    observacoes: source.observacoes || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

function carregarContratos() {
  const dados = localGet(STORAGE_KEY, [])
  const parsed = Array.isArray(dados) ? dados : []
  return parsed.map(garantirEstrutura)
}

function salvarContratos(contratos) {
  localSet(STORAGE_KEY, contratos)
}

function gerarCodigoInterno() {
  const year = new Date().getFullYear()
  const sequence = Number(localGet(SEQUENCE_KEY, 0)) || 0
  const next = sequence + 1
  localSet(SEQUENCE_KEY, next)
  return `CTR-${year}-${String(next).padStart(4, '0')}`
}

export function inicializarContratos() {
  carregarContratos()
}

export function listarContratos() {
  return carregarContratos()
}

export function listarContratosPorLocatario(locatarioId) {
  return listarContratos().filter((item) => item.locatarioId === locatarioId)
}

export function listarContratosPorUnidade(unidadeId) {
  return listarContratos().filter((item) => item.unidadeId === unidadeId)
}

export function buscarContratoPorId(id) {
  return listarContratos().find((item) => item.id === id) || null
}

export function contratoAtivoPorUnidade(unidadeId) {
  return listarContratos().find(
    (item) => item.unidadeId === unidadeId && item.situacao === 'Ativo',
  ) || null
}

export function locatarioTemContratos(locatarioId) {
  return listarContratos().some((item) => item.locatarioId === locatarioId)
}

export function validarContrato(dados) {
  const errors = {}
  if (!dados.patrimonioId) errors.patrimonioId = 'Patrimônio obrigatório.'
  if (!dados.unidadeId) errors.unidadeId = 'Unidade obrigatória.'
  if (!dados.locatarioId) errors.locatarioId = 'Locatário obrigatório.'
  if (!dados.dataInicio) errors.dataInicio = 'Data de início obrigatória.'
  if (dados.dataFim && dados.dataInicio && dados.dataFim < dados.dataInicio) {
    errors.dataFim = 'Data de término não pode ser anterior à data de início.'
  }
  if (dados.situacao === 'Ativo' && (dados.diaVencimento === '' || dados.diaVencimento === null || dados.diaVencimento === undefined)) {
    errors.diaVencimento = 'Dia de vencimento do aluguel é obrigatório para contrato ativo.'
  }
  if (dados.diaVencimento !== '') {
    const dia = Number(dados.diaVencimento)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      errors.diaVencimento = 'Informe um dia entre 1 e 31.'
    }
  }
  const validarValor = (campo, valor) => {
    if (valor === '' || valor === null || valor === undefined) return
    const numero = Number(valor)
    if (Number.isNaN(numero) || numero < 0) {
      errors[campo] = 'Deve ser igual ou maior que zero.'
    }
  }
  validarValor('valorAluguel', dados.valorAluguel)
  validarValor('valorCondominio', dados.valorCondominio)
  validarValor('valorCaucao', dados.valorCaucao)
  validarValor('percentualMulta', dados.percentualMulta)
  validarValor('percentualJuros', dados.percentualJuros)
  if (dados.patrimonioId && !buscarPatrimonioPorId(dados.patrimonioId)) {
    errors.patrimonioId = 'Patrimônio não encontrado.'
  }
  if (dados.unidadeId && !buscarUnidadePorId(dados.unidadeId)) {
    errors.unidadeId = 'Unidade não encontrada.'
  }
  if (dados.locatarioId && !buscarLocatarioPorId(dados.locatarioId)) {
    errors.locatarioId = 'Locatário não encontrado.'
  }

  return errors
}

function atualizarSituacaoUnidadeSeNecessario(contrato) {
  const unidade = buscarUnidadePorId(contrato.unidadeId)
  if (!unidade) return
  const ativo = contrato.situacao === 'Ativo'
  if (ativo) {
    alterarSituacaoUnidade(unidade.id, 'Ocupada')
    return
  }
  const outroAtivo = contratoAtivoPorUnidade(unidade.id)
  if (!outroAtivo) {
    alterarSituacaoUnidade(unidade.id, 'Disponível')
  }
}

export function criarContrato(dados) {
  const erros = validarContrato(dados)
  if (Object.keys(erros).length > 0) {
    return { error: Object.values(erros)[0], errors: erros }
  }

  const contrato = garantirEstrutura({
    ...dados,
    id: gerarId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  if (contrato.situacao === 'Ativo') {
    const conflito = contratoAtivoPorUnidade(contrato.unidadeId)
    if (conflito && conflito.id !== contrato.id) {
      return { error: `Já existe contrato ativo ${conflito.codigoInterno} nesta unidade.` }
    }
  }

  const contratos = listarContratos()
  contratos.push(contrato)
  salvarContratos(contratos)

  if (contrato.situacao === 'Ativo') {
    atualizarSituacaoUnidadeSeNecessario(contrato)
  }

  registrarEventoAuditoria({
    modulo: 'Contratos',
    acao: 'INCLUSAO',
    registroId: contrato.id,
    registro: contrato.codigoInterno || contrato.id,
    descricao: `Inclusão do contrato ${contrato.codigoInterno || contrato.id}`,
    valorAnterior: null,
    novoValor: contrato,
    camposAlterados: Object.keys(contrato),
  })

  return contrato
}

export function atualizarContrato(id, dados, opcoes = {}) {
  const contratos = listarContratos()
  const index = contratos.findIndex((item) => item.id === id)
  if (index === -1) return null

  const contratoAtual = contratos[index]
  const dadosValidacao = { ...contratoAtual, ...dados }
  const erros = validarContrato(dadosValidacao)
  if (Object.keys(erros).length > 0) {
    return { error: Object.values(erros)[0], errors: erros }
  }

  const updated = garantirEstrutura({
    ...touchUpdatedAt({ ...contratoAtual, ...dados }),
    codigoInterno: contratoAtual.codigoInterno,
  })

  if (updated.situacao === 'Ativo') {
    const conflito = contratoAtivoPorUnidade(updated.unidadeId)
    if (conflito && conflito.id !== updated.id) {
      return { error: `Já existe contrato ativo ${conflito.codigoInterno} nesta unidade.` }
    }
  }

  if (contratoAtual.situacao === 'Ativo' && updated.situacao === 'Rascunho') {
    updated.situacao = contratoAtual.situacao
  }

  contratos[index] = updated
  salvarContratos(contratos)
  atualizarSituacaoUnidadeSeNecessario(updated)

  if (!opcoes.skipAudit) {
    const camposAlterados = identificarCamposAlterados(contratoAtual, updated, ['updatedAt'])
    if (camposAlterados.length > 0) {
      registrarEventoAuditoria({
        modulo: 'Contratos',
        acao: 'ALTERACAO',
        registroId: updated.id,
        registro: updated.codigoInterno || updated.id,
        descricao: `Alteração do contrato ${updated.codigoInterno || updated.id}`,
        valorAnterior: contratoAtual,
        novoValor: updated,
        camposAlterados,
      })
    }
  }

  return updated
}

export function alterarSituacaoContrato(id, novaSituacao, opcoes = {}) {
  const contratos = listarContratos()
  const index = contratos.findIndex((item) => item.id === id)
  if (index === -1) return null

  const contrato = contratos[index]
  if (['Encerrado', 'Cancelado'].includes(contrato.situacao)) {
    return null
  }

  if (novaSituacao === 'Ativo') {
    const dia = Number(contrato.diaVencimento)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return { error: 'Dia de vencimento do aluguel é obrigatório para ativar o contrato.' }
    }

    const ativoExistente = contratoAtivoPorUnidade(contrato.unidadeId)
    if (ativoExistente && ativoExistente.id !== contrato.id) {
      return { error: `Já existe contrato ativo ${ativoExistente.codigoInterno} nesta unidade.` }
    }
  }

  contratos[index] = {
    ...touchUpdatedAt(contrato),
    situacao: novaSituacao,
  }
  salvarContratos(contratos)
  atualizarSituacaoUnidadeSeNecessario(contratos[index])

  if (!opcoes.skipAudit) {
    const atualizado = contratos[index]
    const acao = novaSituacao === 'Encerrado' ? 'CONTRATO_ENCERRADO' : novaSituacao === 'Cancelado' ? 'EXCLUSAO_LOGICA' : 'ALTERACAO'
    registrarEventoAuditoria({
      modulo: 'Contratos',
      acao,
      registroId: atualizado.id,
      registro: atualizado.codigoInterno || atualizado.id,
      descricao: `Alteração de situação do contrato para ${novaSituacao}`,
      valorAnterior: contrato,
      novoValor: atualizado,
      camposAlterados: ['situacao'],
    })
  }

  return contratos[index]
}

export function excluirContrato(id) {
  const contratos = listarContratos()
  const index = contratos.findIndex((item) => item.id === id)
  if (index === -1) return false
  if (contratos[index].situacao === 'Ativo') return false
  const removido = contratos[index]
  contratos.splice(index, 1)
  salvarContratos(contratos)

  registrarEventoAuditoria({
    modulo: 'Contratos',
    acao: 'EXCLUSAO',
    registroId: removido.id,
    registro: removido.codigoInterno || removido.id,
    descricao: `Exclusão do contrato ${removido.codigoInterno || removido.id}`,
    valorAnterior: removido,
    novoValor: null,
    camposAlterados: ['id'],
  })

  return true
}
