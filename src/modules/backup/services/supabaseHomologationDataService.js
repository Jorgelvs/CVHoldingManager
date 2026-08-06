import { getPersistenceMode } from '../../../infrastructure/persistence/modeService.js'
import { isSupabaseConfigured } from '../../../infrastructure/supabase/client.js'
import { listarPatrimonios, criarPatrimonio } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades, criarUnidade } from '../../unidades/services/unidadeService.js'
import { listarContas, criarConta } from '../../financeiro/services/contaService.js'
import { listarLancamentos, criarLancamento } from '../../financeiro/services/financeiroService.js'
import { CORE_ENTITY_KEYS } from '../../../infrastructure/persistence/persistenceConstants.js'
import { fetchStorageRows } from '../../../infrastructure/persistence/supabaseStorageRepository.js'
import { getSupabaseDataScope } from '../../../infrastructure/supabase/client.js'
import { set as localSet } from '../../../utils/localRepository.js'

const TEST_TAG = '[SUPABASE-HML]'
const TEST_PATRIMONIO_CODE = 'TESTE-SUPABASE'
const TEST_UNIDADE_CODE = 'CASA-TESTE'
const TEST_CONTA_NOME = 'Conta Teste Supabase'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function criarDadosDescartaveisSupabase() {
  if (getPersistenceMode() !== 'supabase') {
    return { error: 'Ative o modo Supabase antes de criar dados descartaveis.' }
  }
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para validar persistencia remota.' }
  }

  const dataHoje = todayIso()

  const patrimonioExistente = listarPatrimonios().find((item) => item.codigo === TEST_PATRIMONIO_CODE)
  const patrimonio = patrimonioExistente || criarPatrimonio({
    nome: 'Patrimonio Teste Supabase',
    codigo: TEST_PATRIMONIO_CODE,
    grupoPatrimonial: 'Residencial',
    tipo: 'Casas independentes',
    finalidade: 'Gerador de Receita',
    modeloReceita: 'Locação Mensal',
    situacao: 'Ativo',
    quantidadeUnidades: 1,
  })

  const unidadeExistente = listarUnidades().find((item) => item.codigoInterno === TEST_UNIDADE_CODE)
  const unidade = unidadeExistente || criarUnidade({
    patrimonioId: patrimonio.id,
    codigoInterno: TEST_UNIDADE_CODE,
    nome: 'Casa Teste',
    tipo: 'Casa',
    finalidade: 'Locação',
    situacao: 'Disponível',
  })

  const contaExistente = listarContas().find((item) => item.nome === TEST_CONTA_NOME)
  const conta = contaExistente || criarConta({
    nome: TEST_CONTA_NOME,
    tipo: 'banco',
    saldoInicial: 0,
    dataSaldoInicial: dataHoje,
    ativa: true,
  })

  const lancamento10JaExiste = listarLancamentos().find((item) => item.descricao === `${TEST_TAG} Lançamento teste R$ 10,00`)
  const lancamento10 = lancamento10JaExiste || criarLancamento({
    tipo: 'despesa',
    categoria: 'Manutenção',
    subcategoria: 'Pintura',
    descricao: `${TEST_TAG} Lançamento teste R$ 10,00`,
    valor: 10,
    dataCompetencia: dataHoje,
    status: 'pendente',
    patrimonioId: patrimonio.id,
    unidadeId: unidade.id,
    patrimonioLabel: patrimonio.nome,
    unidadeLabel: unidade.nome,
    contaFinanceiraId: conta.id,
  })

  return {
    patrimonio,
    unidade,
    conta,
    lancamento10,
  }
}

export function criarLancamentoTeste20Supabase() {
  if (getPersistenceMode() !== 'supabase') {
    return { error: 'Ative o modo Supabase antes de criar lançamento de teste.' }
  }
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para validar persistencia remota.' }
  }

  const dataHoje = todayIso()
  const patrimonio = listarPatrimonios().find((item) => item.codigo === TEST_PATRIMONIO_CODE)
  const unidade = listarUnidades().find((item) => item.codigoInterno === TEST_UNIDADE_CODE)
  const conta = listarContas().find((item) => item.nome === TEST_CONTA_NOME)

  if (!patrimonio || !unidade || !conta) {
    return { error: 'Dados base de homologacao ausentes. Crie os dados descartaveis primeiro.' }
  }

  const descricao = `${TEST_TAG} Lançamento teste R$ 20,00`
  const existente = listarLancamentos().find((item) => item.descricao === descricao)
  if (existente) {
    return { lancamento20: existente, jaExistia: true }
  }

  const lancamento20 = criarLancamento({
    tipo: 'despesa',
    categoria: 'Manutenção',
    subcategoria: 'Pintura',
    descricao,
    valor: 20,
    dataCompetencia: dataHoje,
    status: 'pendente',
    patrimonioId: patrimonio.id,
    unidadeId: unidade.id,
    patrimonioLabel: patrimonio.nome,
    unidadeLabel: unidade.nome,
    contaFinanceiraId: conta.id,
  })

  return { lancamento20, jaExistia: false }
}

