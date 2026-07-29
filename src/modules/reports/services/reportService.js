import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { listarContas } from '../../financeiro/services/contaService.js'
import { listarMovimentos } from '../../financeiro/services/livroCaixaService.js'
import { listarContratos, contratoAtivoPorUnidade } from '../../contratos/services/contratoService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { getDataConsiderada, filtrarLancamentos, calcularTotalReceitas, calcularTotalDespesas, calcularResultado, getStatusEfetivo } from '../../financeiro/utils/financeiroUtils.js'

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoLocal(date) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function shiftPeriod(periodoInicio, periodoFim) {
  const inicio = parseDate(periodoInicio) || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const fim = parseDate(periodoFim) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  const periodoDias = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const previousFim = new Date(inicio.getTime() - 1 * 24 * 60 * 60 * 1000)
  const previousInicio = new Date(previousFim.getTime() - (periodoDias - 1) * 24 * 60 * 60 * 1000)
  return {
    periodoInicio: toIsoLocal(previousInicio),
    periodoFim: toIsoLocal(previousFim),
  }
}

function normalizeFilters(filters = {}) {
  return {
    periodoInicio: filters.periodoInicio || '',
    periodoFim: filters.periodoFim || '',
    patrimonioId: filters.patrimonioId || '',
    unidadeId: filters.unidadeId || '',
    contaFinanceiraId: filters.contaFinanceiraId || '',
    status: filters.status || '',
  }
}

function isContratoStatus(status) {
  return ['Ativo', 'Encerrado', 'Rascunho', 'Cancelado'].includes(status)
}

function filterContratos(contratos, unidades, filters) {
  return contratos.filter((contrato) => {
    if (!contrato) return false
    if (filters.patrimonioId && contrato.patrimonioId !== filters.patrimonioId) {
      if (filters.unidadeId || !filters.patrimonioId) {
        return false
      }
    }
    if (filters.unidadeId && contrato.unidadeId !== filters.unidadeId) return false
    if (filters.status && isContratoStatus(filters.status) && contrato.situacao !== filters.status) return false
    return true
  })
}

function filterUnits(unidades, contracts, filters) {
  return unidades.filter((unidade) => {
    if (!unidade) return false
    if (filters.patrimonioId && unidade.patrimonioId !== filters.patrimonioId) return false
    if (filters.unidadeId && unidade.id !== filters.unidadeId) return false
    if (filters.status && isContratoStatus(filters.status)) {
      const ativo = Boolean(contracts.find((contrato) => contrato.unidadeId === unidade.id && contrato.situacao === 'Ativo'))
      if (filters.status === 'Ativo' && !ativo) return false
      if (filters.status !== 'Ativo' && ativo) return false
    }
    return true
  })
}

function filterLancamentosByLocation(lancamentos, units, patrimonios, filters) {
  if (!filters.patrimonioId && !filters.unidadeId) return lancamentos
  return lancamentos.filter((lanc) => {
    if (filters.unidadeId && lanc.unidadeId !== filters.unidadeId) return false
    if (filters.patrimonioId) {
      if (lanc.patrimonioId === filters.patrimonioId) return true
      const unidade = units.find((u) => u.id === lanc.unidadeId)
      if (unidade?.patrimonioId === filters.patrimonioId) return true
      return false
    }
    return true
  })
}

function filterMovimentos(movements, filters) {
  return movements.filter((mov) => {
    if (!mov) return false
    if (filters.contaFinanceiraId && mov.contaFinanceiraId !== filters.contaFinanceiraId) return false
    if (filters.periodoInicio && mov.data < filters.periodoInicio) return false
    if (filters.periodoFim && mov.data > filters.periodoFim) return false
    return true
  })
}

function getVacanciaStatistics(unidades, contratos) {
  const total = unidades.length
  const ocupadas = unidades.filter((item) => contratoAtivoPorUnidade(item.id)).length
  const vagas = total - ocupadas
  return {
    totalUnidades: total,
    unidadesOcupadas: ocupadas,
    unidadesVagas: vagas,
    percentualVacancia: total ? Math.round((vagas / total) * 10000) / 100 : 0,
  }
}

