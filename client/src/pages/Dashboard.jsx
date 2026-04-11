import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'

export function Dashboard() {
  const [headsets, setHeadsets] = useState(null)
  const [hsError, setHsError] = useState(null)
  const [pcs, setPcs] = useState(null)
  const [pcError, setPcError] = useState(null)
  const [hsStats, setHsStats] = useState({})
  const [pcStats, setPcStats] = useState({})

  useEffect(() => {
    listarHeadsets()
      .then((rows) => {
        const total = Array.isArray(rows) ? rows.length : 0
        setHeadsets(total)
        if (rows && Array.isArray(rows)) {
          const stats = {
            emUso: rows.filter(r => r.status === 'em_uso').length,
            troca: rows.filter(r => r.status === 'troca_pendente').length,
            desligado: rows.filter(r => r.status === 'desligado').length,
          }
          setHsStats(stats)
        }
        setHsError(null)
      })
      .catch(() => {
        setHeadsets(null)
        setHsError('API indisponível (suba o backend na porta 3000)')
      })
    listarComputadores()
      .then((rows) => {
        const total = Array.isArray(rows) ? rows.length : 0
        setPcs(total)
        if (rows && Array.isArray(rows)) {
          const stats = {
            emUso: rows.filter(r => r.status === 'em_uso').length,
            manutencao: rows.filter(r => r.status === 'manutencao').length,
          }
          setPcStats(stats)
        }
        setPcError(null)
      })
      .catch(() => {
        setPcs(null)
        setPcError('API indisponível (suba o backend na porta 3000)')
      })
  }, [])

  return (
    <div className="page">
      <div className="page-head">
        <h2>Início</h2>
        <p className="muted">Visão geral do cadastro de headsets e computadores (API + PostgreSQL).</p>
      </div>

      <div className="card-grid">
        <Link to="/headsets" className="stat-card icon headsets">
          <span className="stat-label">Headsets</span>
          <strong className="stat-value">{hsError ? '—' : headsets ?? '…'}</strong>
          {!hsError && hsStats.emUso !== undefined && (
            <span className="stat-hint">{hsStats.emUso} em uso</span>
          )}
          {hsError && <span className="stat-hint" style={{ color: 'var(--danger)' }}>API indisponível</span>}
        </Link>
        <Link to="/computadores" className="stat-card icon computers">
          <span className="stat-label">Computadores</span>
          <strong className="stat-value">{pcError ? '—' : pcs ?? '…'}</strong>
          {!pcError && pcStats.emUso !== undefined && (
            <span className="stat-hint">{pcStats.emUso} em uso</span>
          )}
          {pcError && <span className="stat-hint" style={{ color: 'var(--danger)' }}>API indisponível</span>}
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <section className="card prose">
          <h3>📋 Como usar</h3>
          <ul>
            <li>
              <strong>Headsets:</strong> matrícula do operador, lacre, marca e número de série; status
              (em uso, troca, desligado etc.).
            </li>
            <li>
              <strong>Computadores:</strong> PA, hostname e série; ideal para localizar milhares de
              máquinas e registrar troca ou equipamento inutilizável.
            </li>
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
