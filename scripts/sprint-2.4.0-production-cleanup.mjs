import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { createClient } from '@supabase/supabase-js'
import { PERSISTED_STORAGE_KEYS } from '../src/infrastructure/persistence/persistenceConstants.js'
import { assertProductionMaintenanceAllowed } from './lib/writeSafetyGuards.mjs'

const SUPABASE_SCHEMA = 'cvh'
const SUPABASE_TABLE = 'cv_storage_blobs'
const ENV_SCOPE = 'production'
const OUTPUT_DIR = path.join(process.cwd(), 'backups', 'sprint-2.4.0')
const EXTRA_KEYS = ['cvholding_universal_history']

const KEY_SET = Array.from(new Set([...PERSISTED_STORAGE_KEYS, ...EXTRA_KEYS]))

const TARGET_PATRIMONIO_IDS = new Set(['patrimonio_rki', 'patrimonio_rkii', 'patrimonio_vdo', 'patrimonio_rb'])
const TARGET_PATRIMONIO_CODES = new Set(['RKI', 'RKII', 'VDO', 'RDB'])
const TARGET_PATRIMONIO_NAMES = new Set([
  'residence kitnet i',
  'residence kitnet ii',
  'residencial villa doeste',
  'recanto da brasa',
])
const DEFAULT_CONTA_NAMES = new Set(['Conta Corrente', 'Conta Caução', 'Caixa'])

const TEST_MARKER_REGEX = /(\[SUPABASE-HML\]|\bteste\b|\btest\b|\bdemo\b|\bhomolog\b|\bsandbox\b|\bmock\b|descartavel|sample)/i

const BUSINESS_KEYS = [
  'cvholding_patrimonios',
  'cvholding_unidades',
  'cvholding_locatarios',
  'cvholding_contratos',
  'cvholding_documentos',
  'cvholding_notificacoes',
  'cvholding_tarefas_manuais',
  'cvholding_financeiro_contas',
  'cvholding_financeiro_lancamentos',
  'cvholding_livro_caixa',
  'cvholding_financeiro_baixas',
  'cvholding_financeiro_aportes',
  'cvholding_financeiro_caucoes',
  'cvholding_rateios',
  'cvholding_universal_history',
]

const TECHNICAL_KEYS = [
  'cvholding_configuracoes',
  'cvholding_financeiro_subcategorias_personalizadas',
  'cvholding_contratos_sequence',
]

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

function readEnvFiles() {
  const candidates = ['.env', '.env.local']
  for (const file of candidates) {
    const filePath = path.join(process.cwd(), file)
    if (!fs.existsSync(filePath)) continue
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match) continue
      const key = match[1]
      let value = match[2] || ''
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

function mask(value) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return `${text.slice(0, 2)}***${text.slice(-2)}`
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

function maskScope(scope) {
  return {
    owner_id: mask(scope.owner_id),
    environment_scope: scope.environment_scope === 'production' ? 'prod***tion' : mask(scope.environment_scope),
  }
}

function hashPayload(payloadJson) {
  const text = String(payloadJson || '')
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i)
    hash &= 0xffffffff
  }
  return `h${(hash >>> 0).toString(16)}`
}

function nowTag() {
  return new Date().toISOString().replace(/[:]/g, '-').slice(0, 19)
}

function countRecords(value) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length > 0 ? 1 : 0
  return value == null || value === '' ? 0 : 1
}

function isMarkedText(value) {
  return TEST_MARKER_REGEX.test(String(value || ''))
}

function normalizeComparableText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function hasAnyMarkedField(item) {
  if (!item || typeof item !== 'object') return false
  for (const value of Object.values(item)) {
    if (typeof value === 'string' && isMarkedText(value)) return true
  }
  return false
}

function isDefaultPatrimonio(item) {
  return TARGET_PATRIMONIO_IDS.has(String(item?.id || ''))
    || TARGET_PATRIMONIO_CODES.has(String(item?.codigo || '').toUpperCase())
    || TARGET_PATRIMONIO_NAMES.has(normalizeComparableText(item?.nome || ''))
}

