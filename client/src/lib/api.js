/**
 * Cliente HTTP partilhado pelo front.
 *
 * Em desenvolvimento, getApiBase() devolve '/api' e o Vite (vite.config.js)
 * encaminha para http://localhost:3000 sem o prefixo /api — evita CORS no browser.
 *
 * Em produção, define VITE_API_URL apontando para o domínio real da API.
 */
const AUTH_STORAGE_KEY = 'stationcore.auth.session'

function getAuthTokenFromStorage() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.token ?? null
  } catch {
    return null
  }
}

function clearSessionFromStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getApiBase() {
  const env = import.meta.env.VITE_API_URL
  if (env) return env.replace(/\/$/, '')
  return '/api'
}

/** fetch + JSON: trata erros HTTP como exceção; 204 → sem corpo JSON. */
export async function fetchJson(path, options = {}) {
  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`
  const token = getAuthTokenFromStorage()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, {
    headers,
    ...options,
  })
  if (!res.ok) {
    if (res.status === 401) {
      clearSessionFromStorage()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}
