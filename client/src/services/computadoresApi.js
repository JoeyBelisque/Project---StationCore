/** Funções finas: uma por endpoint; o trabalho pesado está em lib/api.js. */
import { fetchJson } from '../lib/api'

export async function listarComputadores() {
  return fetchJson('/computadores')
}

export async function criarComputador(body) {
  return fetchJson('/computadores', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function atualizarComputador(id, body) {
  return fetchJson(`/computadores/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function trocarComputador(idOriginal, body) {
  return fetchJson(`/computadores/${encodeURIComponent(idOriginal)}/troca`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listarHistoricoComputador(id) {
  return fetchJson(`/computadores/${encodeURIComponent(id)}/historico`)
}

export async function removerComputador(id) {
  return fetchJson(`/computadores/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
