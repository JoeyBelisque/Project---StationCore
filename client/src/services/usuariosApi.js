import { getStoredToken } from '../lib/auth'

const API_URL = 'http://localhost:3000/usuarios'

async function request(path = '', options = {}) {
  const token = getStoredToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição')
  return data
}

export const listarUsuarios = () => request('/')
export const criarUsuario = (body) => request('/', { method: 'POST', body: JSON.stringify(body) })
export const atualizarUsuario = (id, body) => request(`/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const removerUsuario = (id) => request(`/${id}`, { method: 'DELETE' })