function getAverageVacancyDays(unidades, contratos) {
  const hoje = new Date().toISOString().slice(0, 10)
  const vacantes = unidades.filter((item) => !contratoAtivoPorUnidade(item.id))
  const dias = vacantes.map((unidade) => {
    const historico = contratos
      .filter((contrato) => contrato.unidadeId === unidade.id && contrato.dataFim && contrato.dataFim < hoje)
      .map((contrato) => new Date(contrato.dataFim))
      .sort((a, b) => b.getTime() - a.getTime())
    if (historico.length === 0) return null
    const ultimoFim = historico[0]
    const diff = Math.round((new Date(hoje).getTime() - ultimoFim.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 ? diff : null
  }).filter((value) => value !== null)
  if (dias.length === 0) return 0
  return Math.round(dias.reduce((total, item) => total + item, 0) / dias.length)
}

function getContractsByPatrimonio(contratos, unidades, patrimonioId) {
  return contratos.filter((contrato) => {
    if (contrato.patrimonioId === patrimonioId) return true
    const unidade = unidades.find((unidade) => unidade.id === contrato.unidadeId)
    return unidade?.patrimonioId === patrimonioId
  })
}

function safeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function getRelatoriosData(filters = {}) {
  const safeFilters = normalizeFilters(filters)
  const lancamentos = listarLancamentos()
  const contas = listarContas()
  const movimentos = listarMovimentos()
  const contratos = listarContratos()
  const unidades = listarUnidades()
  const patrimonios = listarPatrimonios()

  const lancamentosFiltrados = filtrarLancamentos(lancamentos, {
    periodoInicio: safeFilters.periodoInicio,
    periodoFim: safeFilters.periodoFim,
    contaFinanceiraId: safeFilters.contaFinanceiraId,
    status: safeFilters.status,
    patrimonioId: safeFilters.patrimonioId,
    unidadeId: safeFilters.unidadeId,
  })

  const movimentosFiltrados = filterMovimentos(movimentos, safeFilters)
  const contratosFiltrados = filterContratos(contratos, unidades, safeFilters)
  const unidadesFiltradas = filterUnits(unidades, contratos, safeFilters)

  const receitas = calcularTotalReceitas(lancamentosFiltrados)
  const despesas = calcularTotalDespesas(lancamentosFiltrados)
  const resultado = calcularResultado(lancamentosFiltrados)

  const prevPeriod = shiftPeriod(safeFilters.periodoInicio, safeFilters.periodoFim)
  const lancamentosPeriodoAnterior = filtrarLancamentos(lancamentos, {
    periodoInicio: prevPeriod.periodoInicio,
    periodoFim: prevPeriod.periodoFim,
    contaFinanceiraId: safeFilters.contaFinanceiraId,
    status: safeFilters.status,
    patrimonioId: safeFilters.patrimonioId,
    unidadeId: safeFilters.unidadeId,
  })
  const receitasAnterior = calcularTotalReceitas(lancamentosPeriodoAnterior)
  const despesasAnterior = calcularTotalDespesas(lancamentosPeriodoAnterior)
  const resultadoAnterior = calcularResultado(lancamentosPeriodoAnterior)

  const fluxoCaixaEntradas = movimentosFiltrados.filter((m) => m.natureza === 'entrada').reduce((sum, m) => sum + Number(m.valor || 0), 0)
  const fluxoCaixaSaidas = movimentosFiltrados.filter((m) => m.natureza === 'saida').reduce((sum, m) => sum + Number(m.valor || 0), 0)
  const fluxoCaixa = fluxoCaixaEntradas - fluxoCaixaSaidas

  const contratosAtivos = contratosFiltrados.filter((contrato) => contrato.situacao === 'Ativo').length
  const contratosEncerrados = contratosFiltrados.filter((contrato) => contrato.situacao === 'Encerrado').length
  const contratosComReajuste = contratosFiltrados.filter((contrato) => contrato.reajusteTipo && contrato.reajusteTipo !== 'Sem reajuste').length

  const lancamentosVencidos = lancamentosFiltrados.filter((item) => item.status !== 'cancelado' && item.status !== 'pago' && item.dataVencimento && item.dataVencimento < new Date().toISOString().slice(0, 10))
  const inadimplenciaValor = lancamentosVencidos.reduce((sum, item) => sum + Number(item.valor || 0), 0)

  const vacancia = getVacanciaStatistics(unidadesFiltradas, contratosFiltrados)
  const tempoMedioVacancia = getAverageVacancyDays(unidadesFiltradas, contratosFiltrados)

  const patrimonialPorPatrimonio = patrimonios.map((patrimonio) => {
    const unidadesDoPatrimonio = unidades.filter((unidade) => unidade.patrimonioId === patrimonio.id)
    const contratosDoPatrimonio = getContractsByPatrimonio(contratosFiltrados, unidades, patrimonio.id)
    const lancamentosDoPatrimonio = filterLancamentosByLocation(lancamentosFiltrados, unidades, patrimonios, { patrimonioId: patrimonio.id })
    const receitasPatrimonio = calcularTotalReceitas(lancamentosDoPatrimonio)
    const despesasPatrimonio = calcularTotalDespesas(lancamentosDoPatrimonio)
    const resultadoPatrimonio = calcularResultado(lancamentosDoPatrimonio)
    const ocupacaoPatrimonio = getVacanciaStatistics(unidadesDoPatrimonio, contratosDoPatrimonio)
    const rentabilidade = receitasPatrimonio ? Math.round((resultadoPatrimonio / receitasPatrimonio) * 10000) / 100 : 0
    return {
      patrimonioId: patrimonio.id,
      patrimonioNome: patrimonio.nome || 'Sem patrimônio',
      receitas: receitasPatrimonio,
      despesas: despesasPatrimonio,
      resultado: resultadoPatrimonio,
      taxaOcupacao: ocupacaoPatrimonio.totalUnidades ? Math.round((ocupacaoPatrimonio.unidadesOcupadas / ocupacaoPatrimonio.totalUnidades) * 10000) / 100 : 0,
      rentabilidade,
      totalUnidades: ocupacaoPatrimonio.totalUnidades,
    }
  })

  const unidadesPorUnidade = unidadesFiltradas.map((unidade) => {
    const lancamentosDaUnidade = lancamentosFiltrados.filter((lanc) => lanc.unidadeId === unidade.id)
    const receitasUnidade = calcularTotalReceitas(lancamentosDaUnidade)
    const despesasUnidade = calcularTotalDespesas(lancamentosDaUnidade)
    const resultadoUnidade = calcularResultado(lancamentosDaUnidade)
    const temContratoAtivo = Boolean(contratos.find((contrato) => contrato.unidadeId === unidade.id && contrato.situacao === 'Ativo'))
    return {
      unidadeId: unidade.id,
      unidadeNome: unidade.nome || unidade.codigoInterno || 'Sem unidade',
      patrimonioId: unidade.patrimonioId,
      patrimonioNome: patrimonios.find((patrimonio) => patrimonio.id === unidade.patrimonioId)?.nome || 'Sem patrimônio',
      situacao: unidade.situacao || 'Sem situação',
      ocupada: temContratoAtivo,
      receitas: receitasUnidade,
      despesas: despesasUnidade,
      resultado: resultadoUnidade,
    }
  })

  const historicoOcupacao = [
    { label: 'Ocupadas', value: unidadesPorUnidade.filter((item) => item.ocupada).length },
    { label: 'Desocupadas', value: unidadesPorUnidade.filter((item) => !item.ocupada).length },
    { label: 'Em manutenção', value: unidadesPorUnidade.filter((item) => item.situacao === 'Em manutenção').length },
    { label: 'Em implantação', value: unidadesPorUnidade.filter((item) => item.situacao === 'Em implantação').length },
  ]

  return {
    filters: safeFilters,
    financeiro: {
      receitas,
      despesas,
      resultado,
      fluxoCaixaEntradas,
      fluxoCaixaSaidas,
      fluxoCaixa,
      comparativo: {
        periodoAnterior: {
          receitas: receitasAnterior,
          despesas: despesasAnterior,
          resultado: resultadoAnterior,
        },
      },
    },
    locacoes: {
      contratosAtivos,
      contratosEncerrados,
      vacancia,
      inadimplenciaQuantidade: lancamentosVencidos.length,
      inadimplenciaValor,
      reajustes: contratosComReajuste,
    },
    patrimonial: {
      porPatrimonio: patrimonialPorPatrimonio,
    },
    unidade: {
      historicoOcupacao,
      porUnidade: unidadesPorUnidade,
      tempoMedioVacancia,
    },
    tables: {
      lancamentos: lancamentosFiltrados,
      contratos: contratosFiltrados,
      patrimonios: patrimonialPorPatrimonio,
      unidades: unidadesPorUnidade,
    },
  }
}
