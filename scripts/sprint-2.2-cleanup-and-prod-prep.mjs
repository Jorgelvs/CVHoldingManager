import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { assertProductionMaintenanceAllowed } from './lib/writeSafetyGuards.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const backupDir = path.join(projectRoot, 'backups', 'sprint-2.2')

const SCOPE = process.env.VITE_SUPABASE_ENV_SCOPE || 'homolog-default'
const OWNER = process.env.VITE_SUPABASE_OWNER_ID || 'anon-homolog'
const URL = process.env.VITE_SUPABASE_URL || ''
const ANON = process.env.VITE_SUPABASE_ANON_KEY || ''

const TABLE = 'cv_storage_blobs'
const SCHEMA = 'cvh'

const OFFICIAL_KEYS = [
  'cvholding_patrimonios',
  'cvholding_unidades',
  'cvholding_locatarios',
  'cvholding_contratos',
  'cvholding_contratos_sequence',
  'cvholding_financeiro_lancamentos',
  'cvholding_rateios',
  'cvholding_financeiro_subcategorias_personalizadas',
  'cvholding_financeiro_contas',
  'cvholding_livro_caixa',
  'cvholding_financeiro_baixas',
  'cvholding_financeiro_aportes',
  'cvholding_financeiro_caucoes',
  'cvholding_configuracoes',
  'cvholding_documentos',
  'cvholding_auditoria',
  'cvholding_notificacoes',
  'cvholding_tarefas_manuais',
]

const EXTRA_REQUIRED_KEYS = [
  'cvholding_universal_history',
  'cvholding_supabase_migration_last_report',
]

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true })
}

function nowStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function countRecords(value) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length > 0 ? 1 : 0
  if (value === null || value === undefined || value === '') return 0
  return 1
}

