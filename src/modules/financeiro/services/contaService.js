import { STORAGE_KEY_CONTAS } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { listarMovimentos, calcularSaldoPorConta } from './livroCaixaService.js'

function carregarContas() {
  const raw = localStorage.getItem(STORAGE_KEY_CONTAS)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Dados inválidos')
    return parsed
  } catch {
    const empty = []
    localStorage.setItem(STORAGE_KEY_CONTAS, JSON.stringify(empty))
    return empty
  }
}

function salvarContas(items) {
  localStorage.setItem(STORAGE_KEY_CONTAS, JSON.stringify(items))
}

export function inicializarContas() {
  const existentes = carregarContas()
  if (existentes.length > 0) return existentes
  const padrao = [
    { id: gerarId(), nome: 'Conta Corrente', tipo: 'conta_corrente', ativa: true, dataCriacao: new Date().toISOString() },
    { id: gerarId(), nome: 'Conta Caução', tipo: 'caucao', ativa: true, dataCriacao: new Date().toISOString() },
    { id: gerarId(), nome: 'Caixa', tipo: 'caixa', ativa: true, dataCriacao: new Date().toISOString() },
  ]
  salvarContas(padrao)
  return padrao
}

export function listarContas() {
  return carregarContas()
}

export function buscarContaPorId(id) {
  return listarContas().find((c) => c.id === id) || null
}

export function criarConta({ nome, tipo }) {
  const conta = { id: gerarId(), nome: nome || 'Conta', tipo: tipo || 'conta_corrente', ativa: true, dataCriacao: new Date().toISOString() }
  const contas = listarContas()
  contas.push(conta)
  salvarContas(contas)
  return conta
}

export function atualizarConta(id, dados) {
  const contas = listarContas()
  const index = contas.findIndex((c) => c.id === id)
  if (index === -1) return null
  contas[index] = { ...contas[index], nome: dados.nome ?? contas[index].nome, tipo: dados.tipo ?? contas[index].tipo, ativa: typeof dados.ativa === 'boolean' ? dados.ativa : contas[index].ativa }
  salvarContas(contas)
  return contas[index]
}

export function podeExcluirConta(id) {
  // cannot delete if has movements
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
  return calcularSaldoPorConta(id)
}
