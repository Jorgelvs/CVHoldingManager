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
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue

    try {
      return JSON.parse(raw)
    } catch (error) {
      logReadErrorOnce(key, error)
      return defaultValue
    }
  } catch (error) {
    logReadErrorOnce(key, error)
    return defaultValue
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    logWriteErrorOnce('set', key, error)
    return false
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    logWriteErrorOnce('remove', key, error)
    return false
  }
}

export function exists(key) {
  try {
    return localStorage.getItem(key) !== null
  } catch (error) {
    logReadErrorOnce(key, error)
    return false
  }
}