function isTestPatrimonio(item) {
  return isDefaultPatrimonio(item) || hasAnyMarkedField(item)
}

function isTestUnidade(item, removedPatrimonioIds) {
  return removedPatrimonioIds.has(String(item?.patrimonioId || '')) || hasAnyMarkedField(item)
}

function isTestLocatario(item) {
  return hasAnyMarkedField(item)
}

function isTestContrato(item, removedRefs) {
  return removedRefs.patrimonios.has(String(item?.patrimonioId || ''))
    || removedRefs.unidades.has(String(item?.unidadeId || ''))
    || removedRefs.locatarios.has(String(item?.locatarioId || ''))
    || hasAnyMarkedField(item)
}

function isTestConta(item) {
  return DEFAULT_CONTA_NAMES.has(String(item?.nome || '')) || hasAnyMarkedField(item)
}

function isTestLancamento(item, removedRefs) {
  return removedRefs.patrimonios.has(String(item?.patrimonioId || ''))
    || removedRefs.unidades.has(String(item?.unidadeId || ''))
    || removedRefs.contratos.has(String(item?.contratoId || ''))
    || removedRefs.contas.has(String(item?.contaFinanceiraId || ''))
    || hasAnyMarkedField(item)
}

function isTestGenericWithRef(item, refKeys, removedSetByType) {
  if (!item || typeof item !== 'object') return false
  for (const [field, refType] of refKeys) {
    if (removedSetByType[refType]?.has(String(item[field] || ''))) {
      return true
    }
  }
  return hasAnyMarkedField(item)
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizePayloadForKey(key, payload) {
  if (key === 'cvholding_configuracoes') {
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
  }

  if (key === 'cvholding_notificacoes' || key === 'cvholding_tarefas_manuais') {
    return ensureArray(payload)
  }

  if (key === 'cvholding_contratos_sequence') {
    return payload == null ? 0 : payload
  }

  return ensureArray(payload)
}

function buildModuleInventory(countByKey) {
  return {
    patrimonios: countByKey.cvholding_patrimonios || 0,
    unidades: countByKey.cvholding_unidades || 0,
    locatarios: countByKey.cvholding_locatarios || 0,
    contratos: countByKey.cvholding_contratos || 0,
    documentos: countByKey.cvholding_documentos || 0,
    notificacoes: countByKey.cvholding_notificacoes || 0,
    auditoria: countByKey.cvholding_auditoria || 0,
    configuracoes: countByKey.cvholding_configuracoes || 0,
    categoriasFinanceiras: countByKey.cvholding_financeiro_subcategorias_personalizadas || 0,
    contasFinanceiras: countByKey.cvholding_financeiro_contas || 0,
    lancamentos: countByKey.cvholding_financeiro_lancamentos || 0,
    movimentos: countByKey.cvholding_livro_caixa || 0,
    baixas: countByKey.cvholding_financeiro_baixas || 0,
    aportes: countByKey.cvholding_financeiro_aportes || 0,
    caucoes: countByKey.cvholding_financeiro_caucoes || 0,
    rateios: countByKey.cvholding_rateios || 0,
    historicoEntradaUniversal: countByKey.cvholding_universal_history || 0,
    tarefasManuais: countByKey.cvholding_tarefas_manuais || 0,
    sequenciaContratos: countByKey.cvholding_contratos_sequence || 0,
  }
}

function classifyInventory(countByKey) {
  const sum = (keys) => keys.reduce((acc, key) => acc + Number(countByKey[key] || 0), 0)
  return {
    businessDataTotal: sum(BUSINESS_KEYS),
    technicalDataTotal: sum(TECHNICAL_KEYS),
    businessKeys: BUSINESS_KEYS.map((key) => ({ key, count: Number(countByKey[key] || 0) })),
    technicalKeys: TECHNICAL_KEYS.map((key) => ({ key, count: Number(countByKey[key] || 0) })),
  }
}

function createHiddenQuestionInterface() {
  let muted = false
  const mutableStdout = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding)
      callback()
    },
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
  })

  return {
    ask(question, { secret = false } = {}) {
      return new Promise((resolve) => {
        if (secret) {
          muted = false
          process.stdout.write(question)
          muted = true
          rl.question('', (answer) => {
            muted = false
            process.stdout.write('\n')
            resolve(String(answer || '').trim())
          })
          return
        }

        muted = false
        rl.question(question, (answer) => {
          muted = false
          resolve(String(answer || '').trim())
        })
      })
    },
    close() {
      rl.close()
    },
  }
}

