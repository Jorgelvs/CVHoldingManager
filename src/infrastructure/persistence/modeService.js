import {
  PERSISTENCE_EVENT_MODE_CHANGED,
  PERSISTENCE_MODE_KEY,
  PERSISTENCE_MODES,
} from './persistenceConstants.js'

function isProductionSupabaseRequired() {
  const environmentScope = import.meta.env.VITE_SUPABASE_ENV_SCOPE || 'homolog-default'
  const homologationOnly = import.meta.env.VITE_SUPABASE_HOMOLOGATION_ONLY !== 'false'
  return environmentScope === 'production' && homologationOnly === false
}

function emitModeChanged(mode) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PERSISTENCE_EVENT_MODE_CHANGED, { detail: { mode } }),
  )
}

function forceSupabaseModeIfRequired() {
  if (!isProductionSupabaseRequired()) return null

  try {
    const current = localStorage.getItem(PERSISTENCE_MODE_KEY)
    if (current !== PERSISTENCE_MODES.SUPABASE) {
      localStorage.setItem(PERSISTENCE_MODE_KEY, PERSISTENCE_MODES.SUPABASE)
      emitModeChanged(PERSISTENCE_MODES.SUPABASE)
    }
  } catch {
    return PERSISTENCE_MODES.SUPABASE
  }

  return PERSISTENCE_MODES.SUPABASE
}

function normalizeMode(value) {
  return value === PERSISTENCE_MODES.SUPABASE ? PERSISTENCE_MODES.SUPABASE : PERSISTENCE_MODES.LOCAL
}

export function getPersistenceMode() {
  const forcedMode = forceSupabaseModeIfRequired()
  if (forcedMode) return forcedMode

  try {
    const value = localStorage.getItem(PERSISTENCE_MODE_KEY)
    return normalizeMode(value)
  } catch {
    return PERSISTENCE_MODES.LOCAL
  }
}

export function setPersistenceMode(mode) {
  const forcedMode = forceSupabaseModeIfRequired()
  if (forcedMode && normalizeMode(mode) !== PERSISTENCE_MODES.SUPABASE) {
    return false
  }

  const normalized = normalizeMode(mode)
  try {
    localStorage.setItem(PERSISTENCE_MODE_KEY, normalized)
    emitModeChanged(normalized)
    return true
  } catch {
    return false
  }
}

export function confirmAndSetPersistenceMode(mode, confirmFn = null) {
  if (isProductionSupabaseRequired() && normalizeMode(mode) !== PERSISTENCE_MODES.SUPABASE) {
    return {
      changed: false,
      mode: PERSISTENCE_MODES.SUPABASE,
      error: 'Modo Local desabilitado: em producao, a persistencia Supabase e obrigatoria.',
    }
  }

  const normalized = normalizeMode(mode)
  const atual = getPersistenceMode()
  if (normalized === atual) {
    return { changed: false, mode: atual }
  }

  const message = `Deseja trocar o modo de persistencia para ${normalized}? A aplicacao sera recarregada para carregar dados da origem selecionada.`
  const accepted = typeof confirmFn === 'function' ? Boolean(confirmFn(message)) : window.confirm(message)
  if (!accepted) {
    return { changed: false, mode: atual }
  }

  const ok = setPersistenceMode(normalized)
  if (!ok) {
    return { changed: false, mode: atual, error: 'Falha ao atualizar modo de persistencia.' }
  }

  return { changed: true, mode: normalized }
}

export function isSupabaseMode() {
  return getPersistenceMode() === PERSISTENCE_MODES.SUPABASE
}

export function isLocalModeSelectable() {
  return !isProductionSupabaseRequired()
}

export function enforceSupabaseModeOnStartup() {
  return forceSupabaseModeIfRequired() || getPersistenceMode()
}
