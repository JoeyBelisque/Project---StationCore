import { getApiBase } from '../lib/api'

function getAuthHeader() {
  try {
    const token = localStorage.getItem('stationcore.auth.session')
    if (!token) return {}
    const session = JSON.parse(token)
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
  } catch {
    return {}
  }
}

export async function importarHeadsets(file, modo = 'validar') {
  const formData = new FormData()
  formData.append('arquivo', file)

  try {
    const response = await fetch(`${getApiBase()}/importacao/headsets?modo=${modo}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      console.error('Erro ao parsear JSON:', e)
      throw new Error(`Resposta inválida do servidor: ${response.statusText}`)
    }

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || 'Erro ao processar headsets')
      error.details = data
      throw error
    }

    return data
  } catch (err) {
    console.error('Erro na requisição de headsets:', err)
    throw err
  }
}

export async function importarComputadores(file, modo = 'validar') {
  const formData = new FormData()
  formData.append('arquivo', file)

  try {
    const response = await fetch(`${getApiBase()}/importacao/computadores?modo=${modo}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      console.error('Erro ao parsear JSON:', e)
      throw new Error(`Resposta inválida do servidor: ${response.statusText}`)
    }

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || 'Erro ao processar computadores')
      error.details = data
      throw error
    }

    return data
  } catch (err) {
    console.error('Erro na requisição de computadores:', err)
    throw err
  }
}
