import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { getDataConsiderada } from '../../financeiro/utils/financeiroUtils.js'
import { listarContas, calcularSaldo } from '../../financeiro/services/contaService.js'
import { listarMovimentos } from '../../financeiro/services/livroCaixaService.js'
import { listarContratos, contratoAtivoPorUnidade } from '../../contratos/services/contratoService.js'
import { listarContratosVencendoPrazo, listarReajustesPendentes } from '../../contratos/services/reajusteService.js'
import { listarDocumentosVencendoPrazo } from '../../documentos/services/documentoService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarLocatarios } from '../../locatarios/services/locatarioService.js'

function normalizarMes(mes) {
  if (!mes) return ''
  return String(mes).length === 1 ? `0${mes}` : String(mes)
}

function toPeriodKey(data) {
  if (!data) return ''
  const [year, month] = String(data).split('-')
  return `${year || ''}-${month || ''}`
}

function formatarMesAno(value) {
  if (!value) return ''
  const [ano, mes] = String(value).split('-')
  if (!ano || !mes) return ''
  return `${mes}/${ano}`
}

function isOperational(lancamento) {
  if (!lancamento) return false
  if (lancamento.status === 'cancelado') return false
  const origem = String(lancamento.origem || '').toLowerCase()
  if (lancamento.tipo === 'receita') {
    return !['aporte', 'transferencia'].includes(origem)
  }
  if (lancamento.tipo === 'despesa') {
    return !['retirada', 'transferencia'].includes(origem)
  }
  return true
}

function filtrarLancamentosPeriodo(lancamentos, periodo, contaId) {
  const { ano, mes } = periodo || {}
  if (!ano && !mes) {
    return lancamentos.filter((item) => item.status !== 'cancelado' && (!contaId || item.contaFinanceiraId === contaId))
  }

  const selectedYear = String(ano || new Date().getFullYear())
  const selectedMonth = mes ? normalizarMes(mes) : ''
  return lancamentos.filter((item) => {
    if (item.status === 'cancelado') return false
    if (contaId && item.contaFinanceiraId !== contaId) return false
    const dataConsiderada = getDataConsiderada(item) || ''
    if (selectedMonth && dataConsiderada.slice(0, 7) !== `${selectedYear}-${selectedMonth}`) return false
    if (!selectedMonth && dataConsiderada.slice(0, 4) !== selectedYear) return false
    return true
  })
}