async function fetchRows(client, ownerId) {
  const { data, error } = await client
    .schema(SUPABASE_SCHEMA)
    .from(SUPABASE_TABLE)
    .select('storage_key,payload_json,payload_hash,row_version,updated_at,last_writer_instance,owner_id,environment_scope')
    .eq('owner_id', ownerId)
    .eq('environment_scope', ENV_SCOPE)
    .in('storage_key', KEY_SET)

  if (error) {
    throw new Error(`Falha ao consultar blobs do owner no scope production: ${error.message || 'erro desconhecido'}`)
  }

  const rowByKey = {}
  for (const key of KEY_SET) {
    rowByKey[key] = null
  }

  for (const row of (data || [])) {
    let payload = null
    try {
      payload = row.payload_json ? JSON.parse(row.payload_json) : null
    } catch {
      payload = null
    }
    rowByKey[row.storage_key] = {
      ...row,
      payload,
    }
  }

  return rowByKey
}

function computeCountByKey(rowByKey) {
  const counts = {}
  for (const key of KEY_SET) {
    const payload = rowByKey[key]?.payload ?? null
    counts[key] = countRecords(payload)
  }
  return counts
}

function cleanPayloads(rowByKey) {
  const removed = {
    patrimonios: new Set(),
    unidades: new Set(),
    locatarios: new Set(),
    contratos: new Set(),
    contas: new Set(),
    lancamentos: new Set(),
  }

  const updates = {}
  const removedCountByKey = {}

  const patrimonios = normalizePayloadForKey('cvholding_patrimonios', rowByKey.cvholding_patrimonios?.payload)
  const patrimoniosFiltered = patrimonios.filter((item) => {
    const remove = isTestPatrimonio(item)
    if (remove) removed.patrimonios.add(String(item?.id || ''))
    return !remove
  })
  updates.cvholding_patrimonios = patrimoniosFiltered
  removedCountByKey.cvholding_patrimonios = patrimonios.length - patrimoniosFiltered.length

  const unidades = normalizePayloadForKey('cvholding_unidades', rowByKey.cvholding_unidades?.payload)
  const unidadesFiltered = unidades.filter((item) => {
    const remove = isTestUnidade(item, removed.patrimonios)
    if (remove) removed.unidades.add(String(item?.id || ''))
    return !remove
  })
  updates.cvholding_unidades = unidadesFiltered
  removedCountByKey.cvholding_unidades = unidades.length - unidadesFiltered.length

  const locatarios = normalizePayloadForKey('cvholding_locatarios', rowByKey.cvholding_locatarios?.payload)
  const locatariosFiltered = locatarios.filter((item) => {
    const remove = isTestLocatario(item)
    if (remove) removed.locatarios.add(String(item?.id || ''))
    return !remove
  })
  updates.cvholding_locatarios = locatariosFiltered
  removedCountByKey.cvholding_locatarios = locatarios.length - locatariosFiltered.length

  const contratos = normalizePayloadForKey('cvholding_contratos', rowByKey.cvholding_contratos?.payload)
  const contratosFiltered = contratos.filter((item) => {
    const remove = isTestContrato(item, {
      patrimonios: removed.patrimonios,
      unidades: removed.unidades,
      locatarios: removed.locatarios,
    })
    if (remove) removed.contratos.add(String(item?.id || ''))
    return !remove
  })
  updates.cvholding_contratos = contratosFiltered
  removedCountByKey.cvholding_contratos = contratos.length - contratosFiltered.length

  const contas = normalizePayloadForKey('cvholding_financeiro_contas', rowByKey.cvholding_financeiro_contas?.payload)
  const contasFiltered = contas.filter((item) => {
    const remove = isTestConta(item)
    if (remove) removed.contas.add(String(item?.id || ''))
    return !remove
  })
  updates.cvholding_financeiro_contas = contasFiltered
  removedCountByKey.cvholding_financeiro_contas = contas.length - contasFiltered.length

  const lancamentos = normalizePayloadForKey('cvholding_financeiro_lancamentos', rowByKey.cvholding_financeiro_lancamentos?.payload)
  const lancamentosFiltered = lancamentos.filter((item) => {
    const remove = isTestLancamento(item, {
      patrimonios: removed.patrimonios,
      unidades: removed.unidades,
      contratos: removed.contratos,
      contas: removed.contas,
    })
    if (remove) removed.lancamentos.add(String(item?.id || ''))
    return !remove
  })
  updates.cvholding_financeiro_lancamentos = lancamentosFiltered
  removedCountByKey.cvholding_financeiro_lancamentos = lancamentos.length - lancamentosFiltered.length

  const genericWithRefs = [
    ['cvholding_documentos', [
      ['patrimonioId', 'patrimonios'],
      ['unidadeId', 'unidades'],
      ['contratoId', 'contratos'],
      ['lancamentoId', 'lancamentos'],
    ]],
    ['cvholding_livro_caixa', [
      ['contaFinanceiraId', 'contas'],
      ['documentoFinanceiroId', 'lancamentos'],
      ['referenciaId', 'lancamentos'],
    ]],
    ['cvholding_financeiro_baixas', [
      ['lancamentoId', 'lancamentos'],
      ['contaFinanceiraId', 'contas'],
    ]],
    ['cvholding_financeiro_aportes', [
      ['contaFinanceiraId', 'contas'],
    ]],
    ['cvholding_financeiro_caucoes', [
      ['contaFinanceiraId', 'contas'],
      ['contratoId', 'contratos'],
      ['locatarioId', 'locatarios'],
    ]],
    ['cvholding_rateios', [
      ['lancamentoPaiId', 'lancamentos'],
      ['lancamentoId', 'lancamentos'],
      ['patrimonioId', 'patrimonios'],
      ['unidadeId', 'unidades'],
    ]],
    ['cvholding_notificacoes', [
      ['referenciaId', 'lancamentos'],
      ['unidadeId', 'unidades'],
      ['patrimonioId', 'patrimonios'],
    ]],
    ['cvholding_tarefas_manuais', [
      ['referenciaId', 'lancamentos'],
    ]],
    ['cvholding_auditoria', [
      ['registroId', 'lancamentos'],
    ]],
    ['cvholding_universal_history', []],
  ]

  for (const [key, refs] of genericWithRefs) {
    const original = normalizePayloadForKey(key, rowByKey[key]?.payload)
    const filtered = original.filter((item) => !isTestGenericWithRef(item, refs, removed))
    updates[key] = filtered
    removedCountByKey[key] = original.length - filtered.length
  }

  const subcats = normalizePayloadForKey('cvholding_financeiro_subcategorias_personalizadas', rowByKey.cvholding_financeiro_subcategorias_personalizadas?.payload)
  const subcatsFiltered = subcats.filter((item) => !hasAnyMarkedField(item))
  updates.cvholding_financeiro_subcategorias_personalizadas = subcatsFiltered
  removedCountByKey.cvholding_financeiro_subcategorias_personalizadas = subcats.length - subcatsFiltered.length

  const configuracoes = normalizePayloadForKey('cvholding_configuracoes', rowByKey.cvholding_configuracoes?.payload)
  updates.cvholding_configuracoes = configuracoes
  removedCountByKey.cvholding_configuracoes = 0

  const sequenceValue = normalizePayloadForKey('cvholding_contratos_sequence', rowByKey.cvholding_contratos_sequence?.payload)
  const sequenceReset = contratosFiltered.length === 0 ? 0 : sequenceValue
  updates.cvholding_contratos_sequence = sequenceReset
  removedCountByKey.cvholding_contratos_sequence = sequenceValue === sequenceReset ? 0 : 1

  return { updates, removedCountByKey }
}

