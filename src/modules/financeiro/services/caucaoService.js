import { STORAGE_KEY_CAUCOES } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { registrarMovimento } from './livroCaixaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'

function carregarCaucoes() {
  const parsed = localGet(STORAGE_KEY_CAUCOES, [])
  return Array.isArray(parsed) ? parsed : []
}

function salvarCaucoes(items) {
  localSet(STORAGE_KEY_CAUCOES, items)
}

export function listarCaucoes() { return carregarCaucoes() }
export function buscarCaucaoPorId(id) { return listarCaucoes().find(c => c.id === id) || null }

export function criarCaucao({ contratoId, valor, contaRecebimentoId, contaCustodiaId, observacao = '' }) {
  const caucao = {
    id: gerarId(),
    contratoId: contratoId || null,
    valorOriginal: Number(valor) || 0,
    valorRecebido: Number(valor) || 0,
    valorAplicado: 0,
    valorUtilizado: 0,
    valorDevolvido: 0,
    saldoDisponivel: Number(valor) || 0,
    contaRecebimentoId: contaRecebimentoId || null,
    contaCustodiaId: contaCustodiaId || null,
    status: 'recebida_aguardando_aplicacao',
    historico: [{ tipo: 'recebimento', valor: Number(valor) || 0, data: new Date().toISOString(), observacao }],
    criadoEm: new Date().toISOString(),
  }

  // Registra entrada no Livro Caixa (caucao recebida)
  registrarMovimento({ documentoFinanceiroId: caucao.id, contaFinanceiraId: caucao.contaRecebimentoId, data: new Date().toISOString().slice(0,10), tipo: 'caucao_recebida', origem: 'caucao_recebida', descricao: `Caução contrato ${contratoId}`, valor: caucao.valorRecebido, natureza: 'entrada' })

  const all = listarCaucoes()
  all.push(caucao)
  salvarCaucoes(all)
  return caucao
}

export function aplicarCaucao(caucaoId, contaCustodiaId) {
  const caucao = buscarCaucaoPorId(caucaoId)
  if (!caucao) return { error: 'Caução não encontrada.' }
  if (!contaCustodiaId) return { error: 'Conta de custódia obrigatória.' }
  if (caucao.status === 'aplicada') return { error: 'Caução já aplicada.' }

  // Transferência interna: saída da contaRecebimentoId e entrada na contaCustodiaId
  registrarMovimento({ documentoFinanceiroId: caucaoId, contaFinanceiraId: caucao.contaRecebimentoId, data: new Date().toISOString().slice(0,10), tipo: 'aplicacao_caucao_saida', origem: 'caucao_aplicada', descricao: `Aplicação caução ${caucaoId}`, valor: caucao.valorRecebido, natureza: 'saida', transferenciaId: caucaoId })
  registrarMovimento({ documentoFinanceiroId: caucaoId, contaFinanceiraId: contaCustodiaId, data: new Date().toISOString().slice(0,10), tipo: 'aplicacao_caucao_entrada', origem: 'caucao_aplicada', descricao: `Aplicação caução ${caucaoId}`, valor: caucao.valorRecebido, natureza: 'entrada', transferenciaId: caucaoId })

  caucao.contaCustodiaId = contaCustodiaId
  caucao.valorAplicado = caucao.valorRecebido
  caucao.saldoDisponivel = caucao.valorRecebido - caucao.valorUtilizado - caucao.valorDevolvido
  caucao.status = 'aplicada'
  caucao.historico = caucao.historico || []
  caucao.historico.push({ tipo: 'aplicacao', valor: caucao.valorRecebido, data: new Date().toISOString() })
  salvarCaucoes(listarCaucoes().map(c => c.id === caucao.id ? caucao : c))
  return caucao
}

export function utilizarCaucao(caucaoId, valor, observacao = '') {
  const caucao = buscarCaucaoPorId(caucaoId)
  if (!caucao) return { error: 'Caução não encontrada.' }
  const valorNum = Number(valor || 0)
  if (valorNum <= 0) return { error: 'Valor inválido.' }
  if (valorNum > caucao.saldoDisponivel) return { error: 'Valor superior ao saldo disponível.' }

  // registrar saída na conta de custódia
  registrarMovimento({ documentoFinanceiroId: caucaoId, contaFinanceiraId: caucao.contaCustodiaId, data: new Date().toISOString().slice(0,10), tipo: 'caucao_utilizada', origem: 'caucao_utilizada', descricao: `Utilização caução ${caucaoId}`, valor: valorNum, natureza: 'saida' })

  caucao.valorUtilizado = Number(caucao.valorUtilizado || 0) + valorNum
  caucao.saldoDisponivel = caucao.valorRecebido - caucao.valorUtilizado - caucao.valorDevolvido
  caucao.historico = caucao.historico || []
  caucao.historico.push({ tipo: 'utilizacao', valor: valorNum, data: new Date().toISOString(), observacao })
  caucao.status = caucao.saldoDisponivel <= 0 ? 'encerrada' : 'parcialmente_utilizada'
  salvarCaucoes(listarCaucoes().map(c => c.id === caucao.id ? caucao : c))
  return caucao
}

export function devolverCaucao(caucaoId, valor, contaDestinoId, observacao = '') {
  const caucao = buscarCaucaoPorId(caucaoId)
  if (!caucao) return { error: 'Caução não encontrada.' }
  const valorNum = Number(valor || 0)
  if (valorNum <= 0) return { error: 'Valor inválido.' }
  if (valorNum > caucao.saldoDisponivel) return { error: 'Valor superior ao saldo disponível.' }

  registrarMovimento({ documentoFinanceiroId: caucaoId, contaFinanceiraId: caucao.contaCustodiaId, data: new Date().toISOString().slice(0,10), tipo: 'caucao_devolvida_saida', origem: 'caucao_devolvida', descricao: `Devolução caução ${caucaoId}`, valor: valorNum, natureza: 'saida' })
  registrarMovimento({ documentoFinanceiroId: caucaoId, contaFinanceiraId: contaDestinoId, data: new Date().toISOString().slice(0,10), tipo: 'caucao_devolvida_entrada', origem: 'caucao_devolvida', descricao: `Devolução caução ${caucaoId}`, valor: valorNum, natureza: 'entrada' })

  caucao.valorDevolvido = Number(caucao.valorDevolvido || 0) + valorNum
  caucao.saldoDisponivel = caucao.valorRecebido - caucao.valorUtilizado - caucao.valorDevolvido
  caucao.historico = caucao.historico || []
  caucao.historico.push({ tipo: 'devolucao', valor: valorNum, data: new Date().toISOString(), observacao })
  caucao.status = caucao.saldoDisponivel <= 0 ? 'devolvida' : caucao.status
  salvarCaucoes(listarCaucoes().map(c => c.id === caucao.id ? caucao : c))
  return caucao
}
