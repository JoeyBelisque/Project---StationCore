import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Headphones, 
  Monitor, 
  CheckCircle2, 
  Wrench, 
  AlertTriangle, 
  Package,
  ArrowRight,
  RefreshCcw,
  XCircle
} from 'lucide-react'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'

/**
 * Componente StatCard
 * Exibe métricas individuais com ícones e labels.
 */
function StatCard({ label, value, hint, icon: Icon, to, colorClass = 'accent', loading }) {
  const content = (
    <div className={`stat-card ${colorClass} ${loading ? 'loading' : ''}`}>
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <span className="label" title={label}>{label}</span>
        {loading ? (
          <div className="skeleton-text" style={{ width: '60%', height: '1.5rem', marginTop: '0.25rem' }} />
        ) : (
          <strong className="value">{value}</strong>
        )}
        {hint && !loading && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  )

  if (to && !loading) return <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>
  return content
}

/**
 * Componente DonutChart (SVG Customizado)
 */
function DonutChart({ data, loading }) {
  const size = 180
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const total = data.reduce((acc, curr) => acc + curr.value, 0)
  let accumulatedOffset = 0

  if (loading || total === 0) {
    return (
      <div className="donut-container loading">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle 
            cx={size / 2} cy={size / 2} r={radius} 
            fill="transparent" stroke="var(--border)" strokeWidth={strokeWidth} 
          />
        </svg>
        <div className="donut-center">
          <strong>...</strong>
          <span>carregando</span>
        </div>
      </div>
    )
  }

  return (
    <div className="donut-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, idx) => {
          const percentage = (item.value / total) * 100
          const dashArray = (percentage * circumference) / 100
          const dashOffset = -accumulatedOffset
          accumulatedOffset += dashArray

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${circumference}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          )
        })}
      </svg>
      <div className="donut-center">
        <strong>{total}</strong>
        <span>Ativos</span>
      </div>
    </div>
  )
}

/**
 * Dashboard Operacional - RESTAURAÇÃO PAINEL GERAL
 */