async function upsertBlob(client, ownerId, key, payload) {
  const payloadJson = JSON.stringify(payload ?? null)
  const payloadHash = hashPayload(payloadJson)

  const existingResult = await client
    .schema(SUPABASE_SCHEMA)
    .from(SUPABASE_TABLE)
    .select('row_version')
    .eq('owner_id', ownerId)
    .eq('environment_scope', ENV_SCOPE)
    .eq('storage_key', key)
    .maybeSingle()

  if (existingResult.error) {
    throw new Error(`Falha ao consultar versao da chave ${key}: ${existingResult.error.message || 'erro desconhecido'}`)
  }

  const existing = existingResult.data
  if (existing) {
    const rowVersion = Number(existing.row_version || 0)
    const { error } = await client
      .schema(SUPABASE_SCHEMA)
      .from(SUPABASE_TABLE)
      .update({
        payload_json: payloadJson,
        payload_hash: payloadHash,
        row_version: rowVersion + 1,
      })
      .eq('owner_id', ownerId)
      .eq('environment_scope', ENV_SCOPE)
      .eq('storage_key', key)

    if (error) {
      throw new Error(`Falha ao atualizar chave ${key}: ${error.message || 'erro desconhecido'}`)
    }

    return
  }

  const { error } = await client
    .schema(SUPABASE_SCHEMA)
    .from(SUPABASE_TABLE)
    .insert({
      storage_key: key,
      payload_json: payloadJson,
      payload_hash: payloadHash,
      owner_id: ownerId,
      environment_scope: ENV_SCOPE,
      row_version: 1,
      last_writer_instance: 'sprint-2.4.0-script',
    })

  if (error) {
    throw new Error(`Falha ao inserir chave ${key}: ${error.message || 'erro desconhecido'}`)
  }
}

