import { criarLancamento, listarLancamentos } from './financeiroService.js'
import { listarContas, calcularSaldo, calcularSaldoGeralContas } from './contaService.js'
import { listarContratos } from '../../contratos/services/contratoService.js'
import { listarLocatarios } from '../../locatarios/services/locatarioService.js'

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function toCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildDescricaoFallback(parsed) {
  if (parsed.descricao && parsed.descricao.trim()) return parsed.descricao.trim()
  if (parsed.categoria) return `${parsed.natureza === 'receita' ? 'Receita' : 'Despesa'} ${parsed.categoria}`
  return parsed.natureza === 'receita' ? 'Receita registrada pela Entrada Universal' : 'Despesa registrada pela Entrada Universal'
}

const recentExecutionMap = new Map()

function buildIdempotencyKey(parsed) {
  return JSON.stringify({
    natureza: parsed.natureza,
    valor: Number(parsed.valor || 0),
    categoria: parsed.categoria || '',
    subcategoria: parsed.subcategoria || '',
    patrimonioId: parsed.patrimonioId || '',
    unidadeId: parsed.unidadeId || '',
    contaId: parsed.contaId || '',
    dateIso: parsed.dateIso || '',
    descricao: parsed.descricao || '',
  })
}

function shouldBlockDuplicate(parsed, nowDate) {
  const key = buildIdempotencyKey(parsed)
  const nowTs = Number(nowDate.getTime())
  const previousTs = recentExecutionMap.get(key)
  if (previousTs && nowTs - previousTs < 5000) {
    return true
  }
  recentExecutionMap.set(key, nowTs)
  return false
}

function findContaByText(contas, text) {
  const normalized = normalize(text)
  if (!normalized) return null

  const exact = contas.find((item) => normalized.includes(normalize(item.nome)))
  if (exact) return exact

  if (normalized.includes('conta corrente')) {
    return contas.find((item) => normalize(item.nome).includes('conta corrente')) || null
  }

  return null
}

function resolveInadimplentes({ lancamentos, contratos, locatarios }) {
  const hoje = formatDate(new Date())
  const atrasados = lancamentos.filter((item) => {
    if (item.tipo !== 'receita') return false
    if (item.status === 'cancelado' || item.status === 'pago') return false
    if (!item.dataVencimento) return false
    return item.dataVencimento < hoje
  })

  const valorTotal = atrasados.reduce((sum, item) => sum + Number(item.valor || 0), 0)
  const locatariosMap = new Map()

  for (const lanc of atrasados) {
    const contrato = contratos.find((item) => item.unidadeId && lanc.unidadeId && item.unidadeId === lanc.unidadeId)
    if (!contrato?.locatarioId) continue
    const loc = locatarios.find((item) => item.id === contrato.locatarioId)
    if (!loc) continue
    if (!locatariosMap.has(loc.id)) {
      locatariosMap.set(loc.id, {
        id: loc.id,
        nome: loc.nomeCompleto,
        valor: 0,
        quantidade: 0,
      })
    }
    const agg = locatariosMap.get(loc.id)
    agg.valor += Number(lanc.valor || 0)
    agg.quantidade += 1
  }

  return {
    atrasados,
    valorTotal,
    locatarios: Array.from(locatariosMap.values()).sort((a, b) => b.valor - a.valor),
  }
}