export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [hsError, setHsError] = useState(null)
  const [pcError, setPcError] = useState(null)
  const [hsStats, setHsStats] = useState({
    total: 0, emUso: 0, estoque: 0, emprestimo: 0, defeito: 0, manutencao: 0, perdas: 0
  })
  const [pcStats, setPcStats] = useState({
    total: 0, emUso: 0, estoque: 0, manutencao: 0, inutilizavel: 0
  })

  useEffect(() => {
    setLoading(true)
    const p1 = listarHeadsets()
      .then((rows) => {
        if (rows && Array.isArray(rows)) {
          setHsStats({
            total:      rows.length,
            emUso:      rows.filter(r => r.status === 'em_uso').length,
            estoque:    rows.filter(r => r.status === 'estoque' || r.status === 'reserva').length,
            emprestimo: rows.filter(r => r.status === 'emprestimo').length,
            defeito:    rows.filter(r => r.status === 'defeito').length,
            manutencao: rows.filter(r => r.status === 'manutencao').length,
            perdas:     rows.filter(r => r.status === 'perdido' || r.status === 'furtado').length,
          })
        }
      })
      .catch(() => setHsError('Erro API'))

    const p2 = listarComputadores()
      .then((rows) => {
        if (rows && Array.isArray(rows)) {
          setPcStats({
            total:       rows.length,
            emUso:       rows.filter(r => r.status === 'em_uso').length,
            estoque:     rows.filter(r => r.status === 'estoque').length,
            manutencao:  rows.filter(r => r.status === 'manutencao' || r.status === 'troca_pendente').length,
            inutilizavel:rows.filter(r => r.status === 'inutilizavel').length,
          })
        }
      })
      .catch(() => setPcError('Erro API'))

    Promise.all([p1, p2]).finally(() => setLoading(false))
  }, [])

  const hsVal = (val) => hsError ? '—' : (val ?? '0')
  const pcVal = (val) => pcError ? '—' : (val ?? '0')

  const hsBars = [
    { label: 'Em uso', value: hsStats.emUso || 0, color: 'var(--success)' },
    { label: 'Empréstimo', value: hsStats.emprestimo || 0, color: '#8b5cf6' },
    { label: 'Estoque', value: hsStats.estoque || 0, color: 'var(--accent)' },
    { label: 'Defeito', value: hsStats.defeito || 0, color: 'var(--danger)' },
    { label: 'Manutenção', value: hsStats.manutencao || 0, color: 'var(--warning)' },
    { label: 'Perdas', value: hsStats.perdas || 0, color: '#475569' },
  ]

  return (
    <div className="page-fade-in">
      <header className="page-header-premium" style={{ marginBottom: '2rem' }}>
        <h2 className="page-title">Início</h2>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>Visão operacional e controle de ativos da StationCore.</p>
      </header>

      {/* Seção de Headsets */}
      <h3 className="section-title">Headsets</h3>
      <div className="dashboard-grid">
        <StatCard 
          label="Total Headsets" 
          value={hsVal(hsStats.total)} 
          icon={Headphones} 
          to="/headsets" 
          hint={`${hsStats.emUso + (hsStats.emprestimo || 0)} ativos`}
          loading={loading}
        />
        <StatCard 
          label="Em Estoque" 
          value={hsVal(hsStats.estoque)} 
          icon={Package} 
          to="/headsets?status=estoque" 
          hint="Disponível p/ vínculo"
          loading={loading}
        />
        <StatCard 
          label="Empréstimos" 
          value={hsVal(hsStats.emprestimo)} 
          icon={RefreshCcw} 
          to="/headsets?status=emprestimo" 
          hint="Equipamentos cedidos"
          loading={loading}
        />
        <StatCard 
          label="Manutenção" 
          value={hsVal(hsStats.manutencao)} 
          icon={Wrench} 
          to="/headsets?status=manutencao" 
          loading={loading}
        />
      </div>

      {/* Seção de Computadores */}
      <h3 className="section-title" style={{ marginTop: '2.5rem' }}>Computadores</h3>
      <div className="dashboard-grid">
        <StatCard 
          label="Total PCs" 
          value={pcVal(pcStats.total)} 
          icon={Monitor} 
          to="/computadores" 
          hint={`${pcStats.emUso} PAs ativas`}
          loading={loading}
        />
        <StatCard 
          label="Em Estoque" 
          value={pcVal(pcStats.estoque)} 
          icon={Package} 
          to="/computadores?status=estoque" 
          hint="Pronto p/ instalação"
          loading={loading}
        />
        <StatCard 
          label="Em Reparo" 
          value={pcVal(pcStats.manutencao)} 
          icon={Wrench} 
          to="/computadores?status=manutencao" 
          loading={loading}
        />
        <StatCard 
          label="Inutilizáveis" 
          value={pcVal(pcStats.inutilizavel)} 
          icon={AlertTriangle} 
          to="/computadores?status=inutilizavel" 
          colorClass="danger"
          loading={loading}
        />
      </div>

      {/* Saúde do Inventário com Gráfico e Legenda */}
      <div className="inner-grid inner-grid-2" style={{ marginTop: '3rem', gap: '1.5rem' }}>
        <section className="card">
          <h4 className="card-title"><Headphones size={18} /> Saúde do Inventário</h4>
          <div className="row wrap" style={{ justifyContent: 'space-around', gap: '2rem', padding: '1rem 0' }}>
            <DonutChart data={hsBars} loading={loading} />

            <div className="chart-legend">
              {hsBars.map(item => (
                <div key={item.label} className="legend-item">
                  <span className="dot" style={{ backgroundColor: item.color }} />
                  <span className="label">{item.label}</span>
                  <strong className="value">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <h4 className="card-title"><ArrowRight size={18} /> Ações Rápidas</h4>
          <div className="action-grid-premium" style={{ flex: 1, alignContent: 'center' }}>
            <Link to="/headsets?status=estoque" className="btn btn-secondary">Vincular Operador</Link>
            <Link to="/usuarios" className="btn btn-secondary">Gerenciar Usuários</Link>
            <Link to="/headsets" className="btn btn-secondary">Novo Cadastro</Link>
            <Link to="/importar" className="btn btn-primary">Importar Planilha</Link>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
            <div className="row gap" style={{ padding: '1rem', background: 'var(--accent-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)' }}>
              <CheckCircle2 size={20} className="text-accent" />
              <p className="small" style={{ margin: 0 }}><strong>Dica:</strong> Mantenha os usuários atualizados para auditoria de histórico.</p>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .donut-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .donut-center {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .donut-center strong {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1;
        }
        .donut-center span {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          font-weight: 600;
        }
        .chart-legend {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-width: 150px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }
        .legend-item .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .legend-item .label {
          color: var(--text-muted);
          flex: 1;
        }
        .legend-item .value {
          font-weight: 700;
          color: var(--text);
        }
      `}</style>
    </div>
  )
}

