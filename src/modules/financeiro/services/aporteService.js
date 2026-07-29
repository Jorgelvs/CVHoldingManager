import { STORAGE_KEY_APORTES } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { registrarMovimento } from './livroCaixaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'

function carregarAportes() {
  const parsed = localGet(STORAGE_KEY_APORTES, [])
  return Array.isArray(parsed) ? parsed : []
}

function salvarAportes(items) {
  localSet(STORAGE_KEY_APORTES, items)
}

export function listarAportes() { return carregarAportes() }
export function buscarAportePorId(id) { return listarAportes().find((a) => a.id === id) || null }

export function criarAporte({ data, valor, tipo = 'temporario', contaFinanceiraId, observacao = '' }) {
  const aporte = {
    id: gerarId(),
    data: data || new Date().toISOString().slice(0,10),
    valorOriginal: Number(valor) || 0,
    valorDevolvido: 0,
    saldoEmAberto: Number(valor) || 0,
    tipo: tipo === 'definitivo' ? 'definitivo' : 'temporario',
    situacao: tipo === 'definitivo' ? 'devolvido' : 'aberto',
    contaFinanceiraId: contaFinanceiraId || null,
    historico: [],
    criadoEm: new Date().toISOString(),
  }

  // register movement in livro caixa: entrada
  registrarMovimento({ documentoFinanceiroId: aporte.id, contaFinanceiraId, data: aporte.data, tipo: 'aporte', origem: tipo === 'definitivo' ? 'aporte_definitivo' : 'aporte_temporario', descricao: `Aporte ${tipo}`, valor: aporte.valorOriginal, natureza: 'entrada' })

  const all = listarAportes()
  all.push(aporte)
  salvarAportes(all)
  return aporte
}

export function devolverAporte(aporteId, valor, contaFinanceiraId, observacao = '') {
  const aporte = buscarAportePorId(aporteId)
  if (!aporte) return { error: 'Aporte não encontrado.' }
  const saldo = Number(aporte.saldoEmAberto || 0)
  const valorNum = Number(valor || 0)
  if (valorNum <= 0) return { error: 'Valor inválido.' }
  if (valorNum > saldo) return { error: 'Valor de devolução superior ao saldo do aporte.' }

  // registrar movimento de saída (devolução)
  registrarMovimento({ documentoFinanceiroId: aporteId, contaFinanceiraId, data: new Date().toISOString().slice(0,10), tipo: 'devolucao_aporte', origem: 'devolucao_aporte', descricao: `Devolução aporte ${aporteId}`, valor: valorNum, natureza: 'saida' })

  aporte.valorDevolvido = Number(aporte.valorDevolvido || 0) + valorNum
  aporte.saldoEmAberto = Number(aporte.saldoEmAberto || 0) - valorNum
  aporte.historico = aporte.historico || []
  aporte.historico.push({ tipo: 'devolucao', valor: valorNum, data: new Date().toISOString(), observacao })
  if (aporte.saldoEmAberto <= 0) aporte.situacao = 'devolvido'
  salvarAportes(listarAportes().map(a => a.id === aporte.id ? aporte : a))
  return aporte
}

export function converterAporte(aporteId, valor, contaFinanceiraId, observacao = '') {
  const aporte = buscarAportePorId(aporteId)
  if (!aporte) return { error: 'Aporte não encontrado.' }
  if (aporte.tipo !== 'temporario') return { error: 'Aporte não é temporário.' }
  const valorNum = Number(valor || 0)
  if (valorNum <= 0) return { error: 'Valor inválido.' }
  if (valorNum > aporte.saldoEmAberto) return { error: 'Valor de conversão superior ao saldo.' }

  // registrar movimento de conversão (entrada definitiva) - as aporte temporario não é receita; conversion may be just a reclassification
  registrarMovimento({ documentoFinanceiroId: aporteId, contaFinanceiraId, data: new Date().toISOString().slice(0,10), tipo: 'conversao_aporte', origem: 'aporte_definitivo', descricao: `Conversão aporte ${aporteId}`, valor: valorNum, natureza: 'entrada' })

  aporte.saldoEmAberto = Number(aporte.saldoEmAberto || 0) - valorNum
  aporte.historico = aporte.historico || []
  aporte.historico.push({ tipo: 'conversao', valor: valorNum, data: new Date().toISOString(), observacao })
  if (aporte.saldoEmAberto <= 0) aporte.situacao = 'convertido'
  salvarAportes(listarAportes().map(a => a.id === aporte.id ? aporte : a))
  return aporte
}
