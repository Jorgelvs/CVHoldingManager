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

  // client.auth.signOut() tenta revogar a sessao no servidor por padrao, o
  // que faz uma chamada de rede. Se essa chamada ficar presa (rede
  // instavel, extensao de navegador bloqueando a requisicao, etc.), a
  // promise nunca resolve e o botao "Sair do sistema" fica travado em
  // "Saindo..." para sempre -- foi exatamente o sintoma reportado ("nao
  // deixa eu sair"). Para o usuario NUNCA ficar preso na tela, corre em
  // paralelo com um timeout: se o servidor nao responder a tempo, limpa a
  // sessao local mesmo assim (signOut com scope 'local' nao depende de
  // rede) e segue em frente. O usuario fica deslogado localmente de
  // qualquer forma, que e o que importa para a experiencia dele.
  const remoteSignOut = client.auth.signOut().then(
    (result) => ({ timedOut: false, error: result?.error || null }),
    (error) => ({ timedOut: false, error }),
  )
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve({ timedOut: true, error: null }), 4000)
  })

  const { timedOut, error } = await Promise.race([remoteSignOut, timeout])

  if (timedOut) {
    // Nao esperar mais pela resposta do servidor: forca o encerramento local
    // da sessao (sem chamada de rede) para garantir que o usuario saia.
    try {
      await client.auth.signOut({ scope: 'local' })
    } catch {
      // Mesmo se isso falhar, ainda assim tratamos como saida bem-sucedida
      // do ponto de vista do usuario -- ver comentario acima.
    }
  } else if (error) {
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
