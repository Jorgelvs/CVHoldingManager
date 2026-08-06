import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { createClient } from '@supabase/supabase-js'
import { assertProductionMaintenanceAllowed } from './lib/writeSafetyGuards.mjs'

const SUPABASE_SCHEMA = 'cvh'
const SUPABASE_TABLE = 'cv_storage_blobs'

const KEY_TO_MODULE = {
  cvholding_patrimonios: 'patrimonios',
  cvholding_unidades: 'unidades',
  cvholding_locatarios: 'locatarios',
  cvholding_contratos: 'contratos',
  cvholding_documentos: 'documentos',
  cvholding_financeiro_lancamentos: 'lancamentos',
  cvholding_financeiro_contas: 'contas_financeiras',
  cvholding_financeiro_baixas: 'baixas',
  cvholding_livro_caixa: 'livro_caixa',
  cvholding_rateios: 'rateios',
  cvholding_notificacoes: 'notificacoes',
  cvholding_auditoria: 'auditoria',
  cvholding_configuracoes: 'configuracoes_operacionais',
  cvholding_imobiliarias: 'imobiliarias',
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
      if (!process.env[key]) process.env[key] = value
    }
  }
}

function mask(value) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return `${text.slice(0, 2)}***${text.slice(-2)}`
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0] || ''
  } catch {
    return ''
  }
}

