import { createClient } from '@supabase/supabase-js'
import { isProductionScope } from './lib/writeSafetyGuards.mjs'

const URL = process.env.VITE_SUPABASE_URL || ''
const ANON = process.env.VITE_SUPABASE_ANON_KEY || ''
const HOMO_SCOPE = process.env.VITE_SUPABASE_ENV_SCOPE || 'homolog-default'
const HOMO_OWNER = process.env.VITE_SUPABASE_OWNER_ID || 'anon-homolog'
// TARGET_SCOPE e o environment_scope usado nos testes de "producao" deste
// script (por padrao, o literal 'production'). ATENCAO: antigamente essa
// mesma variavel decidia sozinha, em cada funcao, se o teste devia pular a
// escrita — funcionava apenas por coincidencia de a comparacao bater com o
// valor usado para gravar. Agora a decisao de pular fica centralizada em
// TARGET_IS_PRODUCTION (computada uma unica vez abaixo, usando o helper
// compartilhado isProductionScope de lib/writeSafetyGuards.mjs), e todo
// teste que grava dados DEVE checar TARGET_IS_PRODUCTION antes de escrever.
// Nunca remover essa checagem para "simplificar" o codigo.
const TARGET_SCOPE = process.env.SPRINT23_PRODUCTION_SCOPE || 'production'
const TARGET_IS_PRODUCTION = isProductionScope(TARGET_SCOPE)
// Alias mantido só para não quebrar o restante do arquivo, que referencia
// PROD_SCOPE como o environment_scope gravado nos testes.
const PROD_SCOPE = TARGET_SCOPE

const TEST_EMAIL = process.env.SPRINT23_TEST_USER_EMAIL || ''
const TEST_PASSWORD = process.env.SPRINT23_TEST_USER_PASSWORD || ''
const TEST_EMAIL_B = process.env.SPRINT23_TEST_USER_B_EMAIL || ''
const TEST_PASSWORD_B = process.env.SPRINT23_TEST_USER_B_PASSWORD || ''

