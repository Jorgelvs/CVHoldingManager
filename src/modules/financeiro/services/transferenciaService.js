import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { registrarMovimento } from './livroCaixaService.js'

export function criarTransferencia({ origemContaId, destinoContaId, valor, data, descricao = '' }) {
  const transferenciaId = gerarId()
  const dataStr = data || new Date().toISOString().slice(0,10)
  // saída
  const out = registrarMovimento({ documentoFinanceiroId: null, contaFinanceiraId: origemContaId, data: dataStr, tipo: 'transferencia', origem: 'transferencia', descricao: descricao || 'Transferência', valor: valor, natureza: 'saida', transferenciaId })
  // entrada
  const inp = registrarMovimento({ documentoFinanceiroId: null, contaFinanceiraId: destinoContaId, data: dataStr, tipo: 'transferencia', origem: 'transferencia', descricao: descricao || 'Transferência', valor: valor, natureza: 'entrada', transferenciaId })
  return { transferenciaId, saida: out, entrada: inp }
}