function calcularSerieMeses(ano, mes, meses = 6) {
  const result = []
  let currentYear = Number(ano || new Date().getFullYear())
  let currentMonth = Number(mes || new Date().getMonth() + 1)
  for (let i = meses - 1; i >= 0; i -= 1) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1)
    result.push({ key: `${date.getFullYear()}-${normalizarMes(date.getMonth() + 1)}`, label: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` })
  }
  return result
}

function getTipoConta(conta) {
  const normalized = String(conta?.tipo || '').toLowerCase()
  if (['conta corrente', 'conta_corrente', 'banco', 'conta'].includes(normalized)) return 'Conta Corrente'
  if (['investimento'].includes(normalized)) return 'Conta Investimento'
  if (['caixa'].includes(normalized)) return 'Caixa'
  if (['carteira', 'caucao'].includes(normalized)) return 'Porquinho'
  return 'Outras contas'
}

function agruparPorTipo(contas) {
  return contas.reduce((acc, conta) => {
    const key = getTipoConta(conta)
    acc[key] = acc[key] || []
    acc[key].push(conta)
    return acc
  }, {})
}

export function getDashboardData(periodo = {}, contaId = '') {
  const lancamentos = listarLancamentos()
  const contas = listarContas().filter((conta) => conta.ativa)
  const movimentos = listarMovimentos()
  const contratos = listarContratos()
  const unidades = listarUnidades()
  const patrimonios = listarPatrimonios()
  const locatarios = listarLocatarios()

  const periodoAtual = {
    ano: Number(periodo?.ano || new Date().getFullYear()),
    mes: Number(periodo?.mes || new Date().getMonth() + 1),
  }

  const periodoInicio = `${periodoAtual.ano}-${normalizarMes(periodoAtual.mes)}-01`
  const periodoFim = new Date(Number(periodoAtual.ano), Number(periodoAtual.mes), 0).toISOString().slice(0, 10)
  const lancamentosPeriodo = filtrarLancamentosPeriodo(lancamentos, periodoAtual, contaId)
  const receitasPeriodo = lancamentosPeriodo.filter((item) => item.tipo === 'receita' && item.status !== 'cancelado' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const despesasPeriodo = lancamentosPeriodo.filter((item) => item.tipo === 'despesa' && item.status !== 'cancelado' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const resultadoPeriodo = receitasPeriodo - despesasPeriodo

  const contasFiltradas = contaId ? contas.filter((conta) => conta.id === contaId) : contas
  const totalFinanceiro = contasFiltradas.reduce((sum, conta) => sum + Number(calcularSaldo(conta.id) || 0), 0)
  const disponibilidadeImediata = contasFiltradas.filter((conta) => {
    const tipo = String(conta.tipo || '').toLowerCase()
    return ['banco', 'caixa', 'carteira', 'conta_corrente', 'conta corrente', 'conta de pagamento', 'conta_pagamento', 'pagamento', 'reserva', 'porquinho'].includes(tipo)
  }).reduce((sum, conta) => sum + Number(calcularSaldo(conta.id) || 0), 0)
  const totalInvestido = contasFiltradas.filter((conta) => {
    const tipo = String(conta.tipo || '').toLowerCase()
    return ['investimento'].includes(tipo)
  }).reduce((sum, conta) => sum + Number(calcularSaldo(conta.id) || 0), 0)

  const contasPorTipo = agruparPorTipo(contasFiltradas)
  const graficoContas = Object.entries(contasPorTipo).map(([label, contasTipo]) => {
    const saldo = contasTipo.reduce((sum, conta) => sum + Number(calcularSaldo(conta.id) || 0), 0)
    return {
      label,
      saldo,
      percentual: totalFinanceiro ? Math.round((saldo / totalFinanceiro) * 10000) / 100 : 0,
    }
  }).sort((a, b) => b.saldo - a.saldo)

  const mesAnterior = (() => {
    const current = new Date(Number(periodoAtual.ano), Number(periodoAtual.mes) - 1, 1)
    current.setMonth(current.getMonth() - 1)
    return {
      ano: current.getFullYear(),
      mes: current.getMonth() + 1,
    }
  })()

  const lancamentosMesAnterior = filtrarLancamentosPeriodo(lancamentos, mesAnterior, contaId)
  const receitasMesAnterior = lancamentosMesAnterior.filter((item) => item.tipo === 'receita' && item.status !== 'cancelado' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const despesasMesAnterior = lancamentosMesAnterior.filter((item) => item.tipo === 'despesa' && item.status !== 'cancelado' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const resultadoMesAnterior = receitasMesAnterior - despesasMesAnterior

  const comparacao = {
    receitas: calcularVariacaoPercentual(receitasPeriodo, receitasMesAnterior),
    despesas: calcularVariacaoPercentual(despesasPeriodo, despesasMesAnterior),
    resultado: calcularVariacaoPercentual(resultadoPeriodo, resultadoMesAnterior),
  }

  const unidadesTotal = unidades.length
  const unidadesOcupadas = unidades.filter((item) => contratoAtivoPorUnidade(item.id)).length
  const unidadesDesocupadas = unidadesTotal - unidadesOcupadas
  const percentualOcupacao = unidadesTotal > 0 ? (unidadesOcupadas / unidadesTotal) * 100 : 0

  const lancamentosVencidos = lancamentosPeriodo.filter((item) => item.status !== 'cancelado' && item.status !== 'pago' && item.dataVencimento && item.dataVencimento < new Date().toISOString().slice(0, 10))
  const inadimplenciaValor = lancamentosVencidos.reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const inadimplenciaQuantidade = lancamentosVencidos.length
  const locatariosInadimplentes = locatarios.filter((locatario) => {
    const contratosAtivos = contratos.filter((contrato) => contrato.locatarioId === locatario.id && contrato.situacao === 'Ativo')
    return contratosAtivos.some((contrato) => {
      const unidade = unidades.find((item) => item.id === contrato.unidadeId)
      return unidade && lancamentosVencidos.some((lanc) => lanc.unidadeId === unidade.id)
    })
  }).length

  const vencimentos = lancamentosPeriodo.filter((item) => item.status !== 'cancelado' && item.status !== 'pago' && item.dataVencimento).sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || '')).slice(0, 10)
  const proximosReceber = vencimentos.filter((item) => item.tipo === 'receita').slice(0, 5)
  const proximosPagar = vencimentos.filter((item) => item.tipo === 'despesa').slice(0, 5)

  const reajustesPendentes = listarReajustesPendentes()
  const contratosVencendoPrazo = listarContratosVencendoPrazo()
  const documentosVencendo = listarDocumentosVencendoPrazo()
  const contratosAtivos = contratos.filter((contrato) => contrato.situacao === 'Ativo').length
  const contratosVencendo30 = contratosVencendoPrazo.filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 30).length
  const contratosVencidos = contratosVencendoPrazo.filter((item) => item.diasRestantes < 0).length
  const unidadesSemContrato = unidades.filter((item) => !contratoAtivoPorUnidade(item.id)).length

  const movimentacoesRecentes = movimentos
    .slice()
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .slice(0, 10)
    .map((mov) => ({
      ...mov,
      tipoMovimento: mov.tipo || mov.natureza || 'movimentação',
      conta: contas.find((conta) => conta.id === mov.contaFinanceiraId),
      unidade: unidades.find((unidade) => unidade.id === mov.referenciaId),
    }))

  const serieFinanceira = calcularSerieMeses(periodoAtual.ano, periodoAtual.mes).map((item) => {
    const mesLancamentos = lancamentos.filter((lanc) => (getDataConsiderada(lanc) || '').slice(0, 7) === item.key)
    return {
      ...item,
      receitas: mesLancamentos.filter((lanc) => lanc.tipo === 'receita' && lanc.status !== 'cancelado' && isOperational(lanc)).reduce((sum, lanc) => sum + Number(lanc.valor || 0), 0),
      despesas: mesLancamentos.filter((lanc) => lanc.tipo === 'despesa' && lanc.status !== 'cancelado' && isOperational(lanc)).reduce((sum, lanc) => sum + Number(lanc.valor || 0), 0),
      resultado: 0,
    }
  })
  serieFinanceira.forEach((item) => {
    item.resultado = item.receitas - item.despesas
  })

  const serieFinanceira12Meses = calcularSerieMeses(periodoAtual.ano, periodoAtual.mes, 12).map((item) => {
    const mesLancamentos = lancamentos.filter((lanc) => (getDataConsiderada(lanc) || '').slice(0, 7) === item.key)
    return {
      ...item,
      receitas: mesLancamentos.filter((lanc) => lanc.tipo === 'receita' && lanc.status !== 'cancelado' && isOperational(lanc)).reduce((sum, lanc) => sum + Number(lanc.valor || 0), 0),
      despesas: mesLancamentos.filter((lanc) => lanc.tipo === 'despesa' && lanc.status !== 'cancelado' && isOperational(lanc)).reduce((sum, lanc) => sum + Number(lanc.valor || 0), 0),
      resultado: 0,
    }
  })
  serieFinanceira12Meses.forEach((item) => {
    item.resultado = item.receitas - item.despesas
  })

  const receitas12Meses = serieFinanceira12Meses.reduce((sum, mes) => sum + Number(mes.receitas || 0), 0)
  const despesas12Meses = serieFinanceira12Meses.reduce((sum, mes) => sum + Number(mes.despesas || 0), 0)
  const resultado12Meses = receitas12Meses - despesas12Meses
  const mediaMensalReceitas = receitas12Meses / 12
  const mediaMensalDespesas = despesas12Meses / 12
  const inadimplenciaPercentual = totalFinanceiro ? Math.round((inadimplenciaValor / totalFinanceiro) * 10000) / 100 : 0

  return {
    periodo: periodoAtual,
    periodoInicio,
    periodoFim,
    periodoLabel: `${formatarMesAno(`${periodoAtual.ano}-${normalizarMes(periodoAtual.mes)}`)}`,
    indicadores: {
      receitas: receitasPeriodo,
      despesas: despesasPeriodo,
      resultado: resultadoPeriodo,
      saldoDisponivel: disponibilidadeImediata,
      totalFinanceiro,
      investimentos: totalInvestido,
    },
    comparacao,
    indicadoresGerenciais: {
      receitas12Meses,
      despesas12Meses,
      resultado12Meses,
      mediaMensalReceitas,
      mediaMensalDespesas,
      inadimplenciaPercentual,
      ocupacaoPercentual: percentualOcupacao,
      contratosAtivos,
    },
    alertas: {
      contratosVencendo30,
      contratosVencidos,
      unidadesSemContrato,
      inadimplenciaQuantidade,
      inadimplenciaValor,
      reajustesPendentes: reajustesPendentes.length,
      documentosVencendo: documentosVencendo.length,
    },
    acoesPrioritarias: [
      {
        label: 'Revisar contratos vencidos',
        description: `${contratosVencidos} contratos vencidos`,
        to: '/contratos',
      },
      {
        label: 'Cobrar inadimplentes',
        description: `${inadimplenciaQuantidade} lançamentos atrasados`,
        to: '/financeiro/lancamentos?status=atrasado',
      },
      {
        label: 'Regularizar unidades sem contrato',
        description: `${unidadesSemContrato} unidades`,
        to: '/unidades',
      },
      {
        label: 'Conferir saldos de contas',
        description: 'Revisar total financeiro da holding',
        to: '/financeiro/contas',
      },
    ],
    ondeEstaMeuDinheiro: {
      totalFinanceiro,
      disponibilidadeImediata,
      totalInvestido,
      porTipo: graficoContas,
      contas: contasFiltradas.map((conta) => ({
        ...conta,
        saldoAtual: calcularSaldo(conta.id),
        tipoLabel: getTipoConta(conta),
      })),
    },
    graficoContas,
    ocupacao: {
      totalUnidades: unidadesTotal,
      ocupadas: unidadesOcupadas,
      desocupadas: unidadesDesocupadas,
      percentual: percentualOcupacao,
    },
    inadimplencia: {
      quantidadeLancamentos: inadimplenciaQuantidade,
      valorTotal: inadimplenciaValor,
      locatariosInadimplentes,
      lancamentos: lancamentosVencidos,
    },
    proximosVencimentos: {
      receber: proximosReceber,
      pagar: proximosPagar,
    },
    contratos: {
      ativos: contratosAtivos,
      vencendo30: contratosVencendo30,
      vencidos: contratosVencidos,
      semContrato: unidadesSemContrato,
      reajustesPendentes: reajustesPendentes.length,
      documentosVencendo: documentosVencendo.length,
    },
    movimentacoesRecentes,
    graficoFinanceiro: serieFinanceira,
    graficoFinanceiro12Meses: serieFinanceira12Meses,
  }
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function calcularVariacaoPercentual(valorAtual, valorAnterior) {
  const anterior = Number(valorAnterior || 0)
  if (anterior === 0) {
    if (Number(valorAtual || 0) === 0) return 0
    return 100
  }
  return ((Number(valorAtual || 0) - anterior) / anterior) * 100
}

export function formatarValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarVariacao(valor) {
  const number = Number(valor || 0)
  if (!Number.isFinite(number)) return 'Sem dados suficientes para comparação.'
  if (number === 0) return '0%'
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`
}