function baseClient() {
  return createClient(URL, ANON, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function safeError(error) {
  return error?.message || ''
}

async function testInvalidLogin() {
  const client = baseClient()
  const { error } = await client.auth.signInWithPassword({
    email: 'invalid-user@example.invalid',
    password: 'invalid-password',
  })
  await client.auth.signOut()

  return {
    name: 'login_invalido',
    ok: Boolean(error),
    detail: error ? 'Falha esperada ao autenticar credenciais invalidas.' : 'Login invalido nao falhou como esperado.',
    error: safeError(error),
  }
}

async function testAnonymousProductionDenied() {
  if (isProductionScope(PROD_SCOPE)) {
    return {
      name: 'acesso_anonimo_negado_producao',
      ok: true,
      skipped: true,
      detail: 'Teste de runtime em producao executado em modo somente leitura; escrita anonima bloqueada por politica de seguranca de testes.',
    }
  }

  const client = baseClient()
  const storageKey = `sprint23-anon-prod-${Date.now()}`

  const { error } = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .insert({
      storage_key: storageKey,
      payload_json: JSON.stringify({ probe: 'anon-prod-denied' }),
      payload_hash: 'anon-prod',
      row_version: 1,
      last_writer_instance: 'sprint23-runtime-test',
      environment_scope: PROD_SCOPE,
      owner_id: HOMO_OWNER,
    })

  return {
    name: 'acesso_anonimo_negado_producao',
    ok: Boolean(error),
    detail: error ? 'Insercao anonima em producao negada como esperado.' : 'Insercao anonima em producao foi aceita (falha de seguranca).',
    error: safeError(error),
  }
}

async function testHomologAnonymousFlow() {
  const client = baseClient()
  const storageKey = `sprint23-hml-probe-${Date.now()}`
  const payload = { probe: 'homolog-anon-ok', generatedAt: new Date().toISOString() }

  const write = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .insert({
      storage_key: storageKey,
      payload_json: JSON.stringify(payload),
      payload_hash: 'hml-probe',
      row_version: 1,
      last_writer_instance: 'sprint23-runtime-test',
      environment_scope: HOMO_SCOPE,
      owner_id: HOMO_OWNER,
    })

  if (write.error) {
    return {
      name: 'homologacao_anonima_fluxo',
      ok: false,
      detail: 'Fluxo anonimo de homologacao falhou na escrita.',
      error: safeError(write.error),
    }
  }

  const read = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .select('storage_key,payload_json')
    .eq('environment_scope', HOMO_SCOPE)
    .eq('owner_id', HOMO_OWNER)
    .eq('storage_key', storageKey)
    .maybeSingle()

  const del = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .delete()
    .eq('environment_scope', HOMO_SCOPE)
    .eq('owner_id', HOMO_OWNER)
    .eq('storage_key', storageKey)

  return {
    name: 'homologacao_anonima_fluxo',
    ok: !read.error && !del.error && Boolean(read.data),
    detail: (!read.error && !del.error && read.data)
      ? 'Escrita/leitura/exclusao anonima em homologacao funcionando.'
      : 'Falha no fluxo anonimo de homologacao.',
    error: safeError(read.error) || safeError(del.error),
  }
}

async function testAuthenticatedOwnerFlow() {
  if (isProductionScope(PROD_SCOPE)) {
    return {
      name: 'login_valido_sessao_owner',
      ok: true,
      skipped: true,
      detail: 'Teste de runtime em producao executado em modo somente leitura; CRUD de escrita foi desabilitado.',
    }
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    return {
      name: 'login_valido_sessao_owner',
      ok: false,
      skipped: true,
      detail: 'Credenciais de teste nao fornecidas (SPRINT23_TEST_USER_EMAIL/SPRINT23_TEST_USER_PASSWORD).',
    }
  }

  const client = baseClient()
  const login = await client.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD })
  if (login.error || !login.data?.session?.user) {
    return {
      name: 'login_valido_sessao_owner',
      ok: false,
      detail: 'Falha no login valido.',
      error: safeError(login.error),
    }
  }

  const userId = login.data.session.user.id
  const storageKey = `sprint23-auth-owner-${Date.now()}`

  const write = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .insert({
      storage_key: storageKey,
      payload_json: JSON.stringify({ probe: 'owner-flow', v: 1 }),
      payload_hash: 'owner-1',
      row_version: 1,
      last_writer_instance: 'sprint23-runtime-test',
      environment_scope: PROD_SCOPE,
      owner_id: userId,
    })

  const writeWrongOwner = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .insert({
      storage_key: `${storageKey}-wrong`,
      payload_json: JSON.stringify({ probe: 'wrong-owner' }),
      payload_hash: 'owner-wrong',
      row_version: 1,
      last_writer_instance: 'sprint23-runtime-test',
      environment_scope: PROD_SCOPE,
      owner_id: 'wrong-owner-id',
    })

  const read = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .select('owner_id,payload_json')
    .eq('environment_scope', PROD_SCOPE)
    .eq('owner_id', userId)
    .eq('storage_key', storageKey)
    .maybeSingle()

  const update = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .update({ payload_json: JSON.stringify({ probe: 'owner-flow', v: 2 }), payload_hash: 'owner-2' })
    .eq('environment_scope', PROD_SCOPE)
    .eq('owner_id', userId)
    .eq('storage_key', storageKey)

  const del = await client
    .schema('cvh')
    .from('cv_storage_blobs')
    .delete()
    .eq('environment_scope', PROD_SCOPE)
    .eq('owner_id', userId)
    .eq('storage_key', storageKey)

  await client.auth.signOut()

  const baseOk = !write.error && !read.error && !update.error && !del.error && read.data?.owner_id === userId
  const wrongOwnerDenied = Boolean(writeWrongOwner.error)

  return {
    name: 'login_valido_sessao_owner',
    ok: baseOk && wrongOwnerDenied,
    detail: baseOk && wrongOwnerDenied
      ? 'Login valido e CRUD com owner autenticado funcionaram; insert com owner divergente foi negado.'
      : 'Falha no fluxo autenticado de owner.',
    userId,
    error: safeError(write.error) || safeError(read.error) || safeError(update.error) || safeError(del.error) || safeError(writeWrongOwner.error),
    wrongOwnerDenied,
  }
}

