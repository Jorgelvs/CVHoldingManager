import { STORAGE_KEY_LIVRO_CAIXA } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'

function carregarMovimentos() {
  const parsed = localGet(STORAGE_KEY_LIVRO_CAIXA, [])
  return Array.isArray(parsed) ? parsed : []
}

function salvarMovimentos(items) {
  localSet(STORAGE_KEY_LIVRO_CAIXA, items)
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

export function removerMovimentosRelacionados(documentoFinanceiroId, referenciaId = null) {
  if (!documentoFinanceiroId) return 0

  const movs = carregarMovimentos()
  const filtrados = movs.filter((mov) => {
    if (mov.documentoFinanceiroId !== documentoFinanceiroId) return true
    if (referenciaId && mov.referenciaId !== referenciaId) return true
    return false
  })

  const removidos = movs.length - filtrados.length
  if (removidos > 0) {
    salvarMovimentos(filtrados)
  }

  return removidos
}

// Remove TODOS os movimentos de caixa ligados a um lançamento (tanto o
// movimento de auto-sincronização quanto qualquer movimento de baixa),
// independente de referenciaId. Usado ao cancelar/excluir um lançamento,
// para não deixar dinheiro "fantasma" contando no saldo de uma conta.
export function removerTodosMovimentosDoDocumento(documentoFinanceiroId) {
  if (!documentoFinanceiroId) return 0

  const movs = carregarMovimentos()
  const filtrados = movs.filter((mov) => mov.documentoFinanceiroId !== documentoFinanceiroId)

  const removidos = movs.length - filtrados.length
  if (removidos > 0) {
    salvarMovimentos(filtrados)
  }

  return removidos
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
