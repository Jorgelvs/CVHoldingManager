import { STORAGE_KEY_LIVRO_CAIXA } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'

function carregarMovimentos() {
  const raw = localStorage.getItem(STORAGE_KEY_LIVRO_CAIXA)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Dados inválidos')
    return parsed
  } catch {
    const empty = []
    localStorage.setItem(STORAGE_KEY_LIVRO_CAIXA, JSON.stringify(empty))
    return empty
  }
}

function salvarMovimentos(items) {
  localStorage.setItem(STORAGE_KEY_LIVRO_CAIXA, JSON.stringify(items))
}

export function listarMovimentos(filters) {
  const movs = carregarMovimentos()
  if (!filters) return movs
  return movs.filter((m) => {
    if (filters.contaFinanceiraId && m.contaFinanceiraId !== filters.contaFinanceiraId) return false
    if (filters.origem && m.origem !== filters.origem) return false
    if (filters.natureza && m.natureza !== filters.natureza) return false
    if (filters.periodoInicio && m.data < filters.periodoInicio) return false
    if (filters.periodoFim && m.data > filters.periodoFim) return false
    if (filters.termo) {
      const texto = filters.termo.trim().toLowerCase()
      const campos = [m.descricao, m.observacao].filter(Boolean).join(' ').toLowerCase()
      if (!campos.includes(texto)) return false
    }
    return true
  })
}

export function buscarMovimentoPorId(id) {
  return listarMovimentos().find((m) => m.id === id) || null
}

export function registrarMovimento({ documentoFinanceiroId = null, contaFinanceiraId, data, tipo, origem, descricao = '', valor = 0, natureza = 'entrada', referenciaId = null, transferenciaId = null, estornoDeId = null, observacao = '' }) {
  const mov = {
    id: gerarId(),
    documentoFinanceiroId,
    contaFinanceiraId,
    data: data || new Date().toISOString().slice(0, 10),
    tipo: tipo || (natureza === 'entrada' ? 'recebimento' : 'pagamento'),
    origem: origem || 'manual',
    descricao: descricao || '',
    valor: Number(valor) || 0,
    natureza: natureza || 'entrada',
    referenciaId: referenciaId || null,
    transferenciaId: transferenciaId || null,
    estornoDeId: estornoDeId || null,
    observacao: observacao || '',
    criadoEm: new Date().toISOString(),
  }

  const movs = carregarMovimentos()
  movs.push(mov)
  salvarMovimentos(movs)
  return mov
}

export function estornarMovimento(id, motivo = '') {
  const mov = buscarMovimentoPorId(id)
  if (!mov) return { error: 'Movimento não encontrado.' }
  // create estorno movement with inverse natureza and negative/ref value
  const naturezaInversa = mov.natureza === 'entrada' ? 'saida' : 'entrada'
  const estorno = registrarMovimento({
    documentoFinanceiroId: mov.documentoFinanceiroId,
    contaFinanceiraId: mov.contaFinanceiraId,
    data: new Date().toISOString().slice(0, 10),
    tipo: 'estorno',
    origem: 'estorno',
    descricao: `Estorno de ${mov.id}: ${motivo}`,
    valor: mov.valor,
    natureza: naturezaInversa,
    referenciaId: mov.referenciaId,
    transferenciaId: mov.transferenciaId,
    estornoDeId: mov.id,
    observacao: motivo || '',
  })
  return estorno
}

export function calcularSaldoPorConta(contaId) {
  const movs = listarMovimentos({ contaFinanceiraId: contaId })
  let saldo = 0
  for (const m of movs) {
    if (m.natureza === 'entrada') saldo += Number(m.valor || 0)
    else saldo -= Number(m.valor || 0)
  }
  return saldo
}
