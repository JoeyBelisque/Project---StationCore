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

    const data = await response.json().catch(() => null)
    
    if (!data) {
      throw new Error(`Resposta inválida do servidor: ${response.status}`)
    }

    // Se for erro de validação (400), retornamos o corpo para o componente tratar
    if (response.status === 400 && !data.ok && data.errors) {
      return data
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

    const data = await response.json().catch(() => null)
    
    if (!data) {
      throw new Error(`Resposta inválida do servidor: ${response.status}`)
    }

    // Se for erro de validação (400), retornamos o corpo para o componente tratar
    if (response.status === 400 && !data.ok && data.errors) {
      console.warn('[Import] Validação falhou, retornando erros detalhados:', data.errors);
      return data
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

export async function baixarTemplate(tipo) {
  const response = await fetch(`${getApiBase()}/importacao/template/${tipo}`, {
    headers: getAuthHeader(),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Erro ao baixar template')
  }

  const blob = await response.blob()
  const filenames = {
    headsets: 'template_headsets.xlsx',
    computadores: 'template_computadores.xlsx',
    completo: 'template_importacao.xlsx',
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filenames[tipo] || 'template.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
