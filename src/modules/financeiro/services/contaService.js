import { STORAGE_KEY_CONTAS } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { listarMovimentos, calcularSaldoPorConta } from './livroCaixaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'

function normalizarTipoConta(tipo) {
  if (!tipo) return 'banco'
  const map = {
    banco: 'banco',
    conta_corrente: 'banco',
    conta: 'banco',
    caixa: 'caixa',
    carteira: 'carteira',
    investimento: 'investimento',
    caucao: 'carteira',
  }
  return map[tipo] || 'banco'
}

function normalizarConta(item) {
  const source = applyCreationTimestamps(applyDomainSchema('contaFinanceira', item), {
    legacyCreatedFields: ['dataCriacao', 'criadoEm'],
    legacyUpdatedFields: ['atualizadoEm', 'dataAtualizacao'],
  })
  const hoje = new Date().toISOString().slice(0, 10)
  return {
    id: source?.id || gerarId(),
    nome: source?.nome || 'Conta',
    tipo: normalizarTipoConta(source?.tipo),
    banco: source?.banco || '',
    agencia: source?.agencia || '',
    numeroConta: source?.numeroConta || '',
    saldoInicial: Number(source?.saldoInicial ?? 0),
    dataSaldoInicial: source?.dataSaldoInicial || hoje,
    ativa: typeof source?.ativa === 'boolean' ? source.ativa : true,
    observacoes: source?.observacoes || '',
    dataCriacao: source?.dataCriacao || source?.createdAt,
    createdAt: source?.createdAt,
    updatedAt: source?.updatedAt,
  }
}

function carregarContas() {
  const parsed = localGet(STORAGE_KEY_CONTAS, [])
  return Array.isArray(parsed) ? parsed.map(normalizarConta) : []
}

function salvarContas(items) {
  localSet(STORAGE_KEY_CONTAS, items.map(normalizarConta))
}

export function inicializarContas() {
  const existentes = carregarContas()
  if (existentes.length > 0) return existentes
  const padrao = [
    { id: gerarId(), nome: 'Conta Corrente', tipo: 'banco', saldoInicial: 0, dataSaldoInicial: new Date().toISOString().slice(0, 10), ativa: true, dataCriacao: new Date().toISOString() },
    { id: gerarId(), nome: 'Conta Caução', tipo: 'carteira', saldoInicial: 0, dataSaldoInicial: new Date().toISOString().slice(0, 10), ativa: true, dataCriacao: new Date().toISOString() },
    { id: gerarId(), nome: 'Caixa', tipo: 'caixa', saldoInicial: 0, dataSaldoInicial: new Date().toISOString().slice(0, 10), ativa: true, dataCriacao: new Date().toISOString() },
  ]
  salvarContas(padrao)
  return padrao.map(normalizarConta)
}

export function listarContas() {
  return carregarContas()
}

export function buscarContaPorId(id) {
  return listarContas().find((c) => c.id === id) || null
}

export function criarConta(dados) {
  const conta = normalizarConta({
    ...dados,
    id: gerarId(),
    nome: dados?.nome || 'Conta',
    tipo: dados?.tipo || 'banco',
    saldoInicial: Number(dados?.saldoInicial ?? 0),
    ativo: true,
    dataCriacao: new Date().toISOString(),
  })
  const contas = listarContas()
  contas.push(conta)
  salvarContas(contas)
  return conta
}

export function atualizarConta(id, dados) {
  const contas = listarContas()
  const index = contas.findIndex((c) => c.id === id)
  if (index === -1) return null
  contas[index] = normalizarConta({
    ...touchUpdatedAt(contas[index]),
    ...dados,
    nome: dados?.nome ?? contas[index].nome,
    tipo: dados?.tipo ?? contas[index].tipo,
    saldoInicial: dados?.saldoInicial ?? contas[index].saldoInicial,
    dataSaldoInicial: dados?.dataSaldoInicial ?? contas[index].dataSaldoInicial,
    ativa: typeof dados?.ativa === 'boolean' ? dados.ativa : contas[index].ativa,
    banco: dados?.banco ?? contas[index].banco,
    agencia: dados?.agencia ?? contas[index].agencia,
    numeroConta: dados?.numeroConta ?? contas[index].numeroConta,
    observacoes: dados?.observacoes ?? contas[index].observacoes,
  })
  salvarContas(contas)
  return contas[index]
}

export function podeExcluirConta(id) {
  const movs = listarMovimentos({ contaFinanceiraId: id })
  return movs.length === 0
}

export function excluirConta(id) {
  if (!podeExcluirConta(id)) return false
  const contas = listarContas()
  const index = contas.findIndex((c) => c.id === id)
  if (index === -1) return false
  contas.splice(index, 1)
  salvarContas(contas)
  return true
}

export function calcularSaldo(id) {
  const conta = buscarContaPorId(id)
  const saldoMovimentos = calcularSaldoPorConta(id)
  return Number(conta?.saldoInicial || 0) + saldoMovimentos
}

export function calcularSaldoGeralContas() {
  return listarContas().reduce((total, conta) => total + calcularSaldo(conta.id), 0)
}

export function formatarTipoConta(tipo) {
  const map = {
    banco: 'Banco',
    caixa: 'Caixa',
    carteira: 'Carteira',
    investimento: 'Investimento',
  }
  return map[tipo] || 'Banco'
}

export function listarExtratoConta(id) {
  const conta = buscarContaPorId(id)
  if (!conta) return []

  const linhas = [
    {
      id: `saldo-inicial-${conta.id}`,
      tipo: 'saldo_inicial',
      data: conta.dataSaldoInicial || new Date().toISOString().slice(0, 10),
      descricao: 'Saldo inicial',
      valor: Number(conta.saldoInicial || 0),
      natureza: 'entrada',
    },
    ...listarMovimentos({ contaFinanceiraId: id }).map((movimento) => ({
      ...movimento,
      tipo: 'movimento',
      valor: Number(movimento.valor || 0),
    })),
  ]

  linhas.sort((a, b) => (a.data || '').localeCompare(b.data || ''))

  let saldo = Number(conta.saldoInicial || 0)
  return linhas.map((item) => {
    const valorEfetivo = item.tipo === 'movimento'
      ? (item.natureza === 'entrada' ? Number(item.valor || 0) : -Number(item.valor || 0))
      : Number(item.valor || 0)
    saldo += valorEfetivo
    return {
      ...item,
      saldoAtual: saldo,
    }
  })
}
