const KEY = 'stationcore_headsets_v1'

function loadRaw() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRaw(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function listarHeadsets() {
  return loadRaw()
}

export function salvarHeadset(item) {
  const items = loadRaw()
  const id = item.id || crypto.randomUUID()
  const next = { ...item, id, atualizadoEm: new Date().toISOString() }
  const idx = items.findIndex((h) => h.id === id)
  if (idx >= 0) items[idx] = next
  else items.unshift(next)
  saveRaw(items)
  return next
}

export function removerHeadset(id) {
  const items = loadRaw().filter((h) => h.id !== id)
  saveRaw(items)
}
