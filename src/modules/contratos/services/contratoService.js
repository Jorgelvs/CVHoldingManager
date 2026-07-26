import { STORAGE_KEY } from '../constants/contratoConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { buscarUnidadePorId, alterarSituacaoUnidade } from '../../unidades/services/unidadeService.js'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'

const SEQUENCE_KEY = `${STORAGE_KEY}_sequence`

function garantirEstrutura(item) {
  return {
    id: item.id || gerarId(),
    codigoInterno: item.codigoInterno || gerarCodigoInterno(),
    patrimonioId: item.patrimonioId || '',
    unidadeId: item.unidadeId || '',
    locatarioId: item.locatarioId || '',
    dataInicio: item.dataInicio || '',
    dataFim: item.dataFim || '',
    diaVencimento: item.diaVencimento ?? '',
    valorAluguel: item.valorAluguel ?? '',
    valorCondominio: item.valorCondominio ?? '',
    valorCaucao: item.valorCaucao ?? '',
    percentualMulta: item.percentualMulta ?? '',
    percentualJuros: item.percentualJuros ?? '',
    reajusteTipo: item.reajusteTipo || 'Sem reajuste',
    indiceReajuste: item.indiceReajuste || 'Sem índice',
    dataBaseReajuste: item.dataBaseReajuste || '',
    prazoMeses: item.prazoMeses ?? '',
    situacao: item.situacao || 'Rascunho',
    observacoes: item.observacoes || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }
}

function carregarContratos() {
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

function salvarContratos(contratos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contratos))
}

function gerarCodigoInterno() {
  const year = new Date().getFullYear()
  const rawSequence = localStorage.getItem(SEQUENCE_KEY)
  const sequence = rawSequence ? Number(rawSequence) : 0
  const next = sequence + 1
  localStorage.setItem(SEQUENCE_KEY, String(next))
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

  return contrato
}

export function atualizarContrato(id, dados) {
  const contratos = listarContratos()
  const index = contratos.findIndex((item) => item.id === id)
  if (index === -1) return null

  const contratoAtual = contratos[index]
  const updated = garantirEstrutura({
    ...contratoAtual,
    ...dados,
    codigoInterno: contratoAtual.codigoInterno,
    updatedAt: new Date().toISOString(),
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
  return updated
}

export function alterarSituacaoContrato(id, novaSituacao) {
  const contratos = listarContratos()
  const index = contratos.findIndex((item) => item.id === id)
  if (index === -1) return null

  const contrato = contratos[index]
  if (['Encerrado', 'Cancelado'].includes(contrato.situacao)) {
    return null
  }

  if (novaSituacao === 'Ativo') {
    const ativoExistente = contratoAtivoPorUnidade(contrato.unidadeId)
    if (ativoExistente && ativoExistente.id !== contrato.id) {
      return { error: `Já existe contrato ativo ${ativoExistente.codigoInterno} nesta unidade.` }
    }
  }

  contratos[index] = {
    ...contrato,
    situacao: novaSituacao,
    updatedAt: new Date().toISOString(),
  }
  salvarContratos(contratos)
  atualizarSituacaoUnidadeSeNecessario(contratos[index])
  return contratos[index]
}

export function excluirContrato(id) {
  const contratos = listarContratos()
  const index = contratos.findIndex((item) => item.id === id)
  if (index === -1) return false
  if (contratos[index].situacao === 'Ativo') return false
  contratos.splice(index, 1)
  salvarContratos(contratos)
  return true
}
