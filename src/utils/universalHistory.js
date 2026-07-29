const STORAGE_KEY = 'cvholding_universal_history'

export function listHistory(limit = 8) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, limit)
  } catch {
    return []
  }
}

export function pushHistory(item) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    parsed.unshift(item)
    const unique = []
    const seen = new Set()
    for (const it of parsed) {
      if (seen.has(it.text)) continue
      seen.add(it.text)
      unique.push(it)
      if (unique.length >= 20) break
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
  } catch {
    // noop
  }
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}

export default { listHistory, pushHistory, clearHistory }
