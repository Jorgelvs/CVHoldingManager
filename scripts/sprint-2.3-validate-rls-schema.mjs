import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const schemaPath = path.join(projectRoot, 'supabase', 'schema_cvholding.sql')
const outDir = path.join(projectRoot, 'backups', 'sprint-2.3')

function nowStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function parseTables(sql) {
  const rgx = /create table if not exists\s+cvh\.([a-z0-9_]+)/gi
  const names = new Set()
  let match = rgx.exec(sql)
  while (match) {
    names.add(match[1])
    match = rgx.exec(sql)
  }
  return Array.from(names)
}

function parsePolicies(sql) {
  const lines = sql.split('\n')
  const policies = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    const createMatch = line.match(/^create policy\s+([^\s]+)\s+on\s+cvh\.([a-z0-9_]+)\s*$/i)
    if (!createMatch) continue

    const policyName = createMatch[1]
    const table = createMatch[2]
    let block = line
    let j = i + 1
    while (j < lines.length) {
      block += `\n${lines[j]}`
      if (lines[j].trim().endsWith(';')) break
      j += 1
    }

    const forMatch = block.match(/\bfor\s+(all|select|insert|update|delete)\b/i)
    const kind = (forMatch?.[1] || '').toLowerCase()

    policies.push({
      policyName,
      table,
      kind,
      block,
      hasOwnerBinding: /owner_id\s*=\s*auth\.uid\(\)::text/i.test(block),
    })
  }

  return policies
}

function coverageForTable(table, policies) {
  const tablePolicies = policies.filter((item) => item.table === table)
  const kinds = new Set(tablePolicies.map((item) => item.kind))
  const hasAll = kinds.has('all')
  const operations = {
    select: hasAll || kinds.has('select'),
    insert: hasAll || kinds.has('insert'),
    update: hasAll || kinds.has('update'),
    delete: hasAll || kinds.has('delete'),
  }

  return {
    table,
    rlsEnabled: new RegExp(`alter table\\s+cvh\\.${table}\\s+enable row level security;`, 'i').test(sqlText),
    operations,
    hasOwnerBindingPolicy: tablePolicies.some((item) => item.hasOwnerBinding),
    policyNames: tablePolicies.map((item) => item.policyName),
  }
}

const sqlText = fs.readFileSync(schemaPath, 'utf8')
const tables = parseTables(sqlText)
const policies = parsePolicies(sqlText)
const tableReports = tables.map((table) => coverageForTable(table, policies))

const summary = {
  totalTables: tables.length,
  tablesWithRlsEnabled: tableReports.filter((item) => item.rlsEnabled).length,
  tablesWithFullCrudCoverage: tableReports.filter((item) => Object.values(item.operations).every(Boolean)).length,
  tablesWithOwnerBinding: tableReports.filter((item) => item.hasOwnerBindingPolicy).length,
}

const report = {
  generatedAt: new Date().toISOString(),
  schemaPath: 'supabase/schema_cvholding.sql',
  summary,
  tables: tableReports,
  notes: [
    'FOR ALL foi tratado como cobertura de SELECT/INSERT/UPDATE/DELETE.',
    'Validacao textual de owner binding considera a expressao owner_id = auth.uid()::text.',
  ],
}

fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, `rls-schema-validation-${nowStamp()}.json`)
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')

console.log(JSON.stringify({ ok: true, outPath: path.relative(projectRoot, outPath), summary }, null, 2))
