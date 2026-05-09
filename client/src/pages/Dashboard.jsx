import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'

export function Dashboard() {
  const [hsError, setHsError] = useState(null)
  const [pcError, setPcError] = useState(null)
  const [hsStats, setHsStats] = useState({})
  const [pcStats, setPcStats] = useState({})

  useEffect(() => {
    listarHeadsets()
      .then((rows) => {
        if (rows && Array.isArray(rows)) {
          setHsStats({
            total:      rows.length,
            emUso:      rows.filter(r => r.status === 'em_uso').length,
            estoque:    rows.filter(r => r.status === 'estoque').length,
            defeito:    rows.filter(r => r.status === 'defeito').length,
            manutencao: rows.filter(r => r.status === 'manutencao').length,
            reserva:    rows.filter(r => r.status === 'reserva').length,
            desligado:  rows.filter(r => r.status === 'desligado').length,
          })
        }
        setHsError(null)
      })
      .catch(() => {
        setHsError('API indisponível')
      })

    listarComputadores()
      .then((rows) => {
        if (rows && Array.isArray(rows)) {
          setPcStats({
            total:       rows.length,
            emUso:       rows.filter(r => r.status === 'em_uso').length,
            manutencao:  rows.filter(r => r.status === 'manutencao').length,
            inutilizavel:rows.filter(r => r.status === 'inutilizavel').length,
          })
        }
        setPcError(null)
      })
      .catch(() => {
        setPcError('API indisponível')
      })
  }, [])

  const hs = (val) => hsError ? '—' : (val ?? '…')
  const pc = (val) => pcError ? '—' : (val ?? '…')
  const hsTotal = hsStats.total || 0
  const hsBars = [
    { label: 'Em uso', value: hsStats.emUso || 0 },
    { label: 'Estoque', value: hsStats.estoque || 0 },
    { label: 'Com defeito', value: hsStats.defeito || 0 },
    { label: 'Manutenção', value: hsStats.manutencao || 0 },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <h2>Início</h2>
        <p className="muted">Visão operacional do estoque, vínculos de operador e manutenção.</p>
      </div>

      {/* ── Headsets ── */}
      <p className="stat-section-label">Headsets</p>
      <div className="stat-row">
        <Link to="/headsets" className="stat-card icon headsets">
          <span className="stat-label">Total</span>
          <strong className="stat-value">{hs(hsStats.total)}</strong>
          <span className="stat-hint">{!hsError && hsStats.emUso !== undefined ? `${hsStats.emUso} em uso` : hsError}</span>
        </Link>
        <Link to="/headsets?status=estoque" className="stat-card icon reserved">
          <span className="stat-label">Estoque</span>
          <strong className="stat-value">{hs(hsStats.estoque)}</strong>
          <span className="stat-hint">prontos para vincular</span>
        </Link>
        <Link to="/headsets?status=manutencao" className="stat-card icon maintenance">
          <span className="stat-label">Manutenção</span>
          <strong className="stat-value">{hs(hsStats.manutencao)}</strong>
          <span className="stat-hint">fora de operação</span>
        </Link>
        <Link to="/headsets?status=defeito" className="stat-card icon useless">
          <span className="stat-label">Com defeito</span>
          <strong className="stat-value">{hs(hsStats.defeito)}</strong>
          <span className="stat-hint">aguardando envio</span>
        </Link>
      </div>

      {/* ── Computadores ── */}
      <p className="stat-section-label">Computadores</p>
      <div className="stat-row stat-row--3">
        <Link to="/computadores" className="stat-card icon computers">
          <span className="stat-label">Total</span>
          <strong className="stat-value">{pc(pcStats.total)}</strong>
          <span className="stat-hint">{!pcError && pcStats.emUso !== undefined ? `${pcStats.emUso} em uso` : pcError}</span>
        </Link>
        <Link to="/computadores?status=manutencao" className="stat-card icon maintenance">
          <span className="stat-label">Em manutenção</span>
          <strong className="stat-value">{pc(pcStats.manutencao)}</strong>
          <span className="stat-hint">em reparo</span>
        </Link>
        <Link to="/computadores?status=inutilizavel" className="stat-card icon useless">
          <span className="stat-label">Inutilizáveis</span>
          <strong className="stat-value">{pc(pcStats.inutilizavel)}</strong>
          <span className="stat-hint">fora de uso</span>
        </Link>
      </div>

      {/* ── Info ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <section className="card prose">
          <h3>✅ Fluxo sugerido</h3>
          <ul>
            <li><strong>1.</strong> Cadastre o headset no status <strong>estoque</strong> sem operador.</li>
            <li><strong>2.</strong> Quando necessário, use <strong>Vincular operador</strong> na tela de headsets.</li>
            <li><strong>3.</strong> Use histórico e troca de lacre para rastreabilidade.</li>
          </ul>
        </section>
        <section className="card prose">
          <h3>📊 Distribuição de headsets</h3>
          <div className="simple-bars">
            {hsBars.map((item) => {
              const pct = hsTotal > 0 ? Math.round((item.value / hsTotal) * 100) : 0
              return (
                <div key={item.label} className="bar-row">
                  <span className="muted small">{item.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="mono small">{item.value}</span>
                </div>
              )
            })}
          </div>
        </section>
        <section className="card prose">
          <h3>🚀 Ações rápidas</h3>
          <div className="row wrap" style={{ gap: '0.5rem' }}>
            <Link to="/headsets?status=estoque" className="btn">Vincular do estoque</Link>
            <Link to="/headsets" className="btn">Cadastrar headset</Link>
            <Link to="/importar" className="btn primary">Importar planilha</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
