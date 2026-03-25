/**
 * Base da API: em dev usa o proxy /api → backend na porta 3000.
 * Em produção, defina VITE_API_URL (ex.: https://api.suaempresa.com).
 */
export function getApiBase() {
  const env = import.meta.env.VITE_API_URL
  if (env) return env.replace(/\/$/, '')
  return '/api'
}

export async function fetchJson(path, options = {}) {
  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}
