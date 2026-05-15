import { useState } from 'react'
import * as XLSX from 'xlsx'
import { 
  FileDown, 
  Table as TableIcon, 
  Database, 
  Headphones, 
  Monitor, 
  Info,
  Loader2
} from 'lucide-react'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'

const STATUS_HEADSET = [
  { value: '', label: 'Todos os status' },
  { value: 'em_uso', label: 'Em uso' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'defeito', label: 'Com defeito' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reserva', label: 'Reservados' },
]

const STATUS_PC = [
  { value: '', label: 'Todos os status' },
  { value: 'em_uso', label: 'Em uso' },
  { value: 'manutencao', label: 'Em manutenção' },
  { value: 'inutilizavel', label: 'Inutilizáveis' },
  { value: 'estoque', label: 'Estoque' },
]

/**
 * Utilitário para gerar arquivo Excel (.xlsx)
 */
function baixarXLSX(dados, nomeAba, nomeArquivo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(dados)
  XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}

/**
 * Utilitário para gerar arquivo CSV
 */
function baixarCSV(dados, nomeArquivo) {
  const ws = XLSX.utils.json_to_sheet(dados)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Página de Exportação de Dados
 * Permite extrair relatórios customizados em formato XLSX ou CSV.
 */
export function ExportarPage() {
  const [hsStatus, setHsStatus] = useState('')
  const [pcStatus, setPcStatus] = useState('')
  const [loading, setLoading] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const hoje = () => new Date().toISOString().slice(0, 10)

  // Função mestre para exportação
  async function exportar(tipo, formato) {
    setLoading(`${tipo}-${formato}`)
    setFeedback(null)
    try {
      let dados = []
      let nomeArquivo = ''
      let nomeAba = ''

      if (tipo === 'headsets') {
        const rows = await listarHeadsets()
        dados = hsStatus ? rows.filter((r) => r.status === hsStatus) : rows
        nomeArquivo = `headsets${hsStatus ? '_' + hsStatus : ''}_${hoje()}`
        nomeAba = 'Headsets'
      } else if (tipo === 'computadores') {
        const rows = await listarComputadores()
        dados = pcStatus ? rows.filter((r) => r.status === pcStatus) : rows
        nomeArquivo = `computadores${pcStatus ? '_' + pcStatus : ''}_${hoje()}`
        nomeAba = 'Computadores'
      } else {
        const [hs, pcs] = await Promise.all([listarHeadsets(), listarComputadores()])
        if (formato === 'xlsx') {
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hs), 'Headsets')
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pcs), 'Computadores')
          XLSX.writeFile(wb, `stationcore_completo_${hoje()}.xlsx`)
          setFeedback({ tipo: 'success', msg: `${hs.length + pcs.length} registros exportados.` })
          return
        }
        dados = [...hs.map(r => ({ ...r, _tipo: 'headset' })), ...pcs.map(r => ({ ...r, _tipo: 'computador' }))]
        nomeArquivo = `stationcore_completo_${hoje()}`
        nomeAba = 'Geral'
      }

      if (dados.length === 0) {
        return setFeedback({ tipo: 'warning', msg: 'Nenhum dado encontrado com os filtros selecionados.' })
      }

      if (formato === 'xlsx') baixarXLSX(dados, nomeAba, nomeArquivo)
      else baixarCSV(dados, nomeArquivo)

      setFeedback({ tipo: 'success', msg: `${dados.length} registros exportados com sucesso.` })
    } catch {
      setFeedback({ tipo: 'error', msg: 'Falha ao buscar dados na API.' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="page-fade-in">
      <header className="page-header-premium">
        <h2 className="page-title">Exportar</h2>
        <p className="page-subtitle">Gere relatórios customizados e backups em Excel ou CSV.</p>
      </header>

      {/* Alertas de Feedback */}
      {feedback && (
        <div className={`badge ${feedback.tipo === 'success' ? 'badge-success' : feedback.tipo === 'warning' ? 'badge-warning' : 'badge-danger'} w-full`} style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          {feedback.msg}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Exportação de Headsets */}
        <section className="card">
          <h4 className="card-title"><Headphones size={18} /> Headsets</h4>
          <p className="muted small">Selecione um status específico para filtrar seu relatório.</p>
          <div style={{ marginTop: '1.25rem' }}>
            <label className="muted small">Filtro de Status</label>
            <select className="input w-full" style={{ marginTop: '0.5rem' }} value={hsStatus} onChange={e => setHsStatus(e.target.value)}>
              {STATUS_HEADSET.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="row gap" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-primary flex-1" disabled={!!loading} onClick={() => exportar('headsets', 'xlsx')}>
              {loading === 'headsets-xlsx' ? <Loader2 size={16} className="animate-spin" /> : <TableIcon size={16} />}
              Excel
            </button>
            <button className="btn btn-secondary flex-1" disabled={!!loading} onClick={() => exportar('headsets', 'csv')}>
              <FileDown size={16} /> CSV
            </button>
          </div>
        </section>

        {/* Exportação de Computadores */}
        <section className="card">
          <h4 className="card-title"><Monitor size={18} /> Computadores</h4>
          <p className="muted small">Gere planilhas detalhadas por PA e hostname.</p>
          <div style={{ marginTop: '1.25rem' }}>
            <label className="muted small">Filtro de Status</label>
            <select className="input w-full" style={{ marginTop: '0.5rem' }} value={pcStatus} onChange={e => setPcStatus(e.target.value)}>
              {STATUS_PC.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="row gap" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-primary flex-1" disabled={!!loading} onClick={() => exportar('computadores', 'xlsx')}>
              {loading === 'computadores-xlsx' ? <Loader2 size={16} className="animate-spin" /> : <TableIcon size={16} />}
              Excel
            </button>
            <button className="btn btn-secondary flex-1" disabled={!!loading} onClick={() => exportar('computadores', 'csv')}>
              <FileDown size={16} /> CSV
            </button>
          </div>
        </section>

        {/* Exportação Completa */}
        <section className="card">
          <h4 className="card-title"><Database size={18} /> Banco de Dados Completo</h4>
          <p className="muted small">Exporta todos os ativos (Headsets + PCs) em um único arquivo de backup.</p>
          <div className="row gap" style={{ marginTop: '2.5rem' }}>
            <button className="btn btn-primary w-full" disabled={!!loading} onClick={() => exportar('tudo', 'xlsx')}>
              {loading === 'tudo-xlsx' ? <Loader2 size={16} className="animate-spin" /> : <TableIcon size={16} />}
              Backup Full (Excel Multi-aba)
            </button>
          </div>
          <p className="small muted" style={{ marginTop: '1.5rem' }}>
            <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            O arquivo Excel conterá abas separadas para cada categoria de ativo.
          </p>
        </section>
      </div>
    </div>
  )
}
