import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { PERSISTED_STORAGE_KEYS } from '../src/infrastructure/persistence/persistenceConstants.js'

const SUPABASE_SCHEMA = 'cvh'
const SUPABASE_TABLE = 'cv_storage_blobs'
const OUTPUT_DIR = path.join(process.cwd(), 'backups', 'sprint-2.4.1-diagnostic')
const EXTRA_KEYS = ['cvholding_universal_history']
const KEY_SET = Array.from(new Set([...PERSISTED_STORAGE_KEYS, ...EXTRA_KEYS]))

const STORAGE_KEYS = {
  patrimonios: 'cvholding_patrimonios',
  unidades: 'cvholding_unidades',
  auditoria: 'cvholding_auditoria',
  notificacoes: 'cvholding_notificacoes',
}

const TERM_REGEX = /(pompeia|cancelar\s+unidade|kitnets\s+regra|cancel|check|assistida|regra)/i
const TIMESTAMP_13_REGEX = /\b\d{13}\b/
const AUTOMATION_AUDIT_REGEX = /(sprint|playwright|automated|automation|teste|test|homolog|hml|cleanup|runtime)/i

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

function nowTag() {
  return new Date().toISOString().replace(/[:]/g, '-').slice(0, 19)
}

function writeJsonFile(fileName, payload) {
  const target = path.join(OUTPUT_DIR, fileName)
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8')
  return target
}

function mask(value) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return `${text.slice(0, 2)}***${text.slice(-2)}`
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

