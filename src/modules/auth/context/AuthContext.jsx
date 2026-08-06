import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getPersistenceMode, setPersistenceMode } from '../../../infrastructure/persistence/modeService.js'
import { PERSISTENCE_EVENT_MODE_CHANGED } from '../../../infrastructure/persistence/persistenceConstants.js'
import { getSupabaseConfig, isSupabaseConfigured } from '../../../infrastructure/supabase/client.js'
import { bootstrapPersistence } from '../../../infrastructure/persistence/persistenceGateway.js'
import {
  getInitialSupabaseSession,
  requestPasswordResetForEmail,
  signInWithEmailAndPassword,
  signOutFromSupabase,
  subscribeToSupabaseAuthChanges,
  updateSupabaseUserPassword,
} from '../services/supabaseAuthService.js'

const AuthContext = createContext(null)
const PASSWORD_MIN_LENGTH = 8

function isRecoveryPath(pathname) {
  return pathname === '/redefinir-senha'
}

function buildPasswordRecoveryRedirectTo() {
  if (typeof window === 'undefined') return '/redefinir-senha'

  const isLocalDevPort = window.location.port === '5173'
  if (isLocalDevPort) {
    return 'http://localhost:5173/redefinir-senha'
  }

  return `${window.location.origin}/redefinir-senha`
}

function computeAuthRequired() {
  const config = getSupabaseConfig()

  return (
    config.environmentScope === 'production'
    && config.homologationOnly === false
  )
}

export function AuthProvider({ children }) {
  const [mode, setMode] = useState(() => getPersistenceMode())
  const [loadingSession, setLoadingSession] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [recoveryRequired, setRecoveryRequired] = useState(() => {
    if (typeof window === 'undefined') return false
    return isRecoveryPath(window.location.pathname)
  })
  const authRequired = useMemo(() => computeAuthRequired(), [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (authRequired) {
        setPersistenceMode('supabase')
        setMode(getPersistenceMode())
      }

      const result = await getInitialSupabaseSession()
      if (!mounted) return

      setSession(result.session)
      setUser(result.user)
      setError(result.error || '')
      setLoadingSession(false)
    }

    init()

    const unsubscribe = subscribeToSupabaseAuthChanges(({ event, session: nextSession, user: nextUser }) => {
      if (!mounted) return

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryRequired(true)
      } else if (event === 'SIGNED_OUT') {
        setRecoveryRequired(false)
      }

      setSession(nextSession)
      setUser(nextUser)
      if (getPersistenceMode() === 'supabase') {
        bootstrapPersistence()
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [authRequired])

  useEffect(() => {
    const syncMode = () => setMode(getPersistenceMode())
    window.addEventListener(PERSISTENCE_EVENT_MODE_CHANGED, syncMode)
    return () => window.removeEventListener(PERSISTENCE_EVENT_MODE_CHANGED, syncMode)
  }, [])

  useEffect(() => {
    if (authRequired && mode !== 'supabase') {
      setPersistenceMode('supabase')
      setMode(getPersistenceMode())
      return
    }

    if (mode === 'supabase') {
      bootstrapPersistence()
    }
  }, [authRequired, mode, user?.id])

  const login = async ({ email, password }) => {
    setError('')
    setAuthBusy(true)
    const result = await signInWithEmailAndPassword(email, password)
    setAuthBusy(false)

    if (!result.ok) {
      setError(result.error || 'Falha ao autenticar.')
      return result
    }

    setRecoveryRequired(false)

    if (authRequired) {
      setPersistenceMode('supabase')
      setMode(getPersistenceMode())
    }

    if (getPersistenceMode() === 'supabase') {
      await bootstrapPersistence()
    }

    setSession(result.session || null)
    setUser(result.user || null)
    return result
  }

  const sendPasswordRecovery = async (email) => {
    setError('')
    setAuthBusy(true)
    const result = await requestPasswordResetForEmail(email, buildPasswordRecoveryRedirectTo())
    setAuthBusy(false)

    if (!result.ok) {
      setError(result.error || 'Falha ao solicitar recuperacao de senha.')
      return result
    }

    return result
  }

  const saveNewPassword = async (password) => {
    setError('')

    if (String(password || '').length < PASSWORD_MIN_LENGTH) {
      const validationError = `A nova senha deve ter no minimo ${PASSWORD_MIN_LENGTH} caracteres.`
      setError(validationError)
      return { ok: false, error: validationError }
    }

    setAuthBusy(true)
    const updateResult = await updateSupabaseUserPassword(password)
    if (!updateResult.ok) {
      setAuthBusy(false)
      setError(updateResult.error || 'Falha ao atualizar senha.')
      return updateResult
    }

    await signOutFromSupabase()
    setAuthBusy(false)
    setRecoveryRequired(false)
    setSession(null)
    setUser(null)

    if (getPersistenceMode() === 'supabase') {
      await bootstrapPersistence()
    }

    return { ok: true, error: null }
  }

  const logout = async () => {
    setError('')
    setAuthBusy(true)
    const result = await signOutFromSupabase()
    setAuthBusy(false)

    if (!result.ok) {
      setError(result.error || 'Falha ao sair da sessao.')
      return result
    }

    setRecoveryRequired(false)

    if (authRequired) {
      setPersistenceMode('supabase')
      setMode(getPersistenceMode())
    }

    setSession(null)
    setUser(null)
    if (getPersistenceMode() === 'supabase') {
      await bootstrapPersistence()
    }
    return result
  }

  const value = {
    mode,
    authRequired,
    loadingSession,
    authBusy,
    isAuthenticated: Boolean(user),
    session,
    user,
    recoveryRequired,
    error,
    clearError: () => setError(''),
    login,
    sendPasswordRecovery,
    saveNewPassword,
    logout,
    supabaseConfigured: isSupabaseConfigured(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }
  return ctx
}