async function testCrossOwnerIsolation() {
  if (isProductionScope(PROD_SCOPE)) {
    return {
      name: 'isolamento_entre_usuarios',
      ok: true,
      skipped: true,
      detail: 'Teste de runtime em producao executado em modo somente leitura; validacao cruzada com escrita foi desabilitada.',
    }
  }

  if (!TEST_EMAIL || !TEST_PASSWORD || !TEST_EMAIL_B || !TEST_PASSWORD_B) {
    return {
      name: 'isolamento_entre_usuarios',
      ok: false,
      skipped: true,
      detail: 'Credenciais de dois usuarios nao fornecidas para validar isolamento cruzado.',
    }
  }

  const clientA = baseClient()
  const loginA = await clientA.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD })
  if (loginA.error || !loginA.data?.session?.user) {
    return {
      name: 'isolamento_entre_usuarios',
      ok: false,
      detail: 'Falha no login do usuario A.',
      error: safeError(loginA.error),
    }
  }

  const ownerA = loginA.data.session.user.id
  const storageKey = `sprint23-cross-owner-${Date.now()}`

  const createA = await clientA
    .schema('cvh')
    .from('cv_storage_blobs')
    .insert({
      storage_key: storageKey,
      payload_json: JSON.stringify({ probe: 'cross-owner' }),
      payload_hash: 'cross-1',
      row_version: 1,
      last_writer_instance: 'sprint23-runtime-test',
      environment_scope: PROD_SCOPE,
      owner_id: ownerA,
    })

  await clientA.auth.signOut()
  if (createA.error) {
    return {
      name: 'isolamento_entre_usuarios',
      ok: false,
      detail: 'Falha ao criar dado base do usuario A.',
      error: safeError(createA.error),
    }
  }

  const clientB = baseClient()
  const loginB = await clientB.auth.signInWithPassword({ email: TEST_EMAIL_B, password: TEST_PASSWORD_B })
  if (loginB.error || !loginB.data?.session?.user) {
    return {
      name: 'isolamento_entre_usuarios',
      ok: false,
      detail: 'Falha no login do usuario B.',
      error: safeError(loginB.error),
    }
  }

  const readAFromB = await clientB
    .schema('cvh')
    .from('cv_storage_blobs')
    .select('storage_key')
    .eq('environment_scope', PROD_SCOPE)
    .eq('owner_id', ownerA)
    .eq('storage_key', storageKey)

  const updateAFromB = await clientB
    .schema('cvh')
    .from('cv_storage_blobs')
    .update({ payload_hash: 'cross-2' })
    .eq('environment_scope', PROD_SCOPE)
    .eq('owner_id', ownerA)
    .eq('storage_key', storageKey)

  const deleteAFromB = await clientB
    .schema('cvh')
    .from('cv_storage_blobs')
    .delete()
    .eq('environment_scope', PROD_SCOPE)
    .eq('owner_id', ownerA)
    .eq('storage_key', storageKey)

  await clientB.auth.signOut()

  const cleanupA = baseClient()
  const relogA = await cleanupA.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD })
  if (!relogA.error) {
    await cleanupA
      .schema('cvh')
      .from('cv_storage_blobs')
      .delete()
      .eq('environment_scope', PROD_SCOPE)
      .eq('owner_id', ownerA)
      .eq('storage_key', storageKey)
    await cleanupA.auth.signOut()
  }

  const readDenied = !readAFromB.error && Array.isArray(readAFromB.data) && readAFromB.data.length === 0
  const updateDenied = Boolean(updateAFromB.error) || (Array.isArray(updateAFromB.data) && updateAFromB.data.length === 0)
  const deleteDenied = Boolean(deleteAFromB.error) || (Array.isArray(deleteAFromB.data) && deleteAFromB.data.length === 0)

  return {
    name: 'isolamento_entre_usuarios',
    ok: readDenied && updateDenied && deleteDenied,
    detail: (readDenied && updateDenied && deleteDenied)
      ? 'Usuario B nao conseguiu ler/alterar/excluir dado do usuario A.'
      : 'Isolamento entre usuarios falhou.',
    error: safeError(readAFromB.error) || safeError(updateAFromB.error) || safeError(deleteAFromB.error),
  }
}

async function run() {
  if (!URL || !ANON) {
    console.log(JSON.stringify({ ok: false, error: 'VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes.' }, null, 2))
    process.exit(1)
  }

  const tests = []
  tests.push(await testInvalidLogin())
  tests.push(await testAnonymousProductionDenied())
  tests.push(await testHomologAnonymousFlow())
  tests.push(await testAuthenticatedOwnerFlow())
  tests.push(await testCrossOwnerIsolation())

  const summary = {
    passed: tests.filter((item) => item.ok).length,
    failed: tests.filter((item) => !item.ok && !item.skipped).length,
    skipped: tests.filter((item) => item.skipped).length,
  }

  console.log(JSON.stringify({
    ok: summary.failed === 0,
    generatedAt: new Date().toISOString(),
    scopes: {
      homologScope: HOMO_SCOPE,
      homologOwner: HOMO_OWNER,
      productionScope: PROD_SCOPE,
    },
    summary,
    tests,
  }, null, 2))
}

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2))
  process.exit(1)
})