function parseJsonSafe(raw) {
  if (raw === null || raw === undefined) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getModuleFromStorageKey(storageKey) {
  if (storageKey.startsWith('cvholding_patrimonios')) return 'patrimonios'
  if (storageKey.startsWith('cvholding_unidades')) return 'unidades'
  if (storageKey.startsWith('cvholding_locatarios')) return 'locatarios'
  if (storageKey.startsWith('cvholding_contratos')) return 'contratos'
  if (storageKey.startsWith('cvholding_documentos')) return 'documentos'
  if (storageKey.startsWith('cvholding_notificacoes')) return 'notificacoes'
  if (storageKey.startsWith('cvholding_auditoria')) return 'auditoria'
  if (storageKey.startsWith('cvholding_financeiro_contas')) return 'contas'
  if (storageKey.startsWith('cvholding_financeiro_subcategorias')) return 'categorias'
  if (storageKey.startsWith('cvholding_financeiro_lancamentos')) return 'lancamentos'
  if (storageKey.startsWith('cvholding_financeiro_baixas')) return 'baixas'
  if (storageKey.startsWith('cvholding_financeiro_aportes')) return 'aportes'
  if (storageKey.startsWith('cvholding_financeiro_caucoes')) return 'caucoes'
  if (storageKey.startsWith('cvholding_rateios')) return 'rateios'
  if (storageKey.startsWith('cvholding_livro_caixa')) return 'movimentos'
  if (storageKey.startsWith('cvholding_configuracoes')) return 'configuracoes'
  if (storageKey.startsWith('cvholding_universal_history')) return 'historico_entrada_universal'
  return 'outros'
}

function aggregateByModule(items) {
  const out = {}
  for (const item of items) {
    const mod = getModuleFromStorageKey(item.storage_key || item.storageKey || '')
    out[mod] = (out[mod] || 0) + Number(item.recordsFound || 0)
  }
  return out
}

function buildSupabaseClient() {
  if (!URL || !ANON) {
    throw new Error('VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes no ambiente.')
  }
  return createClient(URL, ANON, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function fetchRowsForScope(client) {
  const { data, error } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .select('storage_key,payload_json,payload_hash,updated_at,row_version,last_writer_instance,owner_id,environment_scope')
    .eq('environment_scope', SCOPE)
    .eq('owner_id', OWNER)

  if (error) throw new Error(error.message)
  return Array.isArray(data) ? data : []
}

function toInventoryRows(rows) {
  return rows.map((row) => {
    const parsed = parseJsonSafe(row.payload_json)
    return {
      storage_key: row.storage_key,
      recordsFound: countRecords(parsed),
      row_version: Number(row.row_version || 0),
      updated_at: row.updated_at || null,
      payload_hash: row.payload_hash || '',
    }
  })
}

function writeJson(fileName, payload) {
  const target = path.join(backupDir, fileName)
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8')
  return target
}

function readLocalBackupFile() {
  const target = path.join(backupDir, 'local-backup-pre-clean.json')
  if (!fs.existsSync(target)) {
    throw new Error(`Backup local nao encontrado: ${target}`)
  }
  return JSON.parse(fs.readFileSync(target, 'utf8'))
}

function summarizeLocalInventoryFromBackup(localBackup) {
  const data = localBackup?.data || {}
  const keysToCheck = [...OFFICIAL_KEYS, ...EXTRA_REQUIRED_KEYS]

  const byKey = {}
  for (const key of keysToCheck) {
    const payload = Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    byKey[key] = {
      exists: payload !== null,
      recordsFound: countRecords(payload),
    }
  }

  const byModule = {}
  for (const [key, val] of Object.entries(byKey)) {
    const mod = getModuleFromStorageKey(key)
    byModule[mod] = (byModule[mod] || 0) + val.recordsFound
  }

  return { byKey, byModule }
}

async function run() {
  if (SCOPE === 'production') {
    assertProductionMaintenanceAllowed({
      scriptName: 'sprint-2.2-cleanup-and-prod-prep',
      environmentScope: SCOPE,
    })
  }

  ensureDir(backupDir)

  const stamp = nowStamp()
  const report = {
    version: 'Sprint 2.2',
    generatedAt: new Date().toISOString(),
    scope: {
      environment_scope: SCOPE,
      owner_id: OWNER,
      table: `${SCHEMA}.${TABLE}`,
    },
    files: {},
    inventoryBefore: {},
    inventoryAfter: {},
    cleanup: {},
    diagnostics: {},
    authRlsAssessment: {},
  }

  const client = buildSupabaseClient()

  const preRows = await fetchRowsForScope(client)
  const preInventoryRows = toInventoryRows(preRows)
  const preRowsByModule = aggregateByModule(preInventoryRows)

  const preSupabaseBackupPayload = {
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    scope: { environment_scope: SCOPE, owner_id: OWNER, table: `${SCHEMA}.${TABLE}` },
    rows: preRows,
  }

  const supabaseBackupPath = writeJson(`supabase-backup-pre-clean-${stamp}.json`, preSupabaseBackupPayload)
  const preSupabaseInventoryPath = writeJson(`inventory-supabase-pre-clean-${stamp}.json`, {
    generatedAt: new Date().toISOString(),
    scope: { environment_scope: SCOPE, owner_id: OWNER },
    rows: preInventoryRows,
    byModule: preRowsByModule,
    totalRows: preRows.length,
  })

  const localBackup = readLocalBackupFile()
  const localSummary = summarizeLocalInventoryFromBackup(localBackup)
  const localInventoryPath = writeJson(`inventory-local-pre-clean-${stamp}.json`, {
    generatedAt: new Date().toISOString(),
    source: 'local-backup-json',
    byKey: localSummary.byKey,
    byModule: localSummary.byModule,
  })

  report.files.localBackup = path.relative(projectRoot, path.join(backupDir, 'local-backup-pre-clean.json'))
  report.files.supabaseBackup = path.relative(projectRoot, supabaseBackupPath)
  report.files.schemaBackup = path.relative(projectRoot, path.join(backupDir, 'schema_cvholding_pre_clean.sql'))
  report.files.inventoryLocalPre = path.relative(projectRoot, localInventoryPath)
  report.files.inventorySupabasePre = path.relative(projectRoot, preSupabaseInventoryPath)

  report.inventoryBefore.local = localSummary
  report.inventoryBefore.supabase = {
    totalRows: preRows.length,
    byModule: preRowsByModule,
    rows: preInventoryRows,
  }

  // Cleanup scoped rows in Supabase
  const { data: rowsToDelete, error: selectDeleteErr } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .select('storage_key')
    .eq('environment_scope', SCOPE)
    .eq('owner_id', OWNER)

  if (selectDeleteErr) {
    throw new Error(`Falha ao selecionar registros para exclusao: ${selectDeleteErr.message}`)
  }

  let deletedCount = 0
  for (const row of rowsToDelete || []) {
    const { error: delErr } = await client
      .schema(SCHEMA)
      .from(TABLE)
      .delete()
      .eq('environment_scope', SCOPE)
      .eq('owner_id', OWNER)
      .eq('storage_key', row.storage_key)
    if (delErr) {
      throw new Error(`Falha ao excluir storage_key ${row.storage_key}: ${delErr.message}`)
    }
    deletedCount += 1
  }

  const postRows = await fetchRowsForScope(client)
  const postInventoryRows = toInventoryRows(postRows)
  const postRowsByModule = aggregateByModule(postInventoryRows)

  const postSupabaseInventoryPath = writeJson(`inventory-supabase-post-clean-${stamp}.json`, {
    generatedAt: new Date().toISOString(),
    scope: { environment_scope: SCOPE, owner_id: OWNER },
    rows: postInventoryRows,
    byModule: postRowsByModule,
    totalRows: postRows.length,
  })

  report.files.inventorySupabasePost = path.relative(projectRoot, postSupabaseInventoryPath)
  report.cleanup.supabase = {
    deletedRows: deletedCount,
    residualRows: postRows.length,
  }
  report.inventoryAfter.supabase = {
    totalRows: postRows.length,
    byModule: postRowsByModule,
    rows: postInventoryRows,
  }

  // Connectivity probe after cleanup
  const probeKey = 'cvholding_hml_connection_probe'
  const probePayload = { probe: 'sprint-2.2-post-clean-test', generatedAt: new Date().toISOString() }

  const { error: writeProbeErr } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .upsert({
      storage_key: probeKey,
      payload_json: JSON.stringify(probePayload),
      payload_hash: 'probe',
      owner_id: OWNER,
      environment_scope: SCOPE,
      row_version: 1,
      last_writer_instance: `script-${stamp}`,
    }, {
      onConflict: 'owner_id,environment_scope,storage_key',
      ignoreDuplicates: false,
    })

  if (writeProbeErr) {
    report.diagnostics.connectionProbe = {
      ok: false,
      error: writeProbeErr.message,
    }
  } else {
    const { data: readProbe, error: readProbeErr } = await client
      .schema(SCHEMA)
      .from(TABLE)
      .select('storage_key,payload_json')
      .eq('environment_scope', SCOPE)
      .eq('owner_id', OWNER)
      .eq('storage_key', probeKey)
      .maybeSingle()

    const { error: delProbeErr } = await client
      .schema(SCHEMA)
      .from(TABLE)
      .delete()
      .eq('environment_scope', SCOPE)
      .eq('owner_id', OWNER)
      .eq('storage_key', probeKey)

    const { data: verifyProbeGone, error: verifyProbeErr } = await client
      .schema(SCHEMA)
      .from(TABLE)
      .select('storage_key')
      .eq('environment_scope', SCOPE)
      .eq('owner_id', OWNER)
      .eq('storage_key', probeKey)

    report.diagnostics.connectionProbe = {
      ok: !readProbeErr && !delProbeErr && !verifyProbeErr && !!readProbe && Array.isArray(verifyProbeGone) && verifyProbeGone.length === 0,
      readError: readProbeErr?.message || null,
      deleteError: delProbeErr?.message || null,
      verifyError: verifyProbeErr?.message || null,
      removedAfterTest: Array.isArray(verifyProbeGone) && verifyProbeGone.length === 0,
    }
  }

  // Local cleanup instructions (cannot mutate browser localStorage from node script)
  report.cleanup.local = {
    requiredKeysToDelete: [...OFFICIAL_KEYS, ...EXTRA_REQUIRED_KEYS],
    note: 'Use browser-local cleanup step to remove only official keys and required extras.',
  }

  // Auth + RLS assessment based on repo conventions
  report.authRlsAssessment = {
    hasFrontendAuthFlow: false,
    usesAnonOwnerFallback: true,
    ownerBindingByAuthUidInSql: true,
    productionReady: false,
    blocker: 'Fluxo de autenticacao real (login/session) ausente no frontend; ambiente segue homologacao anon-homolog.',
  }

  const reportPath = writeJson(`sprint-2.2-report-${stamp}.json`, report)
  console.log(JSON.stringify({ ok: true, reportPath: path.relative(projectRoot, reportPath), report }, null, 2))
}

run().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }, null, 2))
  process.exitCode = 1
})
