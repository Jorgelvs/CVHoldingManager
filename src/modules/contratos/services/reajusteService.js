import { listarContratos, atualizarContrato } from './contratoService.js'
import { registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'

function calcularProximaData(dataBase, periodicidade) {
  if (!dataBase || !periodicidade) return ''
  const base = new Date(dataBase)
  if (Number.isNaN(base.getTime())) return ''

  const next = new Date(base)
  switch (periodicidade) {
    case 'Anual':
      next.setFullYear(next.getFullYear() + 1)
      break
    case 'Semestral':
      next.setMonth(next.getMonth() + 6)
      break
    case 'Mensal':
      next.setMonth(next.getMonth() + 1)
      break
    default:
      return ''
  }

  return next.toISOString().slice(0, 10)
}

function calcularValorReajustado(valorAtual, percentual) {
  const valor = Number(valorAtual || 0)
  const taxa = Number(percentual || 0)
  if (Number.isNaN(valor) || Number.isNaN(taxa)) return valorAtual
  return Number((valor * (1 + taxa / 100)).toFixed(2))
}

export function obterReajusteEstimado(contrato) {
  if (!contrato || contrato.reajusteTipo === 'Sem reajuste') return null
  const percentual = Number(contrato.percentualReajuste || 0)
  const valorAnterior = Number(contrato.valorAluguel || 0)
  const novoValor = calcularValorReajustado(valorAnterior, percentual)
  return {
    contratoId: contrato.id,
    percentualReajuste: percentual,
    valorAnterior,
    novoValor,
    dataBaseReajuste: contrato.dataBaseReajuste || '',
    periodicidade: contrato.periodicidadeReajuste || '',
    proximaDataReajuste: calcularProximaData(contrato.dataBaseReajuste, contrato.periodicidadeReajuste),
  }
}

export function aplicarReajuste(contrato, percentualManual = null, observacao = '') {
  if (!contrato) return null
  const percentual = percentualManual !== null ? Number(percentualManual) : Number(contrato.percentualReajuste || 0)
  const valorAnterior = Number(contrato.valorAluguel || 0)
  const novoValor = calcularValorReajustado(valorAnterior, percentual)
  const historico = Array.isArray(contrato.historicoReajustes) ? [...contrato.historicoReajustes] : []

  historico.push({
    id: `historico-${Date.now()}`,
    data: new Date().toISOString().slice(0, 10),
    percentual,
    valorAnterior,
    novoValor,
    observacao: observacao || '',
  })

  const hoje = new Date().toISOString().slice(0, 10)
  const next = calcularProximaData(hoje, contrato.periodicidadeReajuste || contrato.reajusteTipo)

  const contratadoAtualizado = {
    ...contrato,
    valorAluguel: novoValor,
    dataBaseReajuste: hoje,
    proximaDataReajuste: next,
    periodicidadeReajuste: contrato.periodicidadeReajuste || contrato.reajusteTipo,
    historicoReajustes: historico,
    updatedAt: new Date().toISOString(),
  }

  const atualizado = atualizarContrato(contrato.id, contratadoAtualizado, { skipAudit: true })
  if (!atualizado?.error && atualizado) {
    registrarEventoAuditoria({
      modulo: 'Contratos',
      acao: 'REAJUSTE_APLICADO',
      registroId: atualizado.id,
      registro: atualizado.codigoInterno || atualizado.id,
      descricao: `Aplicação de reajuste no contrato ${atualizado.codigoInterno || atualizado.id}`,
      valorAnterior: { valorAluguel: valorAnterior, dataBaseReajuste: contrato.dataBaseReajuste, proximaDataReajuste: contrato.proximaDataReajuste },
      novoValor: { valorAluguel: atualizado.valorAluguel, dataBaseReajuste: atualizado.dataBaseReajuste, proximaDataReajuste: atualizado.proximaDataReajuste },
      camposAlterados: ['valorAluguel', 'dataBaseReajuste', 'proximaDataReajuste', 'historicoReajustes'],
    })
  }
  return atualizado
}

export function listarReajustesPendentes() {
  const contratos = listarContratos().filter((item) => item.situacao === 'Ativo')
  return contratos
    .map((contrato) => ({
      contrato,
      proximaData: contrato.proximaDataReajuste || calcularProximaData(contrato.dataBaseReajuste, contrato.periodicidadeReajuste || contrato.reajusteTipo),
    }))
    .filter((item) => item.proximaData && item.proximaData <= addDays(new Date(), 90).toISOString().slice(0, 10))
    .sort((a, b) => a.proximaData.localeCompare(b.proximaData))
}

export function adiarReajuste(contrato, dias = 30) {
  if (!contrato) return null
  const proximaDataAtual = contrato.proximaDataReajuste || calcularProximaData(contrato.dataBaseReajuste, contrato.periodicidadeReajuste || contrato.reajusteTipo)
  const novaData = proximaDataAtual ? addDays(new Date(proximaDataAtual), dias).toISOString().slice(0, 10) : addDays(new Date(), dias).toISOString().slice(0, 10)
  const contratoAtualizado = {
    ...contrato,
    proximaDataReajuste: novaData,
    updatedAt: new Date().toISOString(),
  }
  const atualizado = atualizarContrato(contrato.id, contratoAtualizado, { skipAudit: true })
  if (!atualizado?.error && atualizado) {
    registrarEventoAuditoria({
      modulo: 'Contratos',
      acao: 'REAJUSTE_ADIADO',
      registroId: atualizado.id,
      registro: atualizado.codigoInterno || atualizado.id,
      descricao: `Adiamento de reajuste do contrato ${atualizado.codigoInterno || atualizado.id}`,
      valorAnterior: { proximaDataReajuste: contrato.proximaDataReajuste || proximaDataAtual },
      novoValor: { proximaDataReajuste: atualizado.proximaDataReajuste },
      camposAlterados: ['proximaDataReajuste'],
    })
  }
  return atualizado
}

export function marcarReajusteResolvido(contrato) {
  if (!contrato) return null
  const hoje = new Date().toISOString().slice(0, 10)
  const next = calcularProximaData(hoje, contrato.periodicidadeReajuste || contrato.reajusteTipo)
  const contratoAtualizado = {
    ...contrato,
    proximaDataReajuste: next,
    updatedAt: new Date().toISOString(),
  }
  const atualizado = atualizarContrato(contrato.id, contratoAtualizado, { skipAudit: true })
  if (!atualizado?.error && atualizado) {
    registrarEventoAuditoria({
      modulo: 'Contratos',
      acao: 'REAJUSTE_RESOLVIDO',
      registroId: atualizado.id,
      registro: atualizado.codigoInterno || atualizado.id,
      descricao: `Marcação de reajuste como resolvido no contrato ${atualizado.codigoInterno || atualizado.id}`,
      valorAnterior: { proximaDataReajuste: contrato.proximaDataReajuste },
      novoValor: { proximaDataReajuste: atualizado.proximaDataReajuste },
      camposAlterados: ['proximaDataReajuste'],
    })
  }
  return atualizado
}

export function renovarContrato(contrato, meses = null) {
  if (!contrato) return null
  const periodo = Number(meses || contrato.prazoMeses || 12)
  const hoje = new Date()
  const novaDataInicio = hoje.toISOString().slice(0, 10)
  const novaDataFim = addMonths(hoje, periodo).toISOString().slice(0, 10)
  const contratoAtualizado = {
    ...contrato,
    dataInicio: novaDataInicio,
    dataFim: novaDataFim,
    situacao: 'Ativo',
    updatedAt: new Date().toISOString(),
  }
  const atualizado = atualizarContrato(contrato.id, contratoAtualizado, { skipAudit: true })
  if (!atualizado?.error && atualizado) {
    registrarEventoAuditoria({
      modulo: 'Contratos',
      acao: 'CONTRATO_RENOVADO',
      registroId: atualizado.id,
      registro: atualizado.codigoInterno || atualizado.id,
      descricao: `Renovação do contrato ${atualizado.codigoInterno || atualizado.id}`,
      valorAnterior: { dataInicio: contrato.dataInicio, dataFim: contrato.dataFim, situacao: contrato.situacao },
      novoValor: { dataInicio: atualizado.dataInicio, dataFim: atualizado.dataFim, situacao: atualizado.situacao },
      camposAlterados: ['dataInicio', 'dataFim', 'situacao'],
    })
  }
  return atualizado
}

export function listarContratosVencendoPrazo() {
  const contratos = listarContratos().filter((item) => item.situacao === 'Ativo' && item.dataFim)
  const hoje = new Date().toISOString().slice(0, 10)
  return contratos
    .map((contrato) => ({
      contrato,
      diasRestantes: diffDays(hoje, contrato.dataFim),
    }))
    .filter((item) => item.diasRestantes <= 90)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
}

export function calcularProximoVencimento(contrato) {
  if (!contrato || !contrato.dataFim) return ''
  return contrato.dataFim
}

function diffDays(dataInicio, dataFim) {
  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)
  const diff = fim.getTime() - inicio.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMonths(date, months) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}
