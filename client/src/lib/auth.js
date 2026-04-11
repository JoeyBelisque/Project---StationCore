import { fetchJson } from './api'

const STORAGE_KEY = 'stationcore.auth.session'

export function getStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function getStoredUser() {
  return getStoredSession()?.user ?? null
}

export function getAuthToken() {
  return getStoredSession()?.token ?? null
}

export function saveUserSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearUserSession() {
  localStorage.removeItem(STORAGE_KEY)
}

async function loginWithApi(email, senha) {
  return fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  })
}

export async function login(email, senha) {
  const payload = await loginWithApi(email, senha)
  const usuario = payload?.usuario ?? payload?.user ?? null
  const token = payload?.token ?? null
  if (!usuario || !token) throw new Error('Resposta de login inválida.')
  return { usuario, token }
}
