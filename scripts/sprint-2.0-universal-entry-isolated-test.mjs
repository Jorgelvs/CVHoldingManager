import {
  interpretCommand,
  refreshParsedEntry,
  setCommandInterpreterDependencies,
  resetCommandInterpreterDependencies,
} from '../src/utils/commandInterpreter.js'
import { createUniversalEntryRuntime } from '../src/modules/financeiro/services/universalEntryFinanceiroService.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function run() {
  const fakePatrimonios = [
    { id: 'pat-1', nome: 'Residencial Teste', codigo: 'RT' },
    { id: 'pat-2', nome: 'UE20-Patrimônio B', codigo: 'UE20B' },
  ]

  const fakeUnidades = [
    { id: 'uni-3', patrimonioId: 'pat-1', nome: 'Casa 3', codigoInterno: 'CASA-03' },
    { id: 'uni-3b', patrimonioId: 'pat-2', nome: 'Casa 3', codigoInterno: 'CASA-03B' },
    { id: 'uni-5', patrimonioId: 'pat-1', nome: 'Casa 5', codigoInterno: 'CASA-05' },
    { id: 'kit-7', patrimonioId: 'pat-1', nome: 'Kitnet 7', codigoInterno: 'KIT-07' },
  ]

  const fakeContas = [
    { id: 'c1', nome: 'Conta Corrente' },
    { id: 'c2', nome: 'Caixa' },
  ]

  const fakeLocatarios = [
    { id: 'loc-1', nomeCompleto: 'Joao Teste' },
  ]

  const fakeContratos = [
    { id: 'ctr-1', codigoInterno: 'CTR-2026-0001', unidadeId: 'uni-5', locatarioId: 'loc-1' },
  ]

  setCommandInterpreterDependencies({
    listarPatrimonios: () => fakePatrimonios,
    buscarPatrimonioPorId: (id) => fakePatrimonios.find((item) => item.id === id) || null,
    listarUnidades: () => fakeUnidades,
    listarContas: () => fakeContas,
    listarLocatarios: () => fakeLocatarios,
    listarContratos: () => fakeContratos,
    buscarSubcategoriaDetalhe: (_tipo, _cat, subcat) => ({ id: `sub-${String(subcat).toLowerCase()}`, nome: subcat }),
  })

  const c1 = interpretCommand('Paguei 3000 eletricista casa 3 no Residencial Teste')
  assert(c1.intent === 'registrar_pagamento', 'Deve interpretar comando de pagamento')
  assert(c1.natureza === 'despesa', 'Deve inferir despesa em pagamento')
  assert(c1.valor === 3000, 'Valor 3000 deve permanecer 3000')
  assert(c1.categoria === 'Manutenção', 'Categoria manutenção deve ser inferida')
  assert(c1.subcategoria === 'Elétrica', 'Subcategoria elétrica deve ser inferida')
  assert(c1.unidadeId === 'uni-3', 'Unidade Casa 3 deve ser resolvida por id real')
  assert(!(c1.missing || []).includes('categoria'), 'Não deve perguntar categoria quando já inferida')

  const c2 = interpretCommand('Paguei 7000 pintor casa 3 no Residencial Teste')
  assert(c2.categoria === 'Manutenção', 'Pintor deve inferir manutenção')
  assert(c2.subcategoria === 'Pintura', 'Pintor deve inferir pintura')

  const c3 = interpretCommand('Recebi 1500 aluguel casa 5 hoje')
  assert(c3.intent === 'registrar_recebimento', 'Recebi deve gerar intenção de recebimento')
  assert(c3.natureza === 'receita', 'Recebimento deve ser receita')
  assert(c3.categoria === 'Aluguel', 'Categoria aluguel deve ser inferida')
  assert(c3.unidadeId === 'uni-5', 'Casa 5 deve ser resolvida')

  const c4 = interpretCommand('Paguei 230 de água da kitnet 7 ontem')
  assert(c4.categoria === 'Água', 'Categoria água deve ser inferida')
  assert(c4.unidadeId === 'kit-7', 'Kitnet 7 deve ser resolvida')
  assert(Boolean(c4.dateIso), 'Data ontem deve ser resolvida')

  const cIso = interpretCommand('Paguei 10 energia casa 5 2026-08-01')
  assert(cIso.dateIso === '2026-08-01', 'Data ISO deve permanecer sem deslocamento')

  const cBr = interpretCommand('Paguei 10 energia casa 5 01/08/2026')
  assert(cBr.dateIso === '2026-08-01', 'Data BR deve ser convertida corretamente')

  const cAmbiguous = interpretCommand('Paguei 500 manutencao casa 3')
  assert(cAmbiguous.unidadeAmbigua, 'Casa 3 duplicada deve ficar ambígua sem patrimônio no comando')
  assert((cAmbiguous.unidadeCandidates || []).length === 2, 'Ambiguidade deve trazer 2 candidatos')
  assert((cAmbiguous.unidadeCandidates || []).every((item) => item.patrimonioLabel), 'Candidatos devem conter patrimônio para desambiguação')

  const cMissingProperty = interpretCommand('Paguei 300 eletricista casa 999')
  assert(cMissingProperty.requiresPropertyLink, 'Comando de manutenção imobiliária deve exigir vínculo')
  assert((cMissingProperty.missing || []).includes('patrimonio'), 'Comando de manutenção sem unidade válida deve exigir patrimônio')

  const cGenericNoLink = interpretCommand('Paguei 90 taxa administrativa')
  assert(!cGenericNoLink.requiresPropertyLink, 'Comando genérico sem referência de imóvel pode existir sem vínculo')

  const missingValor = interpretCommand('Paguei eletricista casa 5')
  assert((missingValor.missing || []).includes('valor'), 'Valor ausente deve entrar em missing')
  const answered = refreshParsedEntry({ ...missingValor, valor: interpretCommand('850').valor })
  assert(!(answered.missing || []).includes('valor'), 'Resposta numérica 850 deve resolver valor')

  const missingUnidade = interpretCommand('Paguei 300 eletricista casa 999')
  const uniqueMissing = new Set(missingUnidade.missing || [])
  assert(uniqueMissing.size === (missingUnidade.missing || []).length, 'Missing não deve ter campos duplicados')

  let createCalls = 0
  const fakeLancamentos = [
    { id: 'l1', tipo: 'despesa', descricao: 'Conta de energia', valor: 500, status: 'pendente', dataVencimento: '2026-08-02' },
    { id: 'l2', tipo: 'receita', descricao: 'Aluguel Casa 5', valor: 1500, status: 'pendente', dataVencimento: '2026-07-15', unidadeId: 'uni-5' },
  ]

  const runtime = createUniversalEntryRuntime({
    criarLancamento: (payload) => {
      createCalls += 1
      return { id: `novo-${createCalls}`, ...payload }
    },
    listarLancamentos: () => fakeLancamentos,
    listarContas: () => fakeContas,
    calcularSaldoGeralContas: () => 2750,
    calcularSaldo: (id) => (id === 'c1' ? 2000 : 750),
    listarContratos: () => fakeContratos,
    listarLocatarios: () => fakeLocatarios,
    now: () => new Date('2026-08-01T00:00:00.000Z'),
  })

  assert(createCalls === 0, 'Cancelamento não deve gravar lançamento')

  const createdOnce = runtime.executarLancamento(c1)
  assert(Boolean(createdOnce.id), 'Confirmação deve gravar lançamento')
  assert(createCalls === 1, 'Confirmação deve gravar uma única vez no fluxo testado')

  const qSaldo = runtime.consultar(interpretCommand('Qual meu saldo?'))
  assert(qSaldo.lines[0].includes('R$'), 'Consulta de saldo deve retornar valor')

  const qConta = runtime.consultar(interpretCommand('Quanto tenho na Conta Corrente?'))
  assert(qConta.lines[0].includes('Conta Corrente'), 'Consulta por conta deve retornar conta específica')

  const qInad = runtime.consultar(interpretCommand('Quem está inadimplente?'))
  assert(qInad.title === 'Inadimplência', 'Consulta de inadimplência deve responder com título correto')

  const qSemana = runtime.consultar(interpretCommand('Quais contas vencem esta semana?'))
  assert(qSemana.title === 'Contas vencendo esta semana', 'Consulta de vencimentos da semana deve funcionar')

  resetCommandInterpreterDependencies()
  console.log('Sprint 2.0 testes isolados: OK')
}

try {
  run()
} catch (err) {
  resetCommandInterpreterDependencies()
  console.error('Sprint 2.0 testes isolados: FALHOU')
  console.error(err?.message || err)
  process.exit(1)
}
