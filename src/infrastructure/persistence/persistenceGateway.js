import { BUSINESS_STORAGE_KEYS, PERSISTED_STORAGE_KEYS, PERSISTENCE_MODES } from './persistenceConstants.js'
import { getPersistenceMode } from './modeService.js'
import {
  getSupabaseAccessState,
  getSupabaseDataScope,
  isSupabaseConfigured,
  isSupabaseHomologationOnly,
  isSupabaseProductionScope,
  syncSupabaseSessionFromAuth,
} from '../supabase/client.js'
import {
  fetchStorageRows,
  materializeStorageMap,
  upsertStorageRow,
} from './supabaseStorageRepository.js'

const loggedTags = new Set()

const runtime = {
  mode: getPersistenceMode(),
  ready: false,
  error: '',
  cache: new Map(),
  ignoredLocalBusinessKeys: [],
}

let writeQueue = Promise.resolve()

function logOnce(tag, message, details = {}) {
  if (loggedTags.has(tag)) return
  loggedTags.add(tag)
  console.error('[persistence]', message, details)
}

function parseRaw(raw, defaultValue) {
  if (raw === null || raw === undefined) return defaultValue
  try {
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

function readLocalJson(storageKey, defaultValue) {
  try {
    return parseRaw(localStorage.getItem(storageKey), defaultValue)
  } catch {
    return defaultValue
  }
}

function writeLocalJson(storageKey, value) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function removeLocal(storageKey) {
  try {
    localStorage.removeItem(storageKey)
    return true
  } catch {
    return false
  }
}

function getCachedValue(storageKey) {
  return runtime.cache.get(storageKey)?.payload
}

function listLocalBusinessResidueKeys() {
  if (typeof localStorage === 'undefined') return []

  const residue = []
  for (const key of BUSINESS_STORAGE_KEYS) {
    try {
      if (localStorage.getItem(key) !== null) residue.push(key)
    } catch {
      // Ignora falhas pontuais de acesso ao localStorage para manter bootstrap resiliente.
    }
  }

  return residue
}

function refreshIgnoredLocalBusinessKeys() {
  runtime.ignoredLocalBusinessKeys = listLocalBusinessResidueKeys()
  return runtime.ignoredLocalBusinessKeys
}

function ensureCacheForKnownKeys() {
  PERSISTED_STORAGE_KEYS.forEach((key) => {
    if (!runtime.cache.has(key)) {
      runtime.cache.set(key, { payload: null, payloadHash: '', updatedAt: null })
    }
  })
}

function enqueueWrite(task) {
  writeQueue = writeQueue
    .then(task)
    .catch((error) => {
      logOnce('write-queue', 'Falha na fila de gravacao do Supabase.', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
}

export async function bootstrapPersistence() {
  runtime.mode = getPersistenceMode()
  runtime.ready = false
  runtime.error = ''
  runtime.ignoredLocalBusinessKeys = []

  if (runtime.mode !== PERSISTENCE_MODES.SUPABASE) {
    runtime.ready = true
    return { ...runtime }
  }

  const ignoredKeys = refreshIgnoredLocalBusinessKeys()
  if (isSupabaseProductionScope() && ignoredKeys.length > 0) {
    logOnce(
      'supabase-production-local-residue',
      'Residuos locais de dados de negocio detectados e ignorados em modo Supabase (producao).',
      { ignoredKeys },
    )
  }

  if (!isSupabaseConfigured()) {
    runtime.error = 'Modo Supabase ativo, mas VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY nao foram configuradas.'
    runtime.ready = true
    logOnce('supabase-not-configured', runtime.error)
    return { ...runtime }
  }

  const sessionSync = await syncSupabaseSessionFromAuth()
  if (sessionSync.error && !isSupabaseHomologationOnly()) {
    runtime.error = sessionSync.error
    runtime.cache = new Map()
    ensureCacheForKnownKeys()
    runtime.ready = true
    logOnce('supabase-session-sync-error', 'Falha ao recuperar sessao Supabase.', { error: sessionSync.error })
    return { ...runtime }
  }

  const access = getSupabaseAccessState()
  if (!access.canAccessData) {
    runtime.error = access.reason
    runtime.cache = new Map()
    ensureCacheForKnownKeys()
    runtime.ready = true
    logOnce('supabase-auth-required', runtime.error)
    return { ...runtime }
  }

  const result = await fetchStorageRows(PERSISTED_STORAGE_KEYS)
  if (result.error) {
    runtime.error = result.error
    runtime.cache = new Map()
    ensureCacheForKnownKeys()
    runtime.ready = true
    logOnce('supabase-bootstrap-error', 'Falha ao carregar dados do Supabase.', { error: result.error })
    return { ...runtime }
  }

  runtime.cache = materializeStorageMap(result.data)
  ensureCacheForKnownKeys()
  runtime.ready = true
  return { ...runtime }
}

export function getRuntimePersistenceState() {
  return {
    mode: runtime.mode,
    ready: runtime.ready,
    error: runtime.error,
    scope: getSupabaseDataScope(),
    homologationOnly: isSupabaseHomologationOnly(),
    ignoredLocalBusinessKeys: [...runtime.ignoredLocalBusinessKeys],
  }
}

export function readRepositoryValue(storageKey, defaultValue) {
  const mode = getPersistenceMode()
  runtime.mode = mode

  if (mode !== PERSISTENCE_MODES.SUPABASE) {
    return readLocalJson(storageKey, defaultValue)
  }

  if (runtime.ignoredLocalBusinessKeys.length === 0) {
    refreshIgnoredLocalBusinessKeys()
  }

  const cached = getCachedValue(storageKey)
  if (cached === null || cached === undefined) return defaultValue
  return cached
}

export function writeRepositoryValue(storageKey, value) {
  const mode = getPersistenceMode()
  runtime.mode = mode

  if (mode !== PERSISTENCE_MODES.SUPABASE) {
    return writeLocalJson(storageKey, value)
  }

  if (!isSupabaseConfigured()) {
    runtime.error = 'Modo Supabase ativo sem configuracao valida de URL/ANON key.'
    return false
  }

  const access = getSupabaseAccessState()
  if (!access.canAccessData) {
    runtime.error = access.reason
    return false
  }

  runtime.cache.set(storageKey, {
    payload: value,
    payloadHash: runtime.cache.get(storageKey)?.payloadHash || '',
    rowVersion: runtime.cache.get(storageKey)?.rowVersion || 0,
    updatedAt: new Date().toISOString(),
  })

  enqueueWrite(async () => {
    const expectedHash = runtime.cache.get(storageKey)?.payloadHash || null
    const result = await upsertStorageRow(storageKey, value, { expectedHash })
    if (result.error) {
      runtime.error = result.error
      if (result.conflict) {
        logOnce(`conflict:${storageKey}`, 'Conflito de concorrencia detectado no Supabase.', {
          storageKey,
          scope: getSupabaseDataScope(),
        })
      }
      logOnce(`upsert:${storageKey}`, 'Falha ao sincronizar chave no Supabase.', {
        storageKey,
        error: result.error,
      })
      return
    }

    runtime.cache.set(storageKey, {
      payload: value,
      payloadHash: result.payloadHash || '',
      rowVersion: Number(result.rowVersion || 0),
      updatedAt: new Date().toISOString(),
    })
  })

  return true
}

export function removeRepositoryValue(storageKey) {
  const mode = getPersistenceMode()
  runtime.mode = mode

  if (mode !== PERSISTENCE_MODES.SUPABASE) {
    return removeLocal(storageKey)
  }

  if (!isSupabaseConfigured()) {
    runtime.error = 'Modo Supabase ativo sem configuracao valida de URL/ANON key.'
    return false
  }

  const access = getSupabaseAccessState()
  if (!access.canAccessData) {
    runtime.error = access.reason
    return false
  }

  const currentHash = runtime.cache.get(storageKey)?.payloadHash || null
  runtime.cache.delete(storageKey)
  enqueueWrite(async () => {
    const result = await upsertStorageRow(storageKey, null, { expectedHash: currentHash })
    if (result.error) {
      runtime.error = result.error
      logOnce(`remove:${storageKey}`, 'Falha ao limpar chave no Supabase.', {
        storageKey,
        error: result.error,
      })
    }
  })

  return true
}

export function hasRepositoryValue(storageKey) {
  const mode = getPersistenceMode()
  runtime.mode = mode

  if (mode !== PERSISTENCE_MODES.SUPABASE) {
    try {
      return localStorage.getItem(storageKey) !== null
    } catch {
      return false
    }
  }

  const payload = getCachedValue(storageKey)
  return payload !== null && payload !== undefined
}

export async function waitForPendingPersistenceWrites() {
  try {
    await writeQueue
  } catch {
    // Erros ja sao registrados no enqueueWrite; evita quebrar o fluxo da UI.
  }
}
