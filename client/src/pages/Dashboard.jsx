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
  
  const hsTotal = hsStats.total || 0
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

      {/* Seção de Headsets - Grade Original Reconstruída */}
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
        <StatCard 
          label="Com Defeito" 
          value={hsVal(hsStats.defeito)} 
          icon={AlertTriangle} 
          to="/headsets?status=defeito" 
          colorClass="danger"
          loading={loading}
        />
        <StatCard 
          label="Perdas/Extravios" 
          value={hsVal(hsStats.perdas)} 
          icon={XCircle} 
          to="/headsets" 
          colorClass="danger"
          loading={loading}
        />
      </div>

      {/* Seção de Computadores - Grade Original Reconstruída */}
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

      {/* Cards de Distribuição e Fluxo */}
      <div className="dashboard-grid" style={{ marginTop: '3rem' }}>
        <section className="card">
          <h4 className="card-title"><CheckCircle2 size={18} /> Fluxo Sugerido</h4>
          <ul className="premium-list">
            <li>Cadastre ativos no <strong>estoque</strong> sem vínculo inicial.</li>
            <li>Utilize o <strong>Vínculo Rápido</strong> para associar a operadores.</li>
            <li>Mantenha o histórico atualizado para auditoria.</li>
          </ul>
        </section>

        <section className="card">
          <h4 className="card-title"><Headphones size={18} /> Saúde do Inventário</h4>
          <div className="distribution-bars">
            {hsBars.map((item) => {
              const pct = hsTotal > 0 ? Math.round((item.value / hsTotal) * 100) : 0
              return (
                <div key={item.label} className="bar-group">
                  <div className="bar-label">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="bar-track-premium">
                    <div 
                      className="bar-fill-premium" 
                      style={{ width: loading ? '0%' : `${pct}%`, backgroundColor: item.color }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card">
          <h4 className="card-title"><ArrowRight size={18} /> Ações Rápidas</h4>
          <div className="action-grid-premium">
            <Link to="/headsets?status=estoque" className="btn btn-secondary">Vincular Operador</Link>
            <Link to="/headsets" className="btn btn-secondary">Novo Cadastro</Link>
            <Link to="/importar" className="btn btn-primary">Importar Planilha</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
