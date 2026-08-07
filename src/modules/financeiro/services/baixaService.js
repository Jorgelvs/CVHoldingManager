import { STORAGE_KEY_BAIXAS } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { registrarMovimento, estornarMovimento } from './livroCaixaService.js'
import { buscarLancamentoPorId, atualizarLancamento } from './financeiroService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'

function carregarBaixas() {
  const parsed = localGet(STORAGE_KEY_BAIXAS, [])
  return Array.isArray(parsed) ? parsed : []
}

function salvarBaixas(items) {
  localSet(STORAGE_KEY_BAIXAS, items)
}

export function listarBaixas() {
  return carregarBaixas()
}

export function buscarBaixaPorId(id) {
  return listarBaixas().find((b) => b.id === id) || null
}

// Saldo ainda não baixado de um lançamento (valor nominal - soma de baixas
// ativas). Usado tanto aqui quanto por telas que precisam saber quanto
// falta receber/pagar antes de registrar uma nova baixa.
export function calcularSaldoPendente(lancamentoId) {
  const lanc = buscarLancamentoPorId(lancamentoId)
  if (!lanc) return 0
  const baixas = listarBaixas().filter((b) => b.lancamentoId === lancamentoId && !b.estornado)
  const totalBaixado = baixas.reduce((s, b) => s + Number(b.valorMovimentado || 0), 0)
  return Number(lanc.valor || 0) - totalBaixado
}

export function registrarBaixa({ lancamentoId, data, valorPrincipal = 0, juros = 0, desconto = 0, contaFinanceiraId, observacao = '' }) {
  const lanc = buscarLancamentoPorId(lancamentoId)
  if (!lanc) return { error: 'Lançamento não encontrado.' }

  const valorMovimentado = Number(valorPrincipal) + Number(juros) - Number(desconto)
  if (valorMovimentado <= 0) return { error: 'Valor movimentado deve ser maior que zero.' }

  // compute saldo pendente existing
  const baixas = listarBaixas().filter((b) => b.lancamentoId === lancamentoId && !b.estornado)
  const totalBaixado = baixas.reduce((s, b) => s + Number(b.valorMovimentado || 0), 0)
  const pendente = Number(lanc.valor || 0) - totalBaixado
  if (valorMovimentado > pendente) return { error: 'Valor de baixa superior ao saldo pendente.' }

  const natureza = lanc.tipo === 'receita' ? 'entrada' : 'saida'
  const mov = registrarMovimento({ documentoFinanceiroId: lancamentoId, contaFinanceiraId, data, tipo: natureza === 'entrada' ? 'recebimento' : 'pagamento', origem: 'recebimento', descricao: `${lanc.descricao} - baixa`, valor: valorMovimentado, natureza })

  const baixa = {
    id: gerarId(),
    lancamentoId,
    data: data || new Date().toISOString().slice(0, 10),
    valorPrincipal: Number(valorPrincipal) || 0,
    juros: Number(juros) || 0,
    desconto: Number(desconto) || 0,
    valorMovimentado: Number(valorMovimentado) || 0,
    contaFinanceiraId: contaFinanceiraId || null,
    observacao: observacao || '',
    movimentoId: mov.id,
    estornado: false,
    criadoEm: new Date().toISOString(),
  }

  const all = listarBaixas()
  all.push(baixa)
  salvarBaixas(all)

  // update lancamento status
  // skipCaixaSync: o movimento de caixa desta baixa já foi registrado acima
  // (com o valor efetivamente recebido); sem essa flag, atualizarLancamento
  // rodava o auto-sync do valor NOMINAL do lançamento por cima, duplicando
  // o dinheiro no livro-caixa.
  const novoTotalBaixado = totalBaixado + valorMovimentado
  const atualizado = { ...lanc }
  if (novoTotalBaixado <= 0) atualizado.status = 'pendente'
  else if (novoTotalBaixado < Number(lanc.valor || 0)) atualizado.status = 'parcial'
  else atualizado.status = 'pago'
  atualizarLancamento(lancamentoId, atualizado, { skipCaixaSync: true })

  return baixa
}

export function estornarBaixa(id, motivo = '') {
  const baixa = buscarBaixaPorId(id)
  if (!baixa) return { error: 'Baixa não encontrada.' }
  if (baixa.estornado) return { error: 'Baixa já estornada.' }

  // estornar movimento
  const est = estornarMovimento(baixa.movimentoId, motivo)
  if (est?.error) {
    return { error: `Falha ao estornar movimento de caixa: ${est.error}` }
  }
  // mark baixa as estornada
  const todas = listarBaixas()
  const idx = todas.findIndex((b) => b.id === id)
  todas[idx] = { ...todas[idx], estornado: true }
  salvarBaixas(todas)

  // recalc lancamento status
  const lanc = buscarLancamentoPorId(baixa.lancamentoId)
  if (lanc) {
    const baixas = listarBaixas().filter((b) => b.lancamentoId === lanc.id && !b.estornado)
    const totalBaixado = baixas.reduce((s, b) => s + Number(b.valorMovimentado || 0), 0)
    const atualizado = { ...lanc }
    if (totalBaixado <= 0) atualizado.status = 'pendente'
    else if (totalBaixado < Number(lanc.valor || 0)) atualizado.status = 'parcial'
    else atualizado.status = 'pago'
    // skipCaixaSync: o estorno do movimento de caixa já foi feito acima
    // (estornarMovimento); não recriar o movimento auto-sync por cima.
    atualizarLancamento(lanc.id, atualizado, { skipCaixaSync: true })
  }

  return est
}
