import { useState } from 'react'
import * as XLSX from 'xlsx'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'

const STATUS_HEADSET = [
  { value: '', label: 'Todos' },
  { value: 'em_uso', label: 'Em uso' },
  { value: 'reserva', label: 'Reservados' },
  { value: 'desligado', label: 'Desligados' },
  { value: 'troca_pendente', label: 'Troca pendente' },
]

const STATUS_PC = [
  { value: '', label: 'Todos' },
  { value: 'em_uso', label: 'Em uso' },
  { value: 'manutencao', label: 'Em manutenção' },
  { value: 'inutilizavel', label: 'Inutilizáveis' },
  { value: 'estoque', label: 'Estoque' },
]

function baixarXLSX(dados, nomeAba, nomeArquivo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(dados)
  XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}

function baixarCSV(dados, nomeArquivo) {
  const ws = XLSX.utils.json_to_sheet(dados)
  const csv = XLSX.utils.sheet_to_csv(ws)
  // Gera um download local sem precisar round-trip no backend.
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportarPage() {
  const [hsStatus, setHsStatus] = useState('')
  const [pcStatus, setPcStatus] = useState('')
  const [loading, setLoading] = useState(null)
  const [feedback, setFeedback] = useState(null)

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
        // Exportação "completa": no XLSX mantemos abas separadas,
        // no CSV unificamos e adicionamos o campo _tipo para diferenciar.
        const [hs, pcs] = await Promise.all([listarHeadsets(), listarComputadores()])
        if (formato === 'xlsx') {
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hs), 'Headsets')
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pcs), 'Computadores')
          XLSX.writeFile(wb, `stationcore_completo_${hoje()}.xlsx`)
          setFeedback({ tipo: 'ok', msg: `${hs.length + pcs.length} registros exportados com sucesso.` })
          return
        }
        dados = [
          ...hs.map((r) => ({ _tipo: 'headset', ...r })),
          ...pcs.map((r) => ({ _tipo: 'computador', ...r })),
        ]
        nomeArquivo = `stationcore_completo_${hoje()}`
        nomeAba = 'Dados'
      }

      if (dados.length === 0) {
        setFeedback({ tipo: 'warn', msg: 'Nenhum registro encontrado para os filtros selecionados.' })
        return
      }

      if (formato === 'xlsx') baixarXLSX(dados, nomeAba, nomeArquivo)
      else baixarCSV(dados, nomeArquivo)

      setFeedback({ tipo: 'ok', msg: `${dados.length} registros exportados com sucesso.` })
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao buscar dados da API. Verifique se o backend está online.' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Exportar</h2>
        <p className="muted">Baixe os dados do sistema em planilha Excel (.xlsx) ou CSV.</p>
      </div>

      {feedback && (
        <div className={`banner ${feedback.tipo === 'ok' ? 'success' : feedback.tipo === 'warn' ? 'warning' : 'error'}`} style={{ marginBottom: '1.5rem' }}>
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

        {/* ── Card Headsets ── */}
        <section className="card prose">
          <h3>🎧 Headsets</h3>
          <p className="muted small" style={{ marginBottom: '1rem' }}>Filtre por status antes de exportar, ou exporte todos de uma vez.</p>
          <label className="form-label">
            <span className="muted small">Filtrar por status</span>
            <select
              className="input"
              value={hsStatus}
              onChange={e => setHsStatus(e.target.value)}
              style={{ marginTop: '0.35rem' }}
            >
              {STATUS_HEADSET.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <div className="row gap" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn primary"
              disabled={!!loading}
              onClick={() => exportar('headsets', 'xlsx')}
            >
              {loading === 'headsets-xlsx' ? 'Exportando…' : '⬇ Excel (.xlsx)'}
            </button>
            <button
              className="btn"
              disabled={!!loading}
              onClick={() => exportar('headsets', 'csv')}
            >
              {loading === 'headsets-csv' ? 'Exportando…' : '⬇ CSV'}
            </button>
          </div>
        </section>

        {/* ── Card Computadores ── */}
        <section className="card prose">
          <h3>💻 Computadores</h3>
          <p className="muted small" style={{ marginBottom: '1rem' }}>Filtre por status antes de exportar, ou exporte todos de uma vez.</p>
          <label className="form-label">
            <span className="muted small">Filtrar por status</span>
            <select
              className="input"
              value={pcStatus}
              onChange={e => setPcStatus(e.target.value)}
              style={{ marginTop: '0.35rem' }}
            >
              {STATUS_PC.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <div className="row gap" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn primary"
              disabled={!!loading}
              onClick={() => exportar('computadores', 'xlsx')}
            >
              {loading === 'computadores-xlsx' ? 'Exportando…' : '⬇ Excel (.xlsx)'}
            </button>
            <button
              className="btn"
              disabled={!!loading}
              onClick={() => exportar('computadores', 'csv')}
            >
              {loading === 'computadores-csv' ? 'Exportando…' : '⬇ CSV'}
            </button>
          </div>
        </section>

        {/* ── Card Tudo ── */}
        <section className="card prose">
          <h3>📦 Exportação completa</h3>
          <p className="muted small" style={{ marginBottom: '1rem' }}>
            Exporta headsets e computadores juntos. No Excel, cada tipo fica em uma aba separada.
          </p>
          <div className="row gap" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn primary"
              disabled={!!loading}
              onClick={() => exportar('tudo', 'xlsx')}
            >
              {loading === 'tudo-xlsx' ? 'Exportando…' : '⬇ Excel completo'}
            </button>
            <button
              className="btn"
              disabled={!!loading}
              onClick={() => exportar('tudo', 'csv')}
            >
              {loading === 'tudo-csv' ? 'Exportando…' : '⬇ CSV completo'}
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}
