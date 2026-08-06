import {
  deleteStorageRow,
  fetchSingleStorageRow,
  upsertStorageRow,
} from '../../../infrastructure/persistence/supabaseStorageRepository.js'
import {
  getSupabaseAccessState,
  getSupabaseConfig,
  getSupabaseDataScope,
  getSupabaseSessionUser,
  isSupabaseConfigured,
} from '../../../infrastructure/supabase/client.js'

const CONNECTION_PROBE_KEY = 'cvholding_hml_connection_probe'
const CONCURRENCY_PROBE_KEY = 'cvholding_hml_concurrency_probe'

function nowIso() {
  return new Date().toISOString()
}

function buildStage(name, ok, detail, extra = {}) {
  return {
    name,
    ok,
    detail,
    ...extra,
    timestamp: nowIso(),
  }
}

function maskUrl(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return '[URL invalida]'
  }
}

function parsePayloadJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function validarPrerequisitosSupabase() {
  const config = getSupabaseConfig()
  const scope = getSupabaseDataScope()
  const sessionUser = getSupabaseSessionUser()
  const access = getSupabaseAccessState()
  return {
    configured: isSupabaseConfigured(),
    hasUrl: Boolean(config.url),
    hasAnonKey: Boolean(config.anonKey),
    projectHost: maskUrl(config.url),
    environmentScope: scope.environmentScope,
    ownerId: scope.ownerId,
    instanceId: scope.instanceId,
    homologationOnly: Boolean(config.homologationOnly),
    authRequired: Boolean(scope.requiresAuth),
    authenticatedUserId: sessionUser?.id || '',
    canAccessData: access.canAccessData,
    accessReason: access.reason,
  }
}

export async function testarConexaoSupabaseHomologacao() {
  const prerequisite = validarPrerequisitosSupabase()
  const stages = []

  stages.push(buildStage(
    'configuracao',
    prerequisite.hasUrl && prerequisite.hasAnonKey,
    prerequisite.hasUrl && prerequisite.hasAnonKey
      ? 'Variaveis de ambiente Supabase presentes.'
      : 'Variaveis de ambiente Supabase ausentes.',
  ))

  stages.push(buildStage(
    'escopo',
    prerequisite.homologationOnly
      ? (prerequisite.environmentScope.startsWith('homolog') && prerequisite.ownerId === 'anon-homolog')
      : (prerequisite.authRequired && prerequisite.canAccessData && prerequisite.ownerId === prerequisite.authenticatedUserId),
    `Escopo atual: ${prerequisite.environmentScope}, owner: ${prerequisite.ownerId}`,
  ))

  if (!prerequisite.configured) {
    return {
      ok: false,
      prerequisite,
      stages,
      error: 'Supabase nao configurado.',
    }
  }

  const readBefore = await fetchSingleStorageRow(CONNECTION_PROBE_KEY)
  if (readBefore.error) {
    stages.push(buildStage('leitura_inicial', false, readBefore.error))
    return { ok: false, prerequisite, stages, error: readBefore.error }
  }
  stages.push(buildStage('leitura_inicial', true, 'Leitura da tabela cvh.cv_storage_blobs realizada.'))

  const payload = {
    probe: 'connection-test',
    generatedAt: nowIso(),
  }
  const write = await upsertStorageRow(CONNECTION_PROBE_KEY, payload, {
    expectedHash: readBefore.data?.payload_hash || null,
  })

  if (write.error) {
    stages.push(buildStage('escrita_teste', false, write.error))
    return { ok: false, prerequisite, stages, error: write.error }
  }
  stages.push(buildStage('escrita_teste', true, 'Escrita de registro temporario permitida.', {
    rowVersion: Number(write.rowVersion || 0),
  }))

  const readAfterWrite = await fetchSingleStorageRow(CONNECTION_PROBE_KEY)
  if (readAfterWrite.error || !readAfterWrite.data) {
    stages.push(buildStage('leitura_pos_escrita', false, readAfterWrite.error || 'Registro nao encontrado apos escrita.'))
    return {
      ok: false,
      prerequisite,
      stages,
      error: readAfterWrite.error || 'Registro nao encontrado apos escrita.',
    }
  }

  const roundTripPayload = parsePayloadJson(readAfterWrite.data.payload_json)
  const roundTripOk = roundTripPayload?.probe === 'connection-test'
  stages.push(buildStage(
    'leitura_pos_escrita',
    roundTripOk,
    roundTripOk ? 'Leitura apos escrita confirmada.' : 'Payload divergente apos escrita.',
    {
      rowVersion: Number(readAfterWrite.data.row_version || 0),
      lastWriterInstance: readAfterWrite.data.last_writer_instance || '',
      updatedAt: readAfterWrite.data.updated_at || null,
    },
  ))

  const cleanup = await deleteStorageRow(CONNECTION_PROBE_KEY)
  if (cleanup.error) {
    stages.push(buildStage('remocao_temporario', false, cleanup.error))
    return { ok: false, prerequisite, stages, error: cleanup.error }
  }

  const readAfterDelete = await fetchSingleStorageRow(CONNECTION_PROBE_KEY)
  const removed = !readAfterDelete.error && !readAfterDelete.data
  stages.push(buildStage(
    'remocao_temporario',
    removed,
    removed ? 'Registro temporario removido com sucesso.' : 'Registro temporario permaneceu apos remocao.',
  ))

  return {
    ok: stages.every((item) => item.ok),
    prerequisite,
    stages,
  }
}

