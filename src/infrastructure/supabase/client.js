import { createClient } from '@supabase/supabase-js'

let cachedClient = null
const INSTANCE_ID_KEY = 'cvholding_supabase_instance_id'
let cachedSessionUser = null

function generateInstanceId() {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `inst-${Date.now()}-${suffix}`
}

export function getSupabaseInstanceId() {
  try {
    const current = localStorage.getItem(INSTANCE_ID_KEY)
    if (current) return current
    const created = generateInstanceId()
    localStorage.setItem(INSTANCE_ID_KEY, created)
    return created
  } catch {
    return 'inst-fallback'
  }
}

// Fonte única da verdade para "isto é produção": deriva exclusivamente de
// VITE_SUPABASE_ENV_SCOPE. Antes, homologationOnly vinha de uma segunda
// variável independente (VITE_SUPABASE_HOMOLOGATION_ONLY) que podia ficar
// dessincronizada do scope (ex.: alguém define ENV_SCOPE=production e
// esquece de também setar HOMOLOGATION_ONLY=false) — nesse caso o app
// silenciosamente liberava acesso sem login e gravava sob o owner
// compartilhado anon-homolog mesmo rotulado como "produção". Eliminado:
// agora não existe combinação possível de variáveis que produza esse
// estado inconsistente.
export function getSupabaseConfig() {
  const environmentScope = import.meta.env.VITE_SUPABASE_ENV_SCOPE || 'homolog-default'
  const productionScope = environmentScope === 'production'
  const homologationOnly = !productionScope
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    environmentScope,
    ownerId: import.meta.env.VITE_SUPABASE_OWNER_ID || 'anon-homolog',
    homologationOnly,
    productionScope,
  }
}

export function setSupabaseSessionUser(user) {
  cachedSessionUser = user || null
}

export function getSupabaseSessionUser() {
  return cachedSessionUser
}

export function getSupabaseOwnerId() {
  const config = getSupabaseConfig()
  if (config.homologationOnly) {
    return config.ownerId || 'anon-homolog'
  }
  return cachedSessionUser?.id || ''
}

export function getSupabaseDataScope() {
  const config = getSupabaseConfig()
  const ownerId = getSupabaseOwnerId()
  const requiresAuth = !config.homologationOnly
  return {
    environmentScope: config.environmentScope,
    ownerId,
    instanceId: getSupabaseInstanceId(),
    requiresAuth,
    hasAuthenticatedOwner: Boolean(ownerId),
  }
}

export function isSupabaseHomologationOnly() {
  return Boolean(getSupabaseConfig().homologationOnly)
}

export function isSupabaseProductionScope() {
  return Boolean(getSupabaseConfig().productionScope)
}

export function isSupabaseAuthRequired() {
  const config = getSupabaseConfig()
  return !config.homologationOnly
}

export function getSupabaseAccessState() {
  const scope = getSupabaseDataScope()
  return {
    canAccessData: !scope.requiresAuth || scope.hasAuthenticatedOwner,
    reason: (!scope.requiresAuth || scope.hasAuthenticatedOwner)
      ? ''
      : 'Sessao autenticada obrigatoria para operar no Supabase em producao.',
    scope,
  }
}

export function isSupabaseConfigured() {
  const config = getSupabaseConfig()
  return Boolean(config.url && config.anonKey)
}

export function getSupabaseClient() {
  if (cachedClient) return cachedClient

  const config = getSupabaseConfig()
  if (!config.url || !config.anonKey) {
    return null
  }

  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return cachedClient
}

export async function syncSupabaseSessionFromAuth() {
  const client = getSupabaseClient()
  if (!client) {
    setSupabaseSessionUser(null)
    return { user: null, error: 'Cliente Supabase nao configurado.' }
  }

  const { data, error } = await client.auth.getSession()
  const sessionUser = data?.session?.user || null
  setSupabaseSessionUser(sessionUser)

  return {
    user: sessionUser,
    error: error?.message || null,
  }
}
