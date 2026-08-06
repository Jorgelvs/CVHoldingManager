import {
  CORE_ENTITY_KEYS,
  PERSISTED_STORAGE_KEYS,
  PERSISTENCE_MIGRATION_REPORT_KEY,
  STORAGE_KEY_LABELS,
} from '../../../infrastructure/persistence/persistenceConstants.js'
import { getPersistenceMode } from '../../../infrastructure/persistence/modeService.js'
import {
  calculatePayloadHash,
  fetchStorageRows,
  materializeStorageMap,
  upsertStorageRow,
} from '../../../infrastructure/persistence/supabaseStorageRepository.js'
import { getSupabaseDataScope, isSupabaseHomologationOnly } from '../../../infrastructure/supabase/client.js'
import {
  gerarEstruturaBackup,
  gerarNomeArquivoBackup,
  gerarResumoBackup,
} from './backupService.js'

function parseRaw(raw, fallback = null) {
  if (raw === null || raw === undefined) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function countRecords(value) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length > 0 ? 1 : 0
  if (value === null || value === undefined || value === '') return 0
  return 1
}

function readLocalSnapshot(keys = PERSISTED_STORAGE_KEYS) {
  return keys.map((storageKey) => {
    const raw = localStorage.getItem(storageKey)
    const parsed = parseRaw(raw, null)
    const validJson = raw === null ? true : parsed !== null
    const payload = parsed
    const recordsFound = countRecords(payload)

    return {
      storageKey,
      label: STORAGE_KEY_LABELS[storageKey] || storageKey,
      existsLocal: raw !== null,
      validJson,
      recordsFound,
      payload,
      payloadHash: calculatePayloadHash(payload),
    }
  })
}

function buildSummary(snapshot, remoteByKey) {
  const details = snapshot.map((item) => {
    const remote = remoteByKey.get(item.storageKey)
    const conflict = Boolean(remote && remote.payloadHash && remote.payloadHash !== item.payloadHash)
    const samePayload = Boolean(remote && remote.payloadHash && remote.payloadHash === item.payloadHash)
    const willSend = item.existsLocal && item.validJson && !samePayload

    return {
      storageKey: item.storageKey,
      label: item.label,
      recordsFound: item.recordsFound,
      recordsToSend: willSend ? item.recordsFound : 0,
      conflict,
      samePayload,
      error: item.validJson ? '' : 'JSON local invalido',
    }
  })

  const totals = details.reduce((acc, item) => {
    acc.recordsFound += Number(item.recordsFound || 0)
    acc.recordsToSend += Number(item.recordsToSend || 0)
    if (item.conflict) acc.conflicts += 1
    if (item.error) acc.errors += 1
    return acc
  }, {
    recordsFound: 0,
    recordsToSend: 0,
    conflicts: 0,
    errors: 0,
  })

  return { details, totals }
}

function persistLastReport(report) {
  localStorage.setItem(PERSISTENCE_MIGRATION_REPORT_KEY, JSON.stringify(report))
}

function backupLocalBeforeMigration() {
  const payload = gerarEstruturaBackup()
  const backupName = gerarNomeArquivoBackup('cvholding-pre-migracao-supabase')
  const backupKey = `cvholding_pre_migracao_supabase_${Date.now()}`
  localStorage.setItem(backupKey, JSON.stringify(payload))

  return {
    backupName,
    backupKey,
    backupSummary: gerarResumoBackup(payload),
  }
}

export async function analisarMigracaoLocalParaSupabase(options = {}) {
  const keys = Array.isArray(options.keys) && options.keys.length > 0 ? options.keys : CORE_ENTITY_KEYS
  const snapshot = readLocalSnapshot(keys)
  const remoteRowsResult = await fetchStorageRows(keys)

  const remoteByKey = remoteRowsResult.error
    ? new Map()
    : materializeStorageMap(remoteRowsResult.data)

  const summary = buildSummary(snapshot, remoteByKey)

  const report = {
    modeAtual: getPersistenceMode(),
    generatedAt: new Date().toISOString(),
    scope: getSupabaseDataScope(),
    homologationOnly: isSupabaseHomologationOnly(),
    remoteError: remoteRowsResult.error || '',
    keys,
    details: summary.details,
    totals: summary.totals,
  }

  persistLastReport(report)
  return report
}

export async function migrarLocalParaSupabase(options = {}) {
  if (isSupabaseHomologationOnly() && !options.allowWhenHomologationOnly) {
    return {
      error: 'Migracao bloqueada: ambiente em modo de homologacao isolado (sem autenticacao segura).',
      blockedByPolicy: true,
    }
  }

  const keys = Array.isArray(options.keys) && options.keys.length > 0 ? options.keys : CORE_ENTITY_KEYS
  const allowOverwrite = Boolean(options.allowOverwrite)
  const dryRun = Boolean(options.dryRun)
  const withBackup = options.withBackup !== false

  const analise = await analisarMigracaoLocalParaSupabase({ keys })

  const resultado = {
    dryRun,
    generatedAt: new Date().toISOString(),
    modeAtual: getPersistenceMode(),
    summary: analise,
    sent: [],
    skipped: [],
    errors: [],
    backup: null,
  }

  if (withBackup) {
    resultado.backup = backupLocalBeforeMigration()
  }

  if (dryRun) {
    return resultado
  }

  const snapshot = readLocalSnapshot(keys)
  const remoteRowsResult = await fetchStorageRows(keys)
  const remoteByKey = remoteRowsResult.error
    ? new Map()
    : materializeStorageMap(remoteRowsResult.data)

  for (const item of snapshot) {
    if (!item.existsLocal) {
      resultado.skipped.push({ storageKey: item.storageKey, reason: 'nao_encontrado_local' })
      continue
    }
    if (!item.validJson) {
      resultado.errors.push({ storageKey: item.storageKey, error: 'JSON local invalido' })
      continue
    }

    const remote = remoteByKey.get(item.storageKey)
    const samePayload = Boolean(remote && remote.payloadHash && remote.payloadHash === item.payloadHash)
    const conflict = Boolean(remote && remote.payloadHash && remote.payloadHash !== item.payloadHash)

    if (samePayload) {
      resultado.skipped.push({ storageKey: item.storageKey, reason: 'ja_sincronizado' })
      continue
    }

    if (conflict && !allowOverwrite) {
      resultado.skipped.push({ storageKey: item.storageKey, reason: 'conflito' })
      continue
    }

    const saveResult = await upsertStorageRow(item.storageKey, item.payload)
    if (saveResult.error) {
      resultado.errors.push({ storageKey: item.storageKey, error: saveResult.error })
      continue
    }

    resultado.sent.push({ storageKey: item.storageKey, records: item.recordsFound })
  }

  persistLastReport(resultado)
  return resultado
}

export function obterUltimoRelatorioMigracao() {
  return parseRaw(localStorage.getItem(PERSISTENCE_MIGRATION_REPORT_KEY), null)
}
