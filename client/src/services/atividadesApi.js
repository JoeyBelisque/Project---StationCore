import { fetchJson } from '../lib/api'

/**
 * Tenta buscar atividades reais. Se falhar, gera um feed sintético baseado
 * nas últimas atualizações de headsets e computadores.
 */
export async function listarAtividades() {
  const possiblePaths = ['/atividades', '/logs/atividades', '/logs', '/historico', '/headsets/historico-recente']

      // 1. Tenta endpoints reais
  for (const path of possiblePaths) {
    try {
      const data = await fetchJson(path)
      if (Array.isArray(data)) {
        // Mapeia histórico específico para formato genérico de atividade
        return data.map(item => ({
          ...item,
          id: item.id,
          usuario: 'Sistema', // Logs de sistema não costumam ter user no db atual
          acao: item.acao || 'Atualização',
          descricao: item.observacao || `${item.acao} no campo ${item.campo}`,
          tipo: 'headset',
          lacre: item.lacre || ''
        }))
      }
      if (data && Array.isArray(data.atividades)) return data.atividades
    } catch { /* continua */ }
  }

  // 2. Fallback: Feed Sintético (Combina atualizações recentes de ativos)
  try {
    const [hs, pcs] = await Promise.all([
      fetchJson('/headsets').catch(() => []),
      fetchJson('/computadores').catch(() => [])
    ])

    const activities = []

    // Converte Headsets em eventos
    hs.forEach(h => {
      if (h.updated_at) {
        activities.push({
          id: `hs-${h.id}`,
          usuario: 'Sistema',
          acao: 'Atualização',
          descricao: `Headset ${h.lacre} alterado para ${h.status}.`,
          created_at: h.updated_at,
          tipo: 'headset'
        })
      }
    })

    // Converte Computadores em eventos
    pcs.forEach(p => {
      if (p.updated_at) {
        activities.push({
          id: `pc-${p.id}`,
          usuario: 'Sistema',
          acao: 'Manutenção',
          descricao: `Computador ${p.hostname || p.pa} com status ${p.status}.`,
          created_at: p.updated_at,
          tipo: 'computador'
        })
      }
    })

    // Ordena por data decrescente e pega os 15 mais recentes
    return activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15)
  } catch (err) {
    console.error('[Synthetic Feed] Erro ao gerar atividades:', err)
    return []
  }
}
