import { STATUS_FINANCEIRO } from '../constants/financeiroConstants.js'

export function formatarMoeda(valor) {
  const numero = Number(valor)
  if (Number.isNaN(numero)) return 'R$ 0,00'
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function getStatusEfetivo(lancamento) {
  if (!lancamento) return ''
  if (lancamento.status === 'cancelado') return 'cancelado'
  if (lancamento.status === 'pago') return 'pago'
  // 'parcial' (baixa parcial registrada) entra na mesma checagem de atraso
  // que 'pendente' — corrigido em 06/08/2026: antes um lançamento pago pela
  // metade e vencido não caía em nenhuma das duas condições abaixo e ficava
  // invisível nos relatórios de inadimplência/pendências.
  if ((lancamento.status === 'pendente' || lancamento.status === 'parcial') && lancamento.dataVencimento) {
    const hoje = new Date().toISOString().slice(0, 10)
    if (lancamento.dataVencimento < hoje) {
      return 'atrasado'
    }
  }
  return lancamento.status
}

export function calcularTotalReceitas(lancamentos) {
  return lancamentos
    .filter((item) => item.tipo === 'receita' && item.status !== 'cancelado')
    .reduce((total, item) => total + Number(item.valor || 0), 0)
}

export function calcularTotalDespesas(lancamentos) {
  return lancamentos
    .filter((item) => item.tipo === 'despesa' && item.status !== 'cancelado')
    .reduce((total, item) => total + Number(item.valor || 0), 0)
}

export function calcularResultado(lancamentos) {
  return calcularTotalReceitas(lancamentos) - calcularTotalDespesas(lancamentos)
}

export function calcularPendencias(lancamentos) {
  // Inclui 'parcial' (achado crítico de 06/08/2026: lançamentos com baixa
  // parcial ficavam de fora da soma de pendências). Usa o valor nominal do
  // lançamento, não o saldo realmente restante após a baixa parcial — para
  // o valor exato ainda pendente por lançamento, ver
  // baixaService.calcularSaldoPendente.
  return lancamentos
    .filter((item) => (item.status === 'pendente' || item.status === 'parcial') && item.status !== 'cancelado')
    .reduce((total, item) => total + Number(item.valor || 0), 0)
}

export function calcularAtrasados(lancamentos) {
  return lancamentos
    .filter((item) => getStatusEfetivo(item) === 'atrasado')
    .reduce((total, item) => total + Number(item.valor || 0), 0)
}

function normalizarCompetencia(dataCompetencia) {
  if (!dataCompetencia) return ''
  if (/^\d{4}-\d{2}$/.test(dataCompetencia)) {
    return `${dataCompetencia}-01`
  }
  return dataCompetencia
}

function normalizarDataParaFiltro(valor) {
  if (!valor) return ''
  if (typeof valor !== 'string') return ''

  const trimmed = valor.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dia, mes, ano] = trimmed.split('/')
    return `${ano}-${mes}-${dia}`
  }

  const data = new Date(trimmed)
  if (!Number.isNaN(data.getTime())) {
    return data.toISOString().slice(0, 10)
  }

  return ''
}

export function getDataConsiderada(item) {
  if (!item) return ''
  if (item.status === 'pago' && item.dataPagamento) {
    return normalizarDataParaFiltro(item.dataPagamento)
  }
  const dataVencimento = normalizarDataParaFiltro(item.dataVencimento)
  if (dataVencimento) {
    return dataVencimento
  }
  return normalizarDataParaFiltro(item.dataCompetencia)
}

export function filtrarLancamentos(lancamentos, filtros) {
  return lancamentos.filter((item) => {
    if (!item || item.status === 'cancelado') return false
    const {
      periodoInicio,
      periodoFim,
      tipo,
      status,
      categoria,
      subcategoria,
      patrimonioId,
      unidadeId,
      contaFinanceiraId,
      termo,
    } = filtros || {}

    const efetivo = getStatusEfetivo(item)
    const dataReferencia = getDataConsiderada(item)
    const inicio = normalizarDataParaFiltro(periodoInicio)
    const fim = normalizarDataParaFiltro(periodoFim)

    if (inicio && dataReferencia && dataReferencia < inicio) return false
    if (fim && dataReferencia && dataReferencia > fim) return false
    if (tipo && item.tipo !== tipo) return false
    if (status && efetivo !== status) return false
    if (categoria && item.categoria !== categoria) return false
    if (subcategoria && item.subcategoria !== subcategoria) return false
    if (contaFinanceiraId && item.contaFinanceiraId !== contaFinanceiraId) return false
    if (patrimonioId && item.patrimonioId !== patrimonioId) return false
    if (unidadeId && item.unidadeId !== unidadeId) return false
    if (termo) {
      const texto = termo.trim().toLowerCase()
      const campos = [item.descricao, item.categoria, item.subcategoria, item.observacoes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!campos.includes(texto)) return false
    }

    return true
  })
}

export function ordenarLancamentos(lancamentos) {
  return [...lancamentos].sort((a, b) => {
    const dataA = getDataConsiderada(a) || ''
    const dataB = getDataConsiderada(b) || ''
    if (dataA !== dataB) return dataB.localeCompare(dataA)
    const competenciaA = a.dataCompetencia || ''
    const competenciaB = b.dataCompetencia || ''
    if (competenciaA !== competenciaB) return competenciaB.localeCompare(competenciaA)
    const vencA = a.dataVencimento || ''
    const vencB = b.dataVencimento || ''
    if (vencA !== vencB) return vencA.localeCompare(vencB)
    return (b.criadoEm || '').localeCompare(a.criadoEm || '')
  })
}

export function agruparPorPatrimonio(lancamentos, unidades) {
  const porUnidade = lancamentos.filter((item) => item.unidadeId)
  const porPatrimonio = lancamentos.filter((item) => !item.unidadeId)

  const mapa = {}

  porPatrimonio.forEach((item) => {
    const chave = item.patrimonioId || 'sem-patrimonio'
    mapa[chave] = mapa[chave] || []
    mapa[chave].push(item)
  })

  porUnidade.forEach((item) => {
    const unidade = unidades.find((u) => u.id === item.unidadeId)
    const chave = unidade?.patrimonioId || 'sem-patrimonio'
    mapa[chave] = mapa[chave] || []
    mapa[chave].push(item)
  })

  return mapa
}
