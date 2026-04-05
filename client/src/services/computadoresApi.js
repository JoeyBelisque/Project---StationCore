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