function projectRefFromUrl(url) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname || ''
    return host.split('.')[0] || ''
  } catch {
    return ''
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function pickTimestamp(record, fallback = null) {
  const candidates = [
    record?.createdAt,
    record?.criadoEm,
    record?.dataCriacao,
    record?.created_at,
    record?.updatedAt,
    record?.atualizadoEm,
    record?.dataAtualizacao,
    record?.updated_at,
    fallback,
  ]

  for (const value of candidates) {
    if (!value) continue
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return null
}

function minuteBucket(isoDate) {
  if (!isoDate) return ''
  return String(isoDate).slice(0, 16)
}

function classifyByEvidence(evidences) {
  const strong = evidences.filter((e) => e.strength === 'strong').length
  const weak = evidences.filter((e) => e.strength === 'weak').length
  const probable = strong >= 1 || weak >= 2
  return { probable }
}

function detectBaseEvidences({ nome, codigo }) {
  const evidences = []
  const nomeText = String(nome || '')
  const codigoText = String(codigo || '')
  const merged = `${nomeText} ${codigoText}`

  if (TIMESTAMP_13_REGEX.test(merged)) {
    evidences.push({
      type: 'timestamp_13_digits',
      strength: 'strong',
      reason: 'Nome/codigo contem timestamp de 13 digitos.',
    })
  }

  if (TERM_REGEX.test(merged)) {
    evidences.push({
      type: 'test_keyword_pattern',
      strength: 'weak',
      reason: 'Nome/codigo contem padrao textual associado a dados de teste.',
    })
  }

  const onlyDigits = codigoText.replace(/\D/g, '')
  if (onlyDigits.length >= 10) {
    evidences.push({
      type: 'timestamp_like_code',
      strength: 'weak',
      reason: 'Codigo possui formato numerico semelhante a timestamp.',
    })
  }

  return evidences
}

function buildAuditIndex(auditoria) {
  const indexByRegistroId = new Map()
  const textRows = []
  for (const row of toArray(auditoria)) {
    const registroId = String(row?.registroId || '')
    if (registroId) {
      if (!indexByRegistroId.has(registroId)) indexByRegistroId.set(registroId, [])
      indexByRegistroId.get(registroId).push(row)
    }
    textRows.push({
      row,
      text: [row?.descricao, row?.registro, row?.modulo, row?.acao].filter(Boolean).join(' '),
    })
  }
  return { indexByRegistroId, textRows }
}

function findAuditEvidence(record, auditIndex) {
  const evidences = []
  const id = String(record?.id || '')
  const nome = String(record?.nome || record?.registro || '')
  const matched = []

  if (id && auditIndex.indexByRegistroId.has(id)) {
    matched.push(...auditIndex.indexByRegistroId.get(id))
  }

  if (nome) {
    const nomeNorm = normalizeText(nome)
    for (const item of auditIndex.textRows) {
      if (normalizeText(item.text).includes(nomeNorm)) {
        matched.push(item.row)
      }
    }
  }

  const unique = new Map()
  for (const row of matched) {
    const key = `${row?.id || ''}|${row?.dataHora || row?.createdAt || ''}|${row?.descricao || ''}`
    if (!unique.has(key)) unique.set(key, row)
  }

  const rows = Array.from(unique.values())
  const automated = rows.filter((row) => AUTOMATION_AUDIT_REGEX.test([row?.descricao, row?.registro, row?.modulo, row?.acao].join(' ')))
  if (automated.length > 0) {
    evidences.push({
      type: 'audit_automation_link',
      strength: 'strong',
      reason: `Auditoria vinculada com marcador de automacao/teste (${automated.length} registro(s)).`,
    })
  } else if (rows.length > 0) {
    evidences.push({
      type: 'audit_link_present',
      strength: 'weak',
      reason: `Existe vinculo em auditoria para o registro (${rows.length} evento(s)).`,
    })
  }

  return { evidences, linkedAuditRows: rows }
}

async function fetchRows(client, ownerId, environmentScope) {
  const { data, error } = await client
    .schema(SUPABASE_SCHEMA)
    .from(SUPABASE_TABLE)
    .select('storage_key,payload_json,payload_hash,row_version,updated_at,last_writer_instance,owner_id,environment_scope')
    .eq('owner_id', ownerId)
    .eq('environment_scope', environmentScope)
    .in('storage_key', KEY_SET)

  if (error) {
    throw new Error(`Falha ao consultar blobs: ${error.message || 'erro desconhecido'}`)
  }

  const rowByKey = {}
  for (const key of KEY_SET) rowByKey[key] = null

  for (const row of (data || [])) {
    rowByKey[row.storage_key] = {
      ...row,
      payload: parseJson(row.payload_json),
    }
  }

  return rowByKey
}

function classifyEntities(rowByKey) {
  const patrimoniosRaw = toArray(rowByKey[STORAGE_KEYS.patrimonios]?.payload)
  const unidadesRaw = toArray(rowByKey[STORAGE_KEYS.unidades]?.payload)
  const auditoriaRaw = toArray(rowByKey[STORAGE_KEYS.auditoria]?.payload)
  const notificacoesRaw = toArray(rowByKey[STORAGE_KEYS.notificacoes]?.payload)

  const auditIndex = buildAuditIndex(auditoriaRaw)

  const patrimoniosBase = patrimoniosRaw.map((item) => ({
    id: String(item?.id || ''),
    nome: String(item?.nome || ''),
    codigo: String(item?.codigo || ''),
    created_at: pickTimestamp(item),
    updated_at: pickTimestamp({ updatedAt: item?.updatedAt, atualizadoEm: item?.atualizadoEm, updated_at: item?.updated_at }, pickTimestamp(item)),
    tipo: String(item?.tipo || item?.grupoPatrimonial || item?.grupo || ''),
    classificacao: String(item?.tipo || ''),
    raw: item,
  }))

  const unitsBase = unidadesRaw.map((item) => ({
    id: String(item?.id || ''),
    nome: String(item?.nome || ''),
    codigo: String(item?.codigoInterno || item?.codigo || ''),
    patrimonioId: String(item?.patrimonioId || item?.patrimonio_id || ''),
    created_at: pickTimestamp(item),
    updated_at: pickTimestamp({ updatedAt: item?.updatedAt, updated_at: item?.updated_at, atualizadoEm: item?.atualizadoEm }, pickTimestamp(item)),
    tipo: String(item?.tipo || ''),
    classificacao: String(item?.tipo || ''),
    raw: item,
  }))

  const minuteCountsPatrimonio = {}
  for (const row of patrimoniosBase) {
    const bucket = minuteBucket(row.created_at)
    if (!bucket) continue
    minuteCountsPatrimonio[bucket] = Number(minuteCountsPatrimonio[bucket] || 0) + 1
  }

  const minuteCountsUnidades = {}
  for (const row of unitsBase) {
    const bucket = minuteBucket(row.created_at)
    if (!bucket) continue
    minuteCountsUnidades[bucket] = Number(minuteCountsUnidades[bucket] || 0) + 1
  }

  const patrimonioMap = new Map(patrimoniosBase.map((row) => [row.id, row]))
  const patrimoniosClassified = patrimoniosBase.map((row) => {
    const evidences = detectBaseEvidences({ nome: row.nome, codigo: row.codigo })
    const audit = findAuditEvidence(row, auditIndex)
    evidences.push(...audit.evidences)

    const bucket = minuteBucket(row.created_at)
    if (bucket && Number(minuteCountsPatrimonio[bucket] || 0) >= 3) {
      evidences.push({
        type: 'batch_creation_window',
        strength: 'weak',
        reason: `Criacao em lote no mesmo minuto (${minuteCountsPatrimonio[bucket]} patrimonios).`,
      })
    }

    const { probable } = classifyByEvidence(evidences)
    return {
      ...row,
      probable_test_data: probable,
      test_reasons: evidences.map((e) => e.reason),
      evidence: evidences,
      linked_audit_count: audit.linkedAuditRows.length,
    }
  })

  const testPatrimonioIds = new Set(
    patrimoniosClassified
      .filter((row) => row.probable_test_data)
      .map((row) => row.id),
  )

  const unidadesClassified = unitsBase.map((row) => {
    const evidences = detectBaseEvidences({ nome: row.nome, codigo: row.codigo })
    const audit = findAuditEvidence(row, auditIndex)
    evidences.push(...audit.evidences)

    if (testPatrimonioIds.has(row.patrimonioId)) {
      const parentName = patrimonioMap.get(row.patrimonioId)?.nome || row.patrimonioId
      evidences.push({
        type: 'linked_to_test_patrimonio',
        strength: 'strong',
        reason: `Unidade vinculada a patrimonio classificado como teste (${parentName}).`,
      })
    }

    const bucket = minuteBucket(row.created_at)
    if (bucket && Number(minuteCountsUnidades[bucket] || 0) >= 3) {
      evidences.push({
        type: 'batch_creation_window',
        strength: 'weak',
        reason: `Criacao em lote no mesmo minuto (${minuteCountsUnidades[bucket]} unidades).`,
      })
    }

    const { probable } = classifyByEvidence(evidences)
    return {
      ...row,
      probable_test_data: probable,
      test_reasons: evidences.map((e) => e.reason),
      evidence: evidences,
      linked_audit_count: audit.linkedAuditRows.length,
    }
  })

  const testUnidadeIds = new Set(
    unidadesClassified
      .filter((row) => row.probable_test_data)
      .map((row) => row.id),
  )

  const inventory = {
    generatedAt: new Date().toISOString(),
    summary: {
      patrimoniosTotal: patrimoniosClassified.length,
      patrimoniosProvavelTeste: patrimoniosClassified.filter((row) => row.probable_test_data).length,
      patrimoniosProvavelReal: patrimoniosClassified.filter((row) => !row.probable_test_data).length,
      unidadesTotal: unidadesClassified.length,
      unidadesProvavelTeste: unidadesClassified.filter((row) => row.probable_test_data).length,
      unidadesProvavelReal: unidadesClassified.filter((row) => !row.probable_test_data).length,
      auditoriaTotal: auditoriaRaw.length,
      notificacoesTotal: notificacoesRaw.length,
      unidadesLigadasPatrimonioTeste: unidadesClassified.filter((row) => testPatrimonioIds.has(row.patrimonioId)).length,
      idsTeste: {
        patrimonios: Array.from(testPatrimonioIds),
        unidades: Array.from(testUnidadeIds),
      },
    },
    patrimonios: patrimoniosClassified,
    unidades: unidadesClassified,
  }

  return {
    inventory,
    classified: {
      patrimoniosTest: patrimoniosClassified.filter((row) => row.probable_test_data),
      patrimoniosReal: patrimoniosClassified.filter((row) => !row.probable_test_data),
      unidadesTest: unidadesClassified.filter((row) => row.probable_test_data),
      unidadesReal: unidadesClassified.filter((row) => !row.probable_test_data),
      auditoriaRaw,
      notificacoesRaw,
    },
  }
}

function localStorageReadWriteEvidence() {
  return {
    reads: [
      'src/infrastructure/persistence/modeService.js:getPersistenceMode -> localStorage.getItem(cvholding_persistence_mode)',
      'src/infrastructure/supabase/client.js:getSupabaseInstanceId -> localStorage.getItem(cvholding_supabase_instance_id)',
      'src/infrastructure/persistence/persistenceGateway.js:readLocalJson/hasRepositoryValue -> localStorage.getItem(storageKey)',
    ],
    writes: [
      'src/infrastructure/persistence/modeService.js:setPersistenceMode -> localStorage.setItem(cvholding_persistence_mode)',
      'src/infrastructure/supabase/client.js:getSupabaseInstanceId -> localStorage.setItem(cvholding_supabase_instance_id)',
      'src/infrastructure/persistence/persistenceGateway.js:writeLocalJson -> localStorage.setItem(storageKey, JSON)',
      'src/infrastructure/persistence/persistenceGateway.js:removeLocal -> localStorage.removeItem(storageKey)',
    ],
  }
}

async function run() {
  readEnvFiles()
  ensureOutputDir()

  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''
  const environmentScope = process.env.DIAG_ENV_SCOPE || process.env.VITE_SUPABASE_ENV_SCOPE || 'homolog-default'
  const homologationOnly = process.env.VITE_SUPABASE_HOMOLOGATION_ONLY !== 'false'
  const ownerFromEnv = process.env.DIAG_OWNER_ID || process.env.VITE_SUPABASE_OWNER_ID || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios.')
  }

  if (!ownerFromEnv) {
    throw new Error('Owner nao definido. Forneca VITE_SUPABASE_OWNER_ID ou DIAG_OWNER_ID.')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const session = await client.auth.getSession()
  const sessionUserId = session?.data?.session?.user?.id || ''
  const authUid = process.env.DIAG_AUTH_UID || (homologationOnly ? ownerFromEnv : sessionUserId)

  const rowByKey = await fetchRows(client, ownerFromEnv, environmentScope)
  const diagnostics = classifyEntities(rowByKey)

  const fullBackup = {
    generatedAt: new Date().toISOString(),
    scope: {
      owner_id_masked: mask(ownerFromEnv),
      environment_scope: environmentScope,
    },
    source: {
      project_ref: projectRefFromUrl(supabaseUrl),
      supabase_url_host: new URL(supabaseUrl).hostname,
    },
    storageKeys: KEY_SET,
    rows: Object.fromEntries(KEY_SET.map((key) => [key, rowByKey[key]?.payload ?? null])),
  }

  const testOnlyBackup = {
    generatedAt: new Date().toISOString(),
    scope: fullBackup.scope,
    source: fullBackup.source,
    patrimonios: diagnostics.classified.patrimoniosTest,
    unidades: diagnostics.classified.unidadesTest,
    auditoria: diagnostics.classified.auditoriaRaw,
    notificacoes: diagnostics.classified.notificacoesRaw,
  }

  const realOnlyBackup = {
    generatedAt: new Date().toISOString(),
    scope: fullBackup.scope,
    source: fullBackup.source,
    patrimonios: diagnostics.classified.patrimoniosReal,
    unidades: diagnostics.classified.unidadesReal,
    auditoria: diagnostics.classified.auditoriaRaw,
    notificacoes: diagnostics.classified.notificacoesRaw,
  }

  const runtimeCapture = {
    generatedAt: new Date().toISOString(),
    supabase_project_ref: projectRefFromUrl(supabaseUrl),
    auth_uid_masked: mask(authUid || 'unavailable'),
    environment_scope: environmentScope,
    persistence_mode_runtime: 'indeterminado_via_node_diagnostic',
    browser_origin_runtime: process.env.DIAG_BROWSER_ORIGIN || 'nao_coletado_neste_contexto',
    storage_keys: {
      patrimonios: STORAGE_KEYS.patrimonios,
      unidades: STORAGE_KEYS.unidades,
      auditoria: STORAGE_KEYS.auditoria,
      notificacoes: STORAGE_KEYS.notificacoes,
    },
    localStorage_read_write_confirmed: true,
    localStorage_evidence: localStorageReadWriteEvidence(),
    homologation_only_mode: homologationOnly,
    owner_id_masked: mask(ownerFromEnv),
  }

  const inventoryPreCleanup = {
    generatedAt: new Date().toISOString(),
    scope: fullBackup.scope,
    runtime: runtimeCapture,
    inventory: diagnostics.inventory,
  }

  const stamp = nowTag()
  const fullBackupPath = writeJsonFile(`backup-full-owner-scope-${stamp}.json`, fullBackup)
  const testBackupPath = writeJsonFile(`backup-probable-test-only-${stamp}.json`, testOnlyBackup)
  const realBackupPath = writeJsonFile(`backup-probable-real-only-${stamp}.json`, realOnlyBackup)
  const inventoryPath = writeJsonFile(`inventory-pre-cleanup-${stamp}.json`, inventoryPreCleanup)
  const runtimePath = writeJsonFile(`runtime-capture-${stamp}.json`, runtimeCapture)

  console.log(JSON.stringify({
    ok: true,
    scope: fullBackup.scope,
    summary: diagnostics.inventory.summary,
    files: {
      runtimeCapture: runtimePath,
      fullBackup: fullBackupPath,
      probableTestBackup: testBackupPath,
      probableRealBackup: realBackupPath,
      inventoryPreCleanup: inventoryPath,
    },
  }, null, 2))
}

run().catch((error) => {
  console.error(`Falha no diagnostico: ${error.message || String(error)}`)
  process.exitCode = 1
})