function nowTag() {
  return new Date().toISOString().replace(/[:]/g, '-').slice(0, 19)
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

function parseJsonSafe(raw) {
  if (raw == null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function countRecords(value) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length > 0 ? 1 : 0
  return value == null || value === '' ? 0 : 1
}

function moduleFromKey(key) {
  return KEY_TO_MODULE[key] || 'outros_dominios'
}

function createPrompt() {
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

async function fetchOwnerRows(client, ownerId, environmentScope) {
  const { data, error } = await client
    .schema(SUPABASE_SCHEMA)
    .from(SUPABASE_TABLE)
    .select('storage_key,payload_json,payload_hash,row_version,updated_at,last_writer_instance,owner_id,environment_scope')
    .eq('owner_id', ownerId)
    .eq('environment_scope', environmentScope)

  if (error) throw new Error(`Falha ao consultar blobs: ${error.message || 'erro desconhecido'}`)
  return Array.isArray(data) ? data : []
}

function buildInventory(rows) {
  const byModule = {}
  const byKey = []

  for (const row of rows) {
    const payload = parseJsonSafe(row.payload_json)
    const records = countRecords(payload)
    const module = moduleFromKey(row.storage_key)
    byModule[module] = Number(byModule[module] || 0) + records

    byKey.push({
      storage_key: row.storage_key,
      module,
      records,
      updated_at: row.updated_at || null,
      payload_size_bytes: Buffer.byteLength(String(row.payload_json || ''), 'utf8'),
      row_version: Number(row.row_version || 0),
    })
  }

  byKey.sort((a, b) => a.storage_key.localeCompare(b.storage_key))

  return {
    totalStorageKeys: rows.length,
    totalBusinessRecords: byKey.reduce((acc, item) => acc + Number(item.records || 0), 0),
    byModule,
    byKey,
  }
}

async function run() {
  readEnvFiles()

  const envScope = process.env.RESET_ENV_SCOPE || process.env.VITE_SUPABASE_ENV_SCOPE || 'homolog-default'
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios.')
  }

  assertProductionMaintenanceAllowed({
    scriptName: 'sprint-production-reset',
    environmentScope: envScope,
  })

  const ts = nowTag()
  const outputDir = path.join(process.cwd(), 'backups', 'sprint-production-reset', ts)
  ensureDir(outputDir)

  const prompt = createPrompt()
  const email = await prompt.ask('E-mail do owner de producao: ')
  const password = await prompt.ask('Senha do owner (oculta): ', { secret: true })
  const confirmation = await prompt.ask('Digite RESET_PRODUCTION_OWNER_DATA para confirmar: ')
  prompt.close()

  if (confirmation !== 'RESET_PRODUCTION_OWNER_DATA') {
    throw new Error('Confirmacao textual invalida. Operacao abortada sem alteracoes.')
  }

  if (!email || !password) {
    throw new Error('E-mail e senha sao obrigatorios para autenticar owner de producao.')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const login = await client.auth.signInWithPassword({ email, password })
  if (login.error || !login.data?.user?.id) {
    throw new Error(`Falha de autenticacao: ${login.error?.message || 'credenciais invalidas'}`)
  }

  const authUser = login.data.user
  const ownerId = authUser.id
  if (!ownerId) throw new Error('Nao foi possivel determinar auth.uid().')
  if (authUser.is_anonymous) throw new Error('Usuario anonimo nao pode operar reset de producao.')

  const scopeCheck = {
    project_ref: projectRefFromUrl(supabaseUrl),
    auth_uid_masked: mask(ownerId),
    environment_scope: envScope,
    mode: 'supabase',
    restricted_to_authenticated_owner: true,
  }

  const rowsBefore = await fetchOwnerRows(client, ownerId, envScope)
  const inventoryBefore = buildInventory(rowsBefore)

  const backupFullPath = path.join(outputDir, 'backup-full-owner-scope.json')
  const inventoryBeforePath = path.join(outputDir, 'inventory-before.json')
  const keyReportBeforePath = path.join(outputDir, 'storage-key-report-before.json')

  writeJson(backupFullPath, {
    generatedAt: new Date().toISOString(),
    scope: scopeCheck,
    owner: {
      owner_id_masked: mask(ownerId),
      owner_email_masked: mask(email),
    },
    rows: rowsBefore.map((row) => ({
      ...row,
      payload: parseJsonSafe(row.payload_json),
    })),
  })

  writeJson(inventoryBeforePath, {
    generatedAt: new Date().toISOString(),
    scope: scopeCheck,
    inventory: inventoryBefore,
  })

  writeJson(keyReportBeforePath, {
    generatedAt: new Date().toISOString(),
    scope: scopeCheck,
    storage_keys: inventoryBefore.byKey,
  })

  const { error: deleteError } = await client
    .schema(SUPABASE_SCHEMA)
    .from(SUPABASE_TABLE)
    .delete()
    .eq('owner_id', ownerId)
    .eq('environment_scope', envScope)

  if (deleteError) {
    throw new Error(`Falha ao zerar dados de negocio do owner: ${deleteError.message || 'erro desconhecido'}`)
  }

  const rowsAfter = await fetchOwnerRows(client, ownerId, envScope)
  const inventoryAfter = buildInventory(rowsAfter)

  const inventoryAfterPath = path.join(outputDir, 'inventory-after.json')
  const keyReportAfterPath = path.join(outputDir, 'storage-key-report-after.json')
  const resetReportPath = path.join(outputDir, 'reset-report.json')

  writeJson(inventoryAfterPath, {
    generatedAt: new Date().toISOString(),
    scope: scopeCheck,
    inventory: inventoryAfter,
  })

  writeJson(keyReportAfterPath, {
    generatedAt: new Date().toISOString(),
    scope: scopeCheck,
    storage_keys: inventoryAfter.byKey,
  })

  writeJson(resetReportPath, {
    generatedAt: new Date().toISOString(),
    scope: scopeCheck,
    owner: {
      owner_id_masked: mask(ownerId),
      owner_email_masked: mask(email),
    },
    deleted_storage_keys_count: rowsBefore.length,
    before: inventoryBefore,
    after: inventoryAfter,
    zero_validation: {
      patrimonios: 0,
      unidades: 0,
      locatarios: 0,
      contratos: 0,
      documentos: 0,
      lancamentos: 0,
      contas_financeiras: 0,
      rateios: 0,
      notificacoes: 0,
      auditoria: 0,
      observedAfterByModule: inventoryAfter.byModule,
    },
  })

  console.log(JSON.stringify({
    ok: true,
    scope: scopeCheck,
    owner_masked: mask(ownerId),
    files: {
      backupFull: backupFullPath,
      inventoryBefore: inventoryBeforePath,
      keyReportBefore: keyReportBeforePath,
      inventoryAfter: inventoryAfterPath,
      keyReportAfter: keyReportAfterPath,
      resetReport: resetReportPath,
    },
    counts: {
      before: inventoryBefore.byModule,
      after: inventoryAfter.byModule,
    },
  }, null, 2))
}

run().catch((error) => {
  console.error(`Falha no reset de producao: ${error.message || String(error)}`)
  process.exitCode = 1
})