export function limparDadosDescartaveisSupabase() {
  if (getPersistenceMode() !== 'supabase') {
    return { error: 'Ative o modo Supabase antes de limpar dados descartaveis.' }
  }
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.' }
  }

  const patrimonios = listarPatrimonios()
  const unidades = listarUnidades()
  const contas = listarContas()
  const lancamentos = listarLancamentos()

  const patrimonioIdsTeste = new Set(
    patrimonios
      .filter((item) => item.codigo === TEST_PATRIMONIO_CODE || item.nome === 'Patrimonio Teste Supabase')
      .map((item) => item.id),
  )

  const unidadeIdsTeste = new Set(
    unidades
      .filter((item) => item.codigoInterno === TEST_UNIDADE_CODE || item.nome === 'Casa Teste' || patrimonioIdsTeste.has(item.patrimonioId))
      .map((item) => item.id),
  )

  const contaIdsTeste = new Set(
    contas
      .filter((item) => item.nome === TEST_CONTA_NOME)
      .map((item) => item.id),
  )

  const lancamentosFiltrados = lancamentos.filter((item) => {
    const descricao = String(item.descricao || '')
    if (descricao.includes(TEST_TAG)) return false
    if (unidadeIdsTeste.has(item.unidadeId)) return false
    if (patrimonioIdsTeste.has(item.patrimonioId)) return false
    if (contaIdsTeste.has(item.contaFinanceiraId)) return false
    return true
  })

  const contasFiltradas = contas.filter((item) => !contaIdsTeste.has(item.id))
  const unidadesFiltradas = unidades.filter((item) => !unidadeIdsTeste.has(item.id))
  const patrimoniosFiltrados = patrimonios.filter((item) => !patrimonioIdsTeste.has(item.id))

  localSet('cvholding_financeiro_lancamentos', lancamentosFiltrados)
  localSet('cvholding_financeiro_contas', contasFiltradas)
  localSet('cvholding_unidades', unidadesFiltradas)
  localSet('cvholding_patrimonios', patrimoniosFiltrados)

  return {
    removidos: {
      patrimonios: patrimonioIdsTeste.size,
      unidades: unidadeIdsTeste.size,
      contas: contaIdsTeste.size,
      lancamentos: lancamentos.length - lancamentosFiltrados.length,
    },
  }
}

export async function coletarEvidenciasSupabaseHomologacao() {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase nao configurado para coleta de evidencias.' }
  }

  const scope = getSupabaseDataScope()
  const rows = await fetchStorageRows(CORE_ENTITY_KEYS)
  if (rows.error) {
    return { error: rows.error }
  }

  const patrimonios = listarPatrimonios().filter((item) => item.codigo === TEST_PATRIMONIO_CODE)
  const unidades = listarUnidades().filter((item) => item.codigoInterno === TEST_UNIDADE_CODE)
  const contas = listarContas().filter((item) => item.nome === TEST_CONTA_NOME)
  const lancamentos = listarLancamentos().filter((item) => String(item.descricao || '').includes(TEST_TAG))

  return {
    scope,
    generatedAt: new Date().toISOString(),
    ids: {
      patrimonios: patrimonios.map((item) => item.id),
      unidades: unidades.map((item) => item.id),
      contas: contas.map((item) => item.id),
      lancamentos: lancamentos.map((item) => item.id),
    },
    counts: {
      patrimonios: patrimonios.length,
      unidades: unidades.length,
      contas: contas.length,
      lancamentos: lancamentos.length,
    },
    rows: rows.data.map((item) => ({
      storageKey: item.storage_key,
      rowVersion: Number(item.row_version || 0),
      lastWriterInstance: item.last_writer_instance || '',
      updatedAt: item.updated_at || null,
    })),
  }
}
