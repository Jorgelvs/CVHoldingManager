import { getSupabaseClient, setSupabaseSessionUser } from '../../../infrastructure/supabase/client.js'

function normalizeAuthError(error) {
  const message = String(error?.message || '')
  if (!message) return 'Falha ao autenticar no Supabase.'

  if (/invalid login credentials/i.test(message)) {
    return 'E-mail ou senha invalidos.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirme o e-mail antes de entrar.'
  }
  if (/network/i.test(message) || /fetch/i.test(message)) {
    return 'Nao foi possivel conectar ao Supabase. Verifique sua rede e tente novamente.'
  }
  return message
}

export async function getInitialSupabaseSession() {
  const client = getSupabaseClient()
  if (!client) {
    setSupabaseSessionUser(null)
    return { session: null, user: null, error: 'Supabase indisponivel.' }
  }

  const { data, error } = await client.auth.getSession()
  const session = data?.session || null
  const user = session?.user || null
  setSupabaseSessionUser(user)

  return {
    session,
    user,
    error: error ? normalizeAuthError(error) : null,
  }
}

export async function signInWithEmailAndPassword(email, password) {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: 'Supabase indisponivel no momento.' }
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false, error: normalizeAuthError(error) }
  }

  const session = data?.session || null
  const user = session?.user || null
  setSupabaseSessionUser(user)
  return { ok: true, session, user, error: null }
}

export async function signOutFromSupabase() {
  const client = getSupabaseClient()
  if (!client) {
    setSupabaseSessionUser(null)
    return { ok: false, error: 'Supabase indisponivel no momento.' }
  }

  const { error } = await client.auth.signOut()
  if (error) {
    return { ok: false, error: normalizeAuthError(error) }
  }

  setSupabaseSessionUser(null)
  return { ok: true, error: null }
}

export async function requestPasswordResetForEmail(email, redirectTo) {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: 'Supabase indisponivel no momento.' }
  }

  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) {
    return { ok: false, error: normalizeAuthError(error) }
  }

  return { ok: true, error: null }
}

export async function updateSupabaseUserPassword(password) {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: 'Supabase indisponivel no momento.' }
  }

  const { data, error } = await client.auth.updateUser({ password })
  if (error) {
    return { ok: false, error: normalizeAuthError(error) }
  }

  const user = data?.user || null
  setSupabaseSessionUser(user)
  return { ok: true, user, error: null }
}

export function subscribeToSupabaseAuthChanges(onChange) {
  const client = getSupabaseClient()
  if (!client || typeof onChange !== 'function') {
    return () => {}
  }

  const { data } = client.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null
    setSupabaseSessionUser(user)
    onChange({ event, session: session || null, user })
  })

  return () => {
    data?.subscription?.unsubscribe?.()
  }
}
