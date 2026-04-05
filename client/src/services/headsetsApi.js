/** encodeURIComponent no id evita caracteres estranhos na URL (UUID é seguro, é hábito defensivo). */
import { fetchJson } from '../lib/api'

export async function listarHeadsets() {
  return fetchJson('/headsets')
}

export async function criarHeadset(body) {
  return fetchJson('/headsets', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function atualizarHeadset(id, body) {
  return fetchJson(`/headsets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function removerHeadset(id) {
  return fetchJson(`/headsets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
