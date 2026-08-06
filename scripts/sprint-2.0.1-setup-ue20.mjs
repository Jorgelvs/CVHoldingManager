import { listarPatrimonios, criarPatrimonio } from '../src/modules/patrimonios/services/patrimonioService.js'
import { listarUnidades, criarUnidade } from '../src/modules/unidades/services/unidadeService.js'
import { listarLocatarios, criarLocatario } from '../src/modules/locatarios/services/locatarioService.js'
import { listarContas, criarConta } from '../src/modules/financeiro/services/contaService.js'
import { listarContratos, criarContrato } from '../src/modules/contratos/services/contratoService.js'
import { assertTestWriteAllowed } from './lib/writeSafetyGuards.mjs'

const PREFIX = 'TEST_UE20-'

const ENV_SCOPE = process.env.VITE_SUPABASE_ENV_SCOPE || 'homolog-default'
const OWNER_ID = process.env.VITE_SUPABASE_OWNER_ID || ''

assertTestWriteAllowed({
  scriptName: 'sprint-2.0.1-setup-ue20',
  environmentScope: ENV_SCOPE,
  ownerId: OWNER_ID,
})

function findByName(list, key, value) {
  return list.find((item) => String(item?.[key] || '').trim() === value) || null
}

function ensurePatrimonio() {
  const nome = `${PREFIX}Patrimônio`
  const existente = findByName(listarPatrimonios(), 'nome', nome)
  if (existente) return existente
  return criarPatrimonio({
    nome,
    codigo: 'UE20P',
    grupoPatrimonial: 'Residencial',
    tipo: 'Casa',
    finalidade: 'Gerador de Receita',
    modeloReceita: 'Locação Mensal',
    situacao: 'Ativo',
    quantidadeUnidades: 3,
    endereco: {},
    configuracoes: {},
  })
}

function ensureUnidade(patrimonioId, nome, codigo) {
  const existente = listarUnidades().find((item) => item.nome === nome)
  if (existente) return existente
  return criarUnidade({
    patrimonioId,
    codigoInterno: codigo,
    nome,
    tipo: nome.includes('Kitnet') ? 'Kitnet' : 'Casa',
    finalidade: 'Locação',
    situacao: 'Disponível',
    areaUtil: '',
    areaTotal: '',
    observacoes: 'Dado descartável Sprint 2.0.1',
  })
}

function ensureLocatario() {
  const nomeCompleto = `${PREFIX}Locatário`
  const existente = listarLocatarios().find((item) => item.nomeCompleto === nomeCompleto)
  if (existente) return existente
  return criarLocatario({
    nomeCompleto,
    cpf: '',
    rg: '',
    telefone: '',
    whatsapp: '',
    email: '',
    observacoes: 'Dado descartável Sprint 2.0.1',
    situacao: 'Ativo',
  })
}

function ensureConta() {
  const nome = `${PREFIX}Conta`
  const existente = listarContas().find((item) => item.nome === nome)
  if (existente) return existente
  return criarConta({
    nome,
    tipo: 'banco',
    saldoInicial: 0,
    ativa: true,
    observacoes: 'Dado descartável Sprint 2.0.1',
  })
}

function ensureContrato(patrimonioId, unidadeId, locatarioId) {
  const existente = listarContratos().find((item) => item.unidadeId === unidadeId && item.situacao === 'Ativo')
  if (existente) return existente
  return criarContrato({
    patrimonioId,
    unidadeId,
    locatarioId,
    dataInicio: '2026-08-01',
    dataFim: '2027-07-31',
    diaVencimento: 5,
    valorAluguel: 1500,
    valorCondominio: 0,
    valorCaucao: 0,
    percentualMulta: 2,
    percentualJuros: 1,
    reajusteTipo: 'Sem reajuste',
    indiceReajuste: 'Sem índice',
    situacao: 'Ativo',
    observacoes: 'Dado descartável Sprint 2.0.1',
  })
}

const patrimonio = ensurePatrimonio()
const unidade3 = ensureUnidade(patrimonio.id, `${PREFIX}Casa 3`, 'UE20-CASA-03')
const unidade5 = ensureUnidade(patrimonio.id, `${PREFIX}Casa 5`, 'UE20-CASA-05')
const unidade7 = ensureUnidade(patrimonio.id, `${PREFIX}Kitnet 7`, 'UE20-KIT-07')
const locatario = ensureLocatario()
const conta = ensureConta()
const contrato = ensureContrato(patrimonio.id, unidade5.id, locatario.id)

console.log(JSON.stringify({
  patrimonio: { id: patrimonio.id, nome: patrimonio.nome },
  unidades: [unidade3, unidade5, unidade7].map((item) => ({ id: item.id, nome: item.nome })),
  locatario: { id: locatario.id, nome: locatario.nomeCompleto },
  conta: { id: conta.id, nome: conta.nome },
  contrato: { id: contrato.id, codigo: contrato.codigoInterno, unidadeId: contrato.unidadeId },
}, null, 2))
