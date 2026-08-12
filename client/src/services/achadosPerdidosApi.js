import { fetchJson } from '../lib/api'

export async function listarAchadosPerdidos(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return fetchJson(`/achados-perdidos${query}`)
}

export async function listarAchadosPorLacre(lacre) {
  return fetchJson(`/achados-perdidos?lacre=${encodeURIComponent(lacre)}`)
}

export async function criarAchadoPerdido(body) {
  return fetchJson('/achados-perdidos', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function atualizarAchadoPerdido(id, body) {
  return fetchJson(`/achados-perdidos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
