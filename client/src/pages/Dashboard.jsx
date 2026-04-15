import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'
import { X, RefreshCw, Trash } from 'lucide-react'

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
            reserva:    rows.filter(r => r.status === 'reserva').length,
            desligado:  rows.filter(r => r.status === 'desligado').length,
            troca:      rows.filter(r => r.status === 'troca_pendente').length,
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

  return (
    <div className="page">
      <div className="page-head">
        <h2>Início</h2>
        <p className="muted">Visão geral do cadastro de headsets e computadores (API + PostgreSQL).</p>
      </div>

      {/* ── Headsets ── */}
      <p className="stat-section-label">Headsets</p>
      <div className="stat-row">
        <Link to="/headsets" className="stat-card icon headsets">
          <span className="stat-label">Total</span>
          <strong className="stat-value">{hs(hsStats.total)}</strong>
          <span className="stat-hint">{!hsError && hsStats.emUso !== undefined ? `${hsStats.emUso} em uso` : hsError}</span>
        </Link>
        <Link to="/headsets?status=reserva" className="stat-card icon reserved">
          <span className="stat-label">Reservados</span>
          <strong className="stat-value">{hs(hsStats.reserva)}</strong>
          <span className="stat-hint">aguardando uso</span>
        </Link>
        <Link to="/headsets?status=desligado" className="stat-card icon off">
          <span className="stat-label">Desligados</span>
          <strong className="stat-value">{hs(hsStats.desligado)}</strong>
          <span className="stat-hint">inativos</span>
        </Link>
        <Link to="/headsets?status=troca_pendente" className="stat-card icon exchange">
          <span className="stat-label">Troca pendente</span>
          <strong className="stat-value">{hs(hsStats.troca)}</strong>
          <span className="stat-hint">aguardando troca</span>
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
          <h3>📋 Como usar</h3>
          <ul>
            <li><strong>Headsets:</strong> matrícula do operador, lacre, marca e número de série; status (em uso, troca, desligado etc.).</li>
            <li><strong>Computadores:</strong> PA, hostname e série; ideal para localizar milhares de máquinas e registrar troca ou equipamento inutilizável.</li>
          </ul>
        </section>
        <section className="card prose">
          <h3>📥 Importação em Lote</h3>
          <p>Envie arquivos CSV/Excel com seus dados. O sistema valida automaticamente e insere os registros no banco de dados.</p>
          <Link to="/importar" className="btn primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
            Ir para importação
          </Link>
        </section>
      </div>
    </div>
  )
}