function buildEvidenceSkeleton({ ownerId, email, countByKey, rowByKey, phase }) {
  return {
    phase,
    generatedAt: new Date().toISOString(),
    scope: maskScope({ owner_id: ownerId, environment_scope: ENV_SCOPE }),
    owner: {
      ownerIdMasked: mask(ownerId),
      emailMasked: mask(email),
    },
    inventoryByModule: buildModuleInventory(countByKey),
    inventoryByKey: KEY_SET.map((key) => ({
      key,
      count: Number(countByKey[key] || 0),
      rowVersion: Number(rowByKey[key]?.row_version || 0),
      updatedAt: rowByKey[key]?.updated_at || null,
    })),
    classification: classifyInventory(countByKey),
  }
}

function writeJsonFile(fileName, payload) {
  const target = path.join(OUTPUT_DIR, fileName)
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8')
  return target
}

async function run() {
  readEnvFiles()
  assertProductionMaintenanceAllowed({
    scriptName: 'sprint-2.4.0-production-cleanup',
    environmentScope: ENV_SCOPE,
  })
  ensureOutputDir()

  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios no ambiente para executar a limpeza.')
  }

  const prompt = createHiddenQuestionInterface()
  const ownerEmail = await prompt.ask('E-mail do proprietario: ')
  const ownerPassword = await prompt.ask('Senha do proprietario (oculta): ', { secret: true })
  prompt.close()

  if (!ownerEmail || !ownerPassword) {
    throw new Error('E-mail e senha sao obrigatorios para autenticar.')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-cvh-cleanup-script': 'sprint-2.4.0',
      },
    },
  })

  const login = await client.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword })
  if (login.error || !login.data?.user?.id) {
    throw new Error(`Falha de autenticacao: ${login.error?.message || 'credenciais invalidas'}`)
  }

  const user = login.data.user
  if (user.is_anonymous) {
    throw new Error('Usuario anonimo nao permitido para limpeza de producao.')
  }

  const ownerId = user.id
  if (!ownerId) {
    throw new Error('Nao foi possivel obter auth.uid() do usuario autenticado.')
  }

  const rowByKeyPre = await fetchRows(client, ownerId)
  const countByKeyPre = computeCountByKey(rowByKeyPre)

  const backupData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      scope: maskScope({ owner_id: ownerId, environment_scope: ENV_SCOPE }),
      owner: {
        ownerIdMasked: mask(ownerId),
        emailMasked: mask(ownerEmail),
      },
      note: 'Backup completo do owner autenticado no escopo production (senha/tokens nao armazenados).',
    },
    keys: KEY_SET,
    data: Object.fromEntries(KEY_SET.map((key) => [key, rowByKeyPre[key]?.payload ?? null])),
  }

  const inventoryPreEvidence = buildEvidenceSkeleton({
    ownerId,
    email: ownerEmail,
    countByKey: countByKeyPre,
    rowByKey: rowByKeyPre,
    phase: 'pre-cleanup',
  })

  const backupPath = writeJsonFile(`backup-production-owner-${nowTag()}.json`, backupData)
  const preInventoryPath = writeJsonFile(`inventory-pre-cleanup-${nowTag()}.json`, inventoryPreEvidence)

  const { updates, removedCountByKey } = cleanPayloads(rowByKeyPre)

  for (const key of KEY_SET) {
    await upsertBlob(client, ownerId, key, updates[key] ?? null)
  }

  const rowByKeyPost = await fetchRows(client, ownerId)
  const countByKeyPost = computeCountByKey(rowByKeyPost)

  const inventoryPostEvidence = buildEvidenceSkeleton({
    ownerId,
    email: ownerEmail,
    countByKey: countByKeyPost,
    rowByKey: rowByKeyPost,
    phase: 'post-cleanup',
  })

  const cleanupReport = {
    generatedAt: new Date().toISOString(),
    scope: maskScope({ owner_id: ownerId, environment_scope: ENV_SCOPE }),
    owner: {
      ownerIdMasked: mask(ownerId),
      emailMasked: mask(ownerEmail),
    },
    removedByKey: Object.fromEntries(KEY_SET.map((key) => [key, Number(removedCountByKey[key] || 0)])),
    pre: {
      byModule: buildModuleInventory(countByKeyPre),
      byKey: countByKeyPre,
    },
    post: {
      byModule: buildModuleInventory(countByKeyPost),
      byKey: countByKeyPost,
    },
    residueCheck: {
      businessDataRemaining: classifyInventory(countByKeyPost).businessDataTotal,
      technicalDataRemaining: classifyInventory(countByKeyPost).technicalDataTotal,
      businessKeysWithResidual: BUSINESS_KEYS
        .filter((key) => Number(countByKeyPost[key] || 0) > 0)
        .map((key) => ({ key, count: Number(countByKeyPost[key] || 0) })),
    },
    preservedTechnicalKeys: TECHNICAL_KEYS,
    notes: [
      'Nao foram usados truncate, service_role ou operacoes fora do owner autenticado.',
      'Nao foram gravados senha, access token, refresh token ou anon key em arquivos de evidencia.',
      'Limpeza aplica filtros de teste/demonstracao; dados nao marcados como teste permanecem.',
      'Limpeza de localStorage do navegador nao pode ser executada por script Node e deve ser validada na aplicacao.',
    ],
  }

  const postInventoryPath = writeJsonFile(`inventory-post-cleanup-${nowTag()}.json`, inventoryPostEvidence)
  const cleanupReportPath = writeJsonFile(`cleanup-report-${nowTag()}.json`, cleanupReport)

  await client.auth.signOut()

  console.log('Sprint 2.4.0 finalizada com script autenticado no Supabase.')
  console.log(`Backup: ${backupPath}`)
  console.log(`Inventario pre-limpeza: ${preInventoryPath}`)
  console.log(`Inventario pos-limpeza: ${postInventoryPath}`)
  console.log(`Relatorio de limpeza: ${cleanupReportPath}`)
  console.log(`Owner autenticado (mascarado): ${mask(ownerId)}`)
  console.log(`Escopo: production`) 
}

run().catch((error) => {
  console.error(`Falha na Sprint 2.4.0: ${error.message || String(error)}`)
  process.exitCode = 1
})
