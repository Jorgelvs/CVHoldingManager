import {
  clearPersistenceErrorFlag,
  getRuntimePersistenceState,
  hasRepositoryValue,
  readRepositoryValue,
  removeRepositoryValue,
  waitForPendingPersistenceWrites,
  writeRepositoryValue,
} from '../infrastructure/persistence/persistenceGateway.js'

const loggedReadErrors = new Set()
const loggedWriteErrors = new Set()

function logReadErrorOnce(key, error) {
  const tag = `read:${key}`
  if (loggedReadErrors.has(tag)) return
  loggedReadErrors.add(tag)
  console.error('[localRepository] Falha ao ler dados do armazenamento local.', {
    key,
    error: error instanceof Error ? error.message : String(error),
  })
}

function logWriteErrorOnce(operation, key, error) {
  const tag = `${operation}:${key}`
  if (loggedWriteErrors.has(tag)) return
  loggedWriteErrors.add(tag)
  console.error('[localRepository] Falha de persistencia no armazenamento local.', {
    operation,
    key,
    error: error instanceof Error ? error.message : String(error),
  })
}

export function get(key, defaultValue) {
  try {
    return readRepositoryValue(key, defaultValue)
  } catch (error) {
    logReadErrorOnce(key, error)
    return defaultValue
  }
}

export function set(key, value) {
  try {
    return writeRepositoryValue(key, value)
  } catch (error) {
    logWriteErrorOnce('set', key, error)
    return false
  }
}

export function remove(key) {
  try {
    return removeRepositoryValue(key)
  } catch (error) {
    logWriteErrorOnce('remove', key, error)
    return false
  }
}

export function exists(key) {
  try {
    return hasRepositoryValue(key)
  } catch (error) {
    logReadErrorOnce(key, error)
    return false
  }
}

export function getRepositoryRuntimeState() {
  return getRuntimePersistenceState()
}

export async function waitForRepositoryFlush() {
  await waitForPendingPersistenceWrites()
}

export function clearRepositoryErrorFlag() {
  clearPersistenceErrorFlag()
}