export async function testarConcorrenciaSupabaseHomologacao() {
  const prerequisite = validarPrerequisitosSupabase()
  const stages = []

  if (!prerequisite.configured) {
    return {
      ok: false,
      prerequisite,
      stages: [buildStage('configuracao', false, 'Supabase nao configurado.')],
      error: 'Supabase nao configurado.',
    }
  }

  await deleteStorageRow(CONCURRENCY_PROBE_KEY)

  const initial = await upsertStorageRow(CONCURRENCY_PROBE_KEY, {
    probe: 'concurrency-initial',
    generatedAt: nowIso(),
  }, { expectedHash: null })
  if (initial.error) {
    stages.push(buildStage('escrita_inicial', false, initial.error))
    return { ok: false, prerequisite, stages, error: initial.error }
  }
  stages.push(buildStage('escrita_inicial', true, 'Escrita inicial criada.', { rowVersion: initial.rowVersion }))

  const read1 = await fetchSingleStorageRow(CONCURRENCY_PROBE_KEY)
  if (read1.error || !read1.data) {
    stages.push(buildStage('leitura_base', false, read1.error || 'Falha ao carregar base de concorrencia.'))
    return { ok: false, prerequisite, stages, error: read1.error || 'Falha ao carregar base de concorrencia.' }
  }
  const staleHash = read1.data.payload_hash
  stages.push(buildStage('leitura_base', true, 'Base carregada para teste de concorrencia.', {
    baseRowVersion: Number(read1.data.row_version || 0),
  }))

  const validUpdate = await upsertStorageRow(CONCURRENCY_PROBE_KEY, {
    probe: 'concurrency-update-valid',
    generatedAt: nowIso(),
  }, { expectedHash: staleHash })

  if (validUpdate.error) {
    stages.push(buildStage('atualizacao_valida', false, validUpdate.error))
    return { ok: false, prerequisite, stages, error: validUpdate.error }
  }
  stages.push(buildStage('atualizacao_valida', true, 'Atualizacao com hash atual concluida.', {
    rowVersion: Number(validUpdate.rowVersion || 0),
  }))

  const staleUpdate = await upsertStorageRow(CONCURRENCY_PROBE_KEY, {
    probe: 'concurrency-update-stale',
    generatedAt: nowIso(),
  }, { expectedHash: staleHash })

  const conflictDetected = staleUpdate.error === 'CONFLICT_DETECTED'
  stages.push(buildStage(
    'atualizacao_desatualizada',
    conflictDetected,
    conflictDetected ? 'Conflito detectado sem sobrescrita silenciosa.' : (staleUpdate.error || 'Conflito nao detectado.'),
    {
      conflict: Boolean(staleUpdate.conflict),
    },
  ))

  const finalRow = await fetchSingleStorageRow(CONCURRENCY_PROBE_KEY)
  stages.push(buildStage(
    'estado_final',
    !finalRow.error && Boolean(finalRow.data),
    finalRow.error || 'Estado final lido com sucesso.',
    {
      rowVersion: Number(finalRow.data?.row_version || 0),
      lastWriterInstance: finalRow.data?.last_writer_instance || '',
      updatedAt: finalRow.data?.updated_at || null,
    },
  ))

  await deleteStorageRow(CONCURRENCY_PROBE_KEY)

  return {
    ok: stages.every((item) => item.ok),
    prerequisite,
    stages,
  }
}