export function createUniversalEntryRuntime(deps = {}) {
  const runtime = {
    criarLancamento: deps.criarLancamento || criarLancamento,
    listarLancamentos: deps.listarLancamentos || listarLancamentos,
    listarContas: deps.listarContas || listarContas,
    calcularSaldo: deps.calcularSaldo || calcularSaldo,
    calcularSaldoGeralContas: deps.calcularSaldoGeralContas || calcularSaldoGeralContas,
    listarContratos: deps.listarContratos || listarContratos,
    listarLocatarios: deps.listarLocatarios || listarLocatarios,
    now: deps.now || (() => new Date()),
  }

  function executarLancamento(parsed) {
    const now = runtime.now()
    if (shouldBlockDuplicate(parsed, now)) {
      return { duplicate: true }
    }

    const hojeIso = formatDate(now)
    const dataRef = parsed.dateIso || hojeIso
    const competencia = parsed.dataCompetencia || dataRef.slice(0, 7)

    const payload = {
      tipo: parsed.natureza,
      categoria: parsed.categoria,
      subcategoria: parsed.subcategoria || null,
      subcategoriaId: parsed.subcategoriaId || null,
      subcategoriaLabel: parsed.subcategoriaLabel || parsed.subcategoria || null,
      descricao: buildDescricaoFallback(parsed),
      valor: Number(parsed.valor || 0),
      dataCompetencia: competencia,
      dataVencimento: dataRef,
      dataPagamento: parsed.status === 'pago' ? dataRef : null,
      status: parsed.status || 'pendente',
      patrimonioId: parsed.patrimonioId || null,
      unidadeId: parsed.unidadeId || null,
      patrimonioLabel: parsed.patrimonioLabel || null,
      unidadeLabel: parsed.unidadeLabel || null,
      contratoId: parsed.contratoId || null,
      locatarioId: parsed.locatarioId || null,
      contaFinanceiraId: parsed.contaId || null,
      observacoes: parsed.observacoes || '',
      origem: 'manual',
    }

    return runtime.criarLancamento(payload)
  }

  function consultar(parsed) {
    const contas = runtime.listarContas() || []
    const lancamentos = runtime.listarLancamentos() || []
    const contratos = runtime.listarContratos() || []
    const locatarios = runtime.listarLocatarios() || []

    if (parsed.queryType === 'saldo_geral') {
      const saldo = Number(runtime.calcularSaldoGeralContas() || 0)
      return {
        kind: 'saldo_geral',
        title: 'Saldo geral',
        lines: [`Saldo consolidado atual: ${toCurrency(saldo)}.`],
      }
    }

    if (parsed.queryType === 'saldo_conta') {
      const conta = parsed.contaId
        ? contas.find((item) => item.id === parsed.contaId)
        : findContaByText(contas, parsed.originalText)

      if (!conta) {
        return {
          kind: 'saldo_conta',
          title: 'Saldo por conta',
          lines: ['Não identifiquei a conta informada.'],
        }
      }

      const saldoConta = Number(runtime.calcularSaldo(conta.id) || 0)
      return {
        kind: 'saldo_conta',
        title: 'Saldo por conta',
        lines: [`${conta.nome}: ${toCurrency(saldoConta)}.`],
      }
    }

    if (parsed.queryType === 'inadimplencia') {
      const inad = resolveInadimplentes({ lancamentos, contratos, locatarios })
      if (inad.atrasados.length === 0) {
        return {
          kind: 'inadimplencia',
          title: 'Inadimplência',
          lines: ['Não há inadimplência registrada no momento.'],
        }
      }

      const lines = [
        `Total em atraso: ${toCurrency(inad.valorTotal)} (${inad.atrasados.length} lançamento(s)).`,
      ]

      inad.locatarios.slice(0, 5).forEach((item) => {
        lines.push(`${item.nome}: ${toCurrency(item.valor)} (${item.quantidade} lançamento(s)).`)
      })

      return {
        kind: 'inadimplencia',
        title: 'Inadimplência',
        lines,
      }
    }

    if (parsed.queryType === 'vencimentos_semana') {
      const inicio = runtime.now()
      inicio.setHours(0, 0, 0, 0)
      const fim = addDays(inicio, 7)
      const inicioIso = formatDate(inicio)
      const fimIso = formatDate(fim)

      const vencimentos = lancamentos
        .filter((item) => item.status !== 'cancelado' && item.status !== 'pago' && item.dataVencimento)
        .filter((item) => item.dataVencimento >= inicioIso && item.dataVencimento <= fimIso)
        .sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || ''))

      if (vencimentos.length === 0) {
        return {
          kind: 'vencimentos_semana',
          title: 'Contas vencendo esta semana',
          lines: ['Não há contas vencendo nesta semana.'],
        }
      }

      const lines = vencimentos.slice(0, 8).map((item) => {
        const tipo = item.tipo === 'receita' ? 'Receita' : 'Despesa'
        return `${item.dataVencimento} - ${tipo} - ${item.descricao || 'Sem descrição'} - ${toCurrency(item.valor)}.`
      })

      return {
        kind: 'vencimentos_semana',
        title: 'Contas vencendo esta semana',
        lines,
      }
    }

    return {
      kind: 'indefinida',
      title: 'Consulta',
      lines: ['Consulta não suportada nesta sprint.'],
    }
  }

  return {
    executarLancamento,
    consultar,
  }
}

const defaultRuntime = createUniversalEntryRuntime()

export function executarLancamentoUniversal(parsed) {
  return defaultRuntime.executarLancamento(parsed)
}

export function consultarEntradaUniversal(parsed) {
  return defaultRuntime.consultar(parsed)
}
