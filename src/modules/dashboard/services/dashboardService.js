import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { getDataConsiderada } from '../../financeiro/utils/financeiroUtils.js'
import { calcularResumoComissoesPorImobiliaria } from '../../financeiro/services/comissaoService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'

function normalizarMes(mes) {
  if (!mes) return ''
  return String(mes).length === 1 ? `0${mes}` : String(mes)
}

// Agrupa despesas por patrimônio e por unidade, somando mês vigente e
// acumulado do ano num único passe (13/09/2026 — pedido explícito de ver
// despesa "do patrimônio e por unidade, quando existir", lado a lado com
// mês/ano, sem gráfico ou percentual, só o valor). Unidades sem nenhuma
// despesa direta (a maioria: água/energia/faxina são lançadas no
// patrimônio, não na unidade) simplesmente não aparecem na lista de
// unidades — daí o "quando existir".
function agruparDespesasPorPatrimonioEUnidade(lancamentosMes, lancamentosAno, unidades, patrimonios) {
  const porPatrimonio = new Map()
  const porUnidade = new Map()

  const acumular = (lista, campo) => {
    lista.forEach((item) => {
      if (item.tipo !== 'despesa' || item.status === 'cancelado' || !isOperational(item)) return
      const valor = Number(item.valor || 0)
      const unidade = item.unidadeId ? unidades.find((u) => u.id === item.unidadeId) : null
      const patrimonioId = item.patrimonioId || unidade?.patrimonioId || ''

      if (patrimonioId) {
        const nome = patrimonios.find((p) => p.id === patrimonioId)?.nome || 'Sem patrimônio'
        const atual = porPatrimonio.get(patrimonioId) || { patrimonioId, nome, mes: 0, ano: 0 }
        atual[campo] += valor
        porPatrimonio.set(patrimonioId, atual)
      }

      if (unidade) {
        const patrimonioNome = patrimonios.find((p) => p.id === unidade.patrimonioId)?.nome || ''
        const atual = porUnidade.get(unidade.id) || { unidadeId: unidade.id, nome: unidade.nome, patrimonioNome, mes: 0, ano: 0 }
        atual[campo] += valor
        porUnidade.set(unidade.id, atual)
      }
    })
  }

  acumular(lancamentosMes, 'mes')
  acumular(lancamentosAno, 'ano')

  return {
    porPatrimonio: Array.from(porPatrimonio.values()).sort((a, b) => b.ano - a.ano),
    porUnidade: Array.from(porUnidade.values()).sort((a, b) => b.ano - a.ano),
  }
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

function filtrarLancamentosPeriodo(lancamentos, periodo) {
  const { ano, mes } = periodo || {}
  if (!ano && !mes) {
    return lancamentos.filter((item) => item.status !== 'cancelado')
  }

  const selectedYear = String(ano || new Date().getFullYear())
  const selectedMonth = mes ? normalizarMes(mes) : ''
  return lancamentos.filter((item) => {
    if (item.status === 'cancelado') return false
    const dataConsiderada = getDataConsiderada(item) || ''
    if (selectedMonth && dataConsiderada.slice(0, 7) !== `${selectedYear}-${selectedMonth}`) return false
    if (!selectedMonth && dataConsiderada.slice(0, 4) !== selectedYear) return false
    return true
  })
}

// Dados usados pelo Dashboard principal (/dashboard) e por Financeiro >
// Dashboard (/financeiro, que deixa escolher outro mês/ano). Enxugado em
// 13/09/2026 para calcular só o que essas duas telas realmente mostram
// (receita, despesa por patrimônio/unidade, comissão por imobiliária) —
// antes calculava dezenas de métricas (gráficos de 6/12 meses, % de
// ocupação, inadimplência, "onde está meu dinheiro", ações prioritárias
// etc.) que sobraram de uma versão anterior do Dashboard e não apareciam
// mais em lugar nenhum da tela.
export function getDashboardData(periodo = {}) {
  const lancamentos = listarLancamentos()
  const unidades = listarUnidades()
  const patrimonios = listarPatrimonios()

  const periodoAtual = {
    ano: Number(periodo?.ano || new Date().getFullYear()),
    mes: Number(periodo?.mes || new Date().getMonth() + 1),
  }

  const periodoInicio = `${periodoAtual.ano}-${normalizarMes(periodoAtual.mes)}-01`
  const periodoFim = new Date(Number(periodoAtual.ano), Number(periodoAtual.mes), 0).toISOString().slice(0, 10)
  const lancamentosPeriodo = filtrarLancamentosPeriodo(lancamentos, periodoAtual)
  const receitasPeriodo = lancamentosPeriodo.filter((item) => item.tipo === 'receita' && item.status !== 'cancelado' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const despesasPeriodo = lancamentosPeriodo.filter((item) => item.tipo === 'despesa' && item.status !== 'cancelado' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)

  // Acumulado do ano selecionado, de janeiro até o mês escolhido (inclusive).
  const inicioAnoSelecionado = `${periodoAtual.ano}-01-01`
  const lancamentosAnoAcumulado = lancamentos.filter((item) => {
    if (item.status === 'cancelado') return false
    const dataConsiderada = getDataConsiderada(item) || ''
    return Boolean(dataConsiderada) && dataConsiderada >= inicioAnoSelecionado && dataConsiderada <= periodoFim
  })
  const receitasAnoAcumulado = lancamentosAnoAcumulado.filter((item) => item.tipo === 'receita' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const despesasAnoAcumulado = lancamentosAnoAcumulado.filter((item) => item.tipo === 'despesa' && isOperational(item)).reduce((sum, item) => sum + Number(item.valor || 0), 0)

  const despesasDetalhe = agruparDespesasPorPatrimonioEUnidade(lancamentosPeriodo, lancamentosAnoAcumulado, unidades, patrimonios)

  // Comissão da imobiliária no período: calculada (nunca lançada automaticamente,
  // mesmo padrão do resto do app) só sobre receitas de Aluguel/Multa de contratos
  // com imobiliária vinculada.
  const comissoesPorImobiliaria = calcularResumoComissoesPorImobiliaria({ periodoInicio, periodoFim }).filter((item) => item.quantidadeLancamentos > 0)
  const totalComissaoPeriodo = comissoesPorImobiliaria.reduce((sum, item) => sum + Number(item.totalComissao || 0), 0)

  const comissoesPorImobiliariaAnoAcumulado = calcularResumoComissoesPorImobiliaria({ periodoInicio: inicioAnoSelecionado, periodoFim }).filter((item) => item.quantidadeLancamentos > 0)
  const totalComissaoAnoAcumulado = comissoesPorImobiliariaAnoAcumulado.reduce((sum, item) => sum + Number(item.totalComissao || 0), 0)

  return {
    periodoInicio,
    periodoFim,
    indicadores: {
      receitas: receitasPeriodo,
      receitasAnoAcumulado,
      despesas: despesasPeriodo,
      despesasAnoAcumulado,
    },
    comissoes: {
      porImobiliaria: comissoesPorImobiliaria,
      total: totalComissaoPeriodo,
      porImobiliariaAnoAcumulado: comissoesPorImobiliariaAnoAcumulado,
      totalAnoAcumulado: totalComissaoAnoAcumulado,
    },
    despesasDetalhe,
  }
}

export function formatarValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
