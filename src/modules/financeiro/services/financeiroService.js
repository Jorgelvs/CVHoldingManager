import { STORAGE_KEY } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'

function garantirLancamento(item) {
  return {
    id: item.id || gerarId(),
    tipo: item.tipo || 'receita',
    categoria: item.categoria || '',
    subcategoria: item.subcategoria || null,
    descricao: item.descricao || '',
    valor: Number(item.valor ?? 0),
    dataCompetencia: item.dataCompetencia || '',
    dataVencimento: item.dataVencimento || null,
    dataPagamento: item.dataPagamento || null,
    status: item.status || 'pendente',
    patrimonioId: item.patrimonioId || null,
    unidadeId: item.unidadeId || null,
    contratoId: item.contratoId || null,
    locatarioId: item.locatarioId || null,
    origem: item.origem || 'manual',
    rateioId: item.rateioId || null,
    tipoMovimentoCondominio: item.tipoMovimentoCondominio || null,
    cobertaPeloCondominio: item.cobertaPeloCondominio ?? false,
    observacoes: item.observacoes || '',
    criadoEm: item.criadoEm || new Date().toISOString(),
    atualizadoEm: item.atualizadoEm || new Date().toISOString(),
  }
}

function carregarLancamentos() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Dados inválidos')
    return parsed.map(garantirLancamento)
  } catch {
    const empty = []
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty))
    return empty
  }
}

function salvarLancamentos(lancamentos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos))
}

export function listarLancamentos() {
  return carregarLancamentos()
}

export function buscarLancamentoPorId(id) {
  return listarLancamentos().find((item) => item.id === id) || null
}

export function criarLancamento(dados) {
  const lancamento = garantirLancamento({
    ...dados,
    id: gerarId(),
    valor: Number(dados.valor),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  })

  const lancamentos = listarLancamentos()
  lancamentos.push(lancamento)
  salvarLancamentos(lancamentos)
  return lancamento
}

export function atualizarLancamento(id, dados) {
  const lancamentos = listarLancamentos()
  const index = lancamentos.findIndex((item) => item.id === id)
  if (index === -1) return null

  lancamentos[index] = garantirLancamento({
    ...lancamentos[index],
    ...dados,
    valor: Number(dados.valor),
    atualizadoEm: new Date().toISOString(),
  })

  salvarLancamentos(lancamentos)
  return lancamentos[index]
}

export function cancelarLancamento(id) {
  const lancamentos = listarLancamentos()
  const index = lancamentos.findIndex((item) => item.id === id)
  if (index === -1) return null

  lancamentos[index] = {
    ...lancamentos[index],
    status: 'cancelado',
    atualizadoEm: new Date().toISOString(),
  }

  salvarLancamentos(lancamentos)
  return lancamentos[index]
}

export function excluirLancamento(id) {
  const lancamentos = listarLancamentos()
  const index = lancamentos.findIndex((item) => item.id === id)
  if (index === -1) return false
  lancamentos.splice(index, 1)
  salvarLancamentos(lancamentos)
  return true
}

export function listarPorPatrimonio(patrimonioId) {
  return listarLancamentos().filter((item) => item.patrimonioId === patrimonioId)
}

export function listarPorUnidade(unidadeId) {
  return listarLancamentos().filter((item) => item.unidadeId === unidadeId)
}

export function listarPorPeriodo(dataInicial, dataFinal) {
  return listarLancamentos().filter((item) => {
    if (!item.dataCompetencia) return false
    if (dataInicial && item.dataCompetencia < dataInicial) return false
    if (dataFinal && item.dataCompetencia > dataFinal) return false
    return true
  })
}
