import { STORAGE_KEY } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { registrarMovimento, listarMovimentos, removerMovimentosRelacionados } from './livroCaixaService.js'
import { getDataConsiderada } from '../utils/financeiroUtils.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'

function sincronizarMovimentoLancamento(lancamento) {
  if (!lancamento?.contaFinanceiraId) return

  const movs = listarMovimentos()
  const existentes = movs.filter((mov) => mov.documentoFinanceiroId === lancamento.id && mov.referenciaId === lancamento.id)
  if (existentes.length > 0) {
    removerMovimentosRelacionados(lancamento.id, lancamento.id)
  }

  const data = getDataConsiderada(lancamento) || new Date().toISOString().slice(0, 10)
  const natureza = lancamento.tipo === 'receita' ? 'entrada' : 'saida'
  registrarMovimento({
    documentoFinanceiroId: lancamento.id,
    contaFinanceiraId: lancamento.contaFinanceiraId,
    data,
    tipo: lancamento.tipo === 'receita' ? 'recebimento' : 'pagamento',
    origem: lancamento.origem || 'manual',
    descricao: lancamento.descricao || 'Lançamento financeiro',
    valor: lancamento.valor,
    natureza,
    referenciaId: lancamento.id,
    observacao: lancamento.observacoes || '',
  })
}

function garantirLancamento(item) {
  const source = applyCreationTimestamps(applyDomainSchema('financeiro', item), {
    legacyCreatedFields: ['criadoEm'],
    legacyUpdatedFields: ['atualizadoEm'],
  })

  return {
    id: source.id || gerarId(),
    tipo: source.tipo || 'receita',
    categoria: source.categoria || '',
    subcategoria: source.subcategoria || null,
    subcategoriaId: source.subcategoriaId || null,
    subcategoriaLabel: source.subcategoriaLabel || source.subcategoria || null,
    descricao: source.descricao || '',
    valor: Number(source.valor ?? 0),
    dataCompetencia: source.dataCompetencia || '',
    dataVencimento: source.dataVencimento || null,
    dataPagamento: source.dataPagamento || null,
    status: source.status || 'pendente',
    patrimonioId: source.patrimonioId || null,
    unidadeId: source.unidadeId || null,
    tipoManutencao: source.tipoManutencao || null,
    patrimonioLabel: source.patrimonioLabel || null,
    unidadeLabel: source.unidadeLabel || null,
    contratoId: source.contratoId || null,
    locatarioId: source.locatarioId || null,
    origem: source.origem || 'manual',
    rateioId: source.rateioId || null,
    tipoMovimentoCondominio: source.tipoMovimentoCondominio || null,
    cobertaPeloCondominio: source.cobertaPeloCondominio ?? false,
    contaFinanceiraId: source.contaFinanceiraId || null,
    observacoes: source.observacoes || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    criadoEm: source.criadoEm,
    atualizadoEm: source.atualizadoEm,
  }
}

function carregarLancamentos() {
  const parsed = localGet(STORAGE_KEY, [])
  return Array.isArray(parsed) ? parsed.map(garantirLancamento) : []
}

function salvarLancamentos(lancamentos) {
  localSet(STORAGE_KEY, lancamentos)
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

  if (lancamento.contaFinanceiraId) {
    sincronizarMovimentoLancamento(lancamento)
  }

  registrarEventoAuditoria({
    modulo: 'Financeiro',
    acao: 'FINANCEIRO_INCLUSAO',
    registroId: lancamento.id,
    registro: lancamento.descricao || lancamento.id,
    descricao: `Inclusão de lançamento ${lancamento.descricao || lancamento.id}`,
    valorAnterior: null,
    novoValor: lancamento,
    camposAlterados: Object.keys(lancamento),
  })

  return lancamento
}

export function atualizarLancamento(id, dados) {
  const lancamentos = listarLancamentos()
  const index = lancamentos.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = lancamentos[index]

  lancamentos[index] = garantirLancamento({
    ...touchUpdatedAt({ ...anterior, ...dados }, { legacyUpdatedFields: ['atualizadoEm'] }),
    valor: Number(dados.valor ?? anterior.valor),
  })

  salvarLancamentos(lancamentos)

  if (lancamentos[index].contaFinanceiraId) {
    sincronizarMovimentoLancamento(lancamentos[index])
  }

  const atualizado = lancamentos[index]
  const camposAlterados = identificarCamposAlterados(anterior, atualizado, ['atualizadoEm', 'updatedAt'])
  if (camposAlterados.length > 0) {
    registrarEventoAuditoria({
      modulo: 'Financeiro',
      acao: 'FINANCEIRO_ALTERACAO',
      registroId: atualizado.id,
      registro: atualizado.descricao || atualizado.id,
      descricao: `Alteração do lançamento ${atualizado.descricao || atualizado.id}`,
      valorAnterior: anterior,
      novoValor: atualizado,
      camposAlterados,
    })
  }

  return lancamentos[index]
}

export function cancelarLancamento(id) {
  const lancamentos = listarLancamentos()
  const index = lancamentos.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = lancamentos[index]

  lancamentos[index] = {
    ...touchUpdatedAt(anterior, { legacyUpdatedFields: ['atualizadoEm'] }),
    status: 'cancelado',
  }

  salvarLancamentos(lancamentos)

  registrarEventoAuditoria({
    modulo: 'Financeiro',
    acao: 'EXCLUSAO_LOGICA',
    registroId: lancamentos[index].id,
    registro: lancamentos[index].descricao || lancamentos[index].id,
    descricao: `Cancelamento do lançamento ${lancamentos[index].descricao || lancamentos[index].id}`,
    valorAnterior: anterior,
    novoValor: lancamentos[index],
    camposAlterados: ['status'],
  })

  return lancamentos[index]
}

export function excluirLancamento(id) {
  const lancamentos = listarLancamentos()
  const index = lancamentos.findIndex((item) => item.id === id)
  if (index === -1) return false
  const removido = lancamentos[index]
  lancamentos.splice(index, 1)
  salvarLancamentos(lancamentos)

  registrarEventoAuditoria({
    modulo: 'Financeiro',
    acao: 'FINANCEIRO_EXCLUSAO',
    registroId: removido.id,
    registro: removido.descricao || removido.id,
    descricao: `Exclusão do lançamento ${removido.descricao || removido.id}`,
    valorAnterior: removido,
    novoValor: null,
    camposAlterados: ['id'],
  })

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
    const dataReferencia = getDataConsiderada(item)
    if (!dataReferencia) return false
    if (dataInicial && dataReferencia < dataInicial) return false
    if (dataFinal && dataReferencia > dataFinal) return false
    return true
  })
}
