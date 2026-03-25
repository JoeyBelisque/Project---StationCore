import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarHeadsets } from '../services/headsetStorage'
import { listarComputadores } from '../services/computadoresApi'

export function Dashboard() {
  const [headsets, setHeadsets] = useState(0)
  const [pcs, setPcs] = useState(null)
  const [pcError, setPcError] = useState(null)

  useEffect(() => {
    setHeadsets(listarHeadsets().length)
    listarComputadores()
      .then((rows) => {
        setPcs(Array.isArray(rows) ? rows.length : 0)
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
        <p className="muted">
          Visão geral do cadastro de headsets (navegador) e computadores (API).
        </p>
      </div>

      <div className="card-grid">
        <Link to="/headsets" className="stat-card">
          <span className="stat-label">Headsets cadastrados</span>
          <strong className="stat-value">{headsets}</strong>
          <span className="stat-hint">Persistência local até integrar API</span>
        </Link>
        <Link to="/computadores" className="stat-card">
          <span className="stat-label">Computadores</span>
          <strong className="stat-value">{pcError ? '—' : pcs ?? '…'}</strong>
          <span className="stat-hint">
            {pcError || 'Sincronizado com o servidor'}
          </span>
        </Link>
      </div>

      <section className="card prose">
        <h3>Como usar</h3>
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
    </div>
  )
}
