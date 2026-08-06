import { getSupabaseAccessState, getSupabaseClient, getSupabaseDataScope } from '../supabase/client.js'

const SUPABASE_SCHEMA = 'cvh'
const TABLE_NAME = 'cv_storage_blobs'

function getStorageTable(client) {
  return client.schema(SUPABASE_SCHEMA).from(TABLE_NAME)
}

function isSchemaNotExposedError(error) {
  const message = String(error?.message || '')
  return error?.code === 'PGRST106'
    || /schema\s+.*not\s+exposed/i.test(message)
    || /not\s+exposed\s+.*schema/i.test(message)
    || /the\s+schema\s+must\s+be\s+one\s+of/i.test(message)
}

function toStorageErrorMessage(error, fallbackMessage) {
  if (isSchemaNotExposedError(error)) {
    return 'O schema cvh não está exposto na Data API do Supabase.'
  }
  return error?.message || fallbackMessage
}

function stringifyPayload(value) {
  return JSON.stringify(value ?? null)
}

function buildHash(input) {
  const text = String(input || '')
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i)
    hash &= 0xffffffff
  }
  return `h${(hash >>> 0).toString(16)}`
}

function parsePayload(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getSupabaseStorageTableName() {
  return `${SUPABASE_SCHEMA}.${TABLE_NAME}`
}

export async function fetchStorageRows(keys = []) {
  const client = getSupabaseClient()
  const scope = getSupabaseDataScope()
  const access = getSupabaseAccessState()
  if (!client) {
    return { data: [], error: 'Cliente Supabase nao configurado.' }
  }
  if (!access.canAccessData) {
    return { data: [], error: access.reason }
  }

  let query = getStorageTable(client)
    .select('storage_key,payload_json,payload_hash,updated_at,row_version,last_writer_instance,owner_id,environment_scope')
    .eq('owner_id', scope.ownerId)
    .eq('environment_scope', scope.environmentScope)

  if (Array.isArray(keys) && keys.length > 0) {
    query = query.in('storage_key', keys)
  }

  const { data, error } = await query
  if (error) {
    return { data: [], error: toStorageErrorMessage(error, 'Falha ao ler dados no Supabase.') }
  }

  return { data: Array.isArray(data) ? data : [], error: null }
}

export async function fetchSingleStorageRow(storageKey) {
  const result = await fetchStorageRows([storageKey])
  if (result.error) return { data: null, error: result.error }
  return { data: Array.isArray(result.data) ? (result.data[0] || null) : null, error: null }
}

export async function upsertStorageRow(storageKey, payload, options = {}) {
  const client = getSupabaseClient()
  const scope = getSupabaseDataScope()
  const access = getSupabaseAccessState()
  if (!client) {
    return { error: 'Cliente Supabase nao configurado.' }
  }
  if (!access.canAccessData) {
    return { error: access.reason }
  }

  const payloadJson = stringifyPayload(payload)
  const payloadHash = buildHash(payloadJson)
  const expectedHash = options.expectedHash ?? null

  const { data: existingRow, error: existingError } = await getStorageTable(client)
    .select('payload_hash,row_version')
    .eq('owner_id', scope.ownerId)
    .eq('environment_scope', scope.environmentScope)
    .eq('storage_key', storageKey)
    .maybeSingle()

  if (existingError) {
    return { error: toStorageErrorMessage(existingError, 'Falha ao validar versao remota.') }
  }

  if (existingRow) {
    if (expectedHash !== null && expectedHash !== existingRow.payload_hash) {
      return {
        error: 'CONFLICT_DETECTED',
        conflict: true,
        remoteHash: existingRow.payload_hash,
      }
    }

    const { error: updateError, data: updated } = await getStorageTable(client)
      .update({
        payload_json: payloadJson,
        payload_hash: payloadHash,
        row_version: Number(existingRow.row_version || 0) + 1,
        last_writer_instance: scope.instanceId,
      })
      .eq('owner_id', scope.ownerId)
      .eq('environment_scope', scope.environmentScope)
      .eq('storage_key', storageKey)
      .eq('row_version', existingRow.row_version)
      .select('row_version')

    if (updateError) {
      return { error: toStorageErrorMessage(updateError, 'Falha ao atualizar no Supabase.') }
    }

    if (!Array.isArray(updated) || updated.length === 0) {
      return { error: 'CONFLICT_DETECTED', conflict: true }
    }

    return {
      error: null,
      payloadHash,
      rowVersion: updated[0].row_version,
    }
  }

  const { error, data: inserted } = await getStorageTable(client)
    .insert({
      storage_key: storageKey,
      payload_json: payloadJson,
      payload_hash: payloadHash,
      owner_id: scope.ownerId,
      environment_scope: scope.environmentScope,
      row_version: 1,
      last_writer_instance: scope.instanceId,
    })
    .select('row_version')

  const isConflictError = Boolean(error && (error.code === '23505' || /duplicate key/i.test(error.message || '')))

  return {
    error: error
      ? (isConflictError ? 'CONFLICT_DETECTED' : toStorageErrorMessage(error, 'Falha ao salvar no Supabase.'))
      : null,
    conflict: isConflictError,
    payloadHash,
    rowVersion: inserted?.[0]?.row_version || 1,
  }
}

export function materializeStorageMap(rows = []) {
  const map = new Map()
  rows.forEach((row) => {
    if (!row?.storage_key) return
    map.set(row.storage_key, {
      payload: parsePayload(row.payload_json),
      payloadHash: row.payload_hash || '',
      updatedAt: row.updated_at || null,
      rowVersion: Number(row.row_version || 0),
      lastWriterInstance: row.last_writer_instance || '',
    })
  })
  return map
}

export function calculatePayloadHash(payload) {
  return buildHash(stringifyPayload(payload))
}

export async function deleteStorageRow(storageKey) {
  const client = getSupabaseClient()
  const scope = getSupabaseDataScope()
  const access = getSupabaseAccessState()
  if (!client) {
    return { error: 'Cliente Supabase nao configurado.' }
  }
  if (!access.canAccessData) {
    return { error: access.reason }
  }

  const { error } = await getStorageTable(client)
    .delete()
    .eq('owner_id', scope.ownerId)
    .eq('environment_scope', scope.environmentScope)
    .eq('storage_key', storageKey)

  return { error: error ? toStorageErrorMessage(error, 'Falha ao remover registro no Supabase.') : null }
}
