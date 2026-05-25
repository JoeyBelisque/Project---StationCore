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
  XCircle,
  History,
  Download
} from 'lucide-react'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'
import { listarAtividades } from '../services/atividadesApi'
import { ActivityLog } from '../components/ActivityLog'

/**
 * Componente StatCard
 * Exibe métricas individuais com ícones e labels.
 */
function StatCard({ label, value, hint, icon: Icon, to, colorClass = 'accent', loading }) {
  const displayValue = value ?? '0'
  const content = (
    <div className={`stat-card ${colorClass} ${loading ? 'loading' : ''}`}>
      <div className="stat-icon">
        {Icon ? <Icon size={24} /> : <div style={{ width: 24, height: 24 }} />}
      </div>
      <div className="stat-info">
        <span className="label" title={label}>{label || 'Métrica'}</span>
        {loading ? (
          <div className="skeleton-text" style={{ width: '60%', height: '1.5rem', marginTop: '0.25rem' }} />
        ) : (
          <strong className="value">{displayValue}</strong>
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
function DonutChart({ data = [], loading }) {
  const size = 180
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Garante que data é array e calcula total com segurança
  const chartData = Array.isArray(data) ? data : []
  const total = chartData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)

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
          <strong>{loading ? '...' : '0'}</strong>
          <span>{loading ? 'carregando' : 'Ativos'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="donut-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {chartData.map((item, idx) => {
          const val = Number(item.value) || 0
          const percentage = (val / total) * 100
          const dashArray = (percentage * circumference) / 100
          
          const dashOffset = -chartData.slice(0, idx).reduce((acc, curr) => {
            const cVal = Number(curr.value) || 0
            return acc + (cVal / total * circumference)
          }, 0)

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={item.color || 'var(--accent)'}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${circumference}`}
              strokeDashoffset={isNaN(dashOffset) ? 0 : dashOffset}
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
  const [loadingAtividades, setLoadingAtividades] = useState(true)
  const [hsError, setHsError] = useState(null)
  const [pcError, setPcError] = useState(null)
  const [atividades, setAtividades] = useState([])
  const [brandStats, setBrandStats] = useState([])
  const [hsStats, setHsStats] = useState({
    total: 0, emUso: 0, estoque: 0, emprestimo: 0, defeito: 0, manutencao: 0, perdas: 0
  })
  const [pcStats, setPcStats] = useState({
    total: 0, emUso: 0, estoque: 0, manutencao: 0, inutilizavel: 0
  })
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const p1 = listarHeadsets()
      .then((rows) => {
        if (rows && Array.isArray(rows)) {
          const stats = {
            total:      rows.length,
            emUso:      rows.filter(r => r.status === 'em_uso').length,
            estoque:    rows.filter(r => r.status === 'estoque' || r.status === 'reserva').length,
            emprestimo: rows.filter(r => r.status === 'emprestimo').length,
            defeito:    rows.filter(r => r.status === 'defeito').length,
            manutencao: rows.filter(r => r.status === 'manutencao').length,
            perdas:     rows.filter(r => r.status === 'perdido' || r.status === 'furtado').length,
          }
          setHsStats(stats)

          // Cálculo de Alertas Inteligentes
          const newAlerts = []
          if (stats.estoque < 5) {
            newAlerts.push({ 
              id: 'low-stock-hs', 
              type: 'danger', 
              title: 'Estoque de Headsets Baixo', 
              msg: `Apenas ${stats.estoque} unidades disponíveis para novos operadores.`,
              to: '/headsets?status=estoque'
            })
          }

          const emManutencaoLonga = rows.filter(r => 
            r.status === 'manutencao' && 
            r.updated_at && 
            (new Date() - new Date(r.updated_at)) > (15 * 24 * 60 * 60 * 1000)
          )
          if (emManutencaoLonga.length > 0) {
            newAlerts.push({
              id: 'stuck-maint',
              type: 'warning',
              title: 'Equipamentos Retidos',
              msg: `${emManutencaoLonga.length} headsets em manutenção há mais de 15 dias.`,
              to: '/headsets?status=manutencao'
            })
          }

          // Alertas de Empréstimo
          const hoje = new Date()
          const emprestimos = rows.filter(r => r.status === 'emprestimo' && r.data_devolucao)
          
          const vencidos = emprestimos.filter(r => new Date(r.data_devolucao) < hoje)
          if (vencidos.length > 0) {
            const nomes = vencidos.slice(0, 2).map(v => v.nome || v.lacre).join(', ')
            const suffix = vencidos.length > 2 ? ` (+${vencidos.length - 2})` : ''
            newAlerts.push({
              id: 'loan-overdue',
              type: 'danger',
              title: 'Empréstimos Vencidos',
              msg: `${vencidos.length} pendentes: ${nomes}${suffix}.`,
              to: '/headsets?status=emprestimo'
            })
          }

          const proximos = emprestimos.filter(r => {
            const data = new Date(r.data_devolucao)
            const diff = data - hoje
            return diff > 0 && diff < (48 * 60 * 60 * 1000) // Próximas 48h
          })
          if (proximos.length > 0) {
            const nomes = proximos.slice(0, 2).map(p => p.nome || p.lacre).join(', ')
            const suffix = proximos.length > 2 ? ` (+${proximos.length - 2})` : ''
            newAlerts.push({
              id: 'loan-upcoming',
              type: 'warning',
              title: 'Devoluções Próximas',
              msg: `${proximos.length} vencendo: ${nomes}${suffix}.`,
              to: '/headsets?status=emprestimo'
            })
          }
          
          setAlerts(newAlerts) // RESET state instead of appending to fix duplication

          // Cálculo de Desempenho por Marca
          const brands = ['intelbras', 'plantronics']
          const brandStats = brands.map(b => {
            const total = rows.filter(r => r.marca?.toLowerCase() === b).length
            const defeitos = rows.filter(r => r.marca?.toLowerCase() === b && (r.status === 'defeito' || r.status === 'manutencao')).length
            const rate = total > 0 ? ((defeitos / total) * 100).toFixed(1) : 0
            return { brand: b, total, defeitos, rate }
          })
          setBrandStats(brandStats)
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

    listarAtividades()
      .then(data => {
        // Trata diferentes formatos de retorno (array direto ou objeto { atividades: [] })
        let finalData = []
        if (Array.isArray(data)) finalData = data
        else if (data && Array.isArray(data.atividades)) finalData = data.atividades
        else if (data && Array.isArray(data.logs)) finalData = data.logs
        
        setAtividades(finalData.slice(0, 15))
      })
      .catch((err) => {
        console.error('Erro detalhado no Dashboard:', err)
        setAtividades([])
      })
      .finally(() => setLoadingAtividades(false))
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

      {/* Seção de Alertas Inteligentes */}
      {alerts.length > 0 && (
        <section className="alerts-section" style={{ marginBottom: '2.5rem' }}>
          <div className="row gap" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={20} className="text-warning" />
            <h3 className="section-title" style={{ margin: 0 }}>Alertas de Atenção</h3>
          </div>
          <div className="alerts-grid">
            {(alerts || []).map((alert, idx) => (
              <Link key={alert.id || idx} to={alert.to || '#'} className={`alert-card alert-${alert.type || 'warning'}`}>
                <div className="alert-content">
                  <div className="alert-icon-box">
                    {alert.type === 'danger' ? <XCircle size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div className="alert-text">
                    <strong>{alert.title || 'Alerta'}</strong>
                    <p>{alert.msg}</p>
                  </div>
                </div>
                <ArrowRight size={18} className="alert-arrow" />
              </Link>
            ))}
          </div>
        </section>
      )}

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
          <h4 className="card-title"><History size={18} /> Atividades Recentes</h4>
          <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <ActivityLog activities={atividades} loading={loadingAtividades} />
          </div>
        </section>
      </div>

      {/* Desempenho por Marca */}
      <h3 className="section-title" style={{ marginTop: '3rem' }}>Análise de Qualidade</h3>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {brandStats.map(s => (
          <section key={s.brand} className="card">
            <div className="row space-between" style={{ marginBottom: '1rem' }}>
              <h4 className="card-title" style={{ margin: 0, textTransform: 'capitalize' }}>{s.brand}</h4>
              <span className={`badge ${parseFloat(s.rate) > 15 ? 'badge-danger' : 'badge-success'}`}>
                {s.rate}% Defeito
              </span>
            </div>
            <div className="performance-bar-container">
              <div 
                className="performance-bar-fill" 
                style={{ 
                  width: `${100 - parseFloat(s.rate)}%`,
                  background: parseFloat(s.rate) > 15 ? 'var(--danger)' : 'var(--success)'
                }} 
              />
            </div>
            <div className="row space-between small muted" style={{ marginTop: '0.75rem' }}>
              <span>Total: <strong>{s.total}</strong></span>
              <span>Em Manutenção: <strong>{s.defeitos}</strong></span>
            </div>
          </section>
        ))}
      </div>

      {/* Ações Rápidas e Dicas */}
      <div className="inner-grid inner-grid-2" style={{ marginTop: '1.5rem', gap: '1.5rem' }}>
        <section className="card">
          <h4 className="card-title"><ArrowRight size={18} /> Ações Rápidas</h4>
          <div className="action-grid-premium" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Link to="/headsets?status=estoque" className="btn btn-secondary">Vincular Operador</Link>
            <Link to="/exportar" className="btn btn-secondary">Relatórios Excel</Link>
            <Link to="/headsets" className="btn btn-secondary">Novo Cadastro</Link>
            <Link to="/importar" className="btn btn-primary">Importar Planilha</Link>
            <Link to="/exportar" className="btn btn-accent w-full" style={{ gridColumn: 'span 2' }}>
              <Download size={16} /> Backup Full em 1 Clique
            </Link>
          </div>
        </section>

        <section className="card" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
          <h4 className="card-title text-accent"><CheckCircle2 size={18} /> Dica de Auditoria</h4>
          <p className="small" style={{ marginBottom: '1rem' }}>
            Mantenha os usuários e matrículas atualizados para garantir que o histórico de auditoria seja preciso. 
            Todas as ações de troca de lacre e movimentação de estoque são registradas automaticamente.
          </p>
          <Link to="/exportar" className="btn btn-secondary w-full">Ver Relatórios Completos</Link>
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
        .performance-bar-container {
          height: 10px;
          background: var(--bg-secondary);
          border-radius: 5px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .performance-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 1s ease-in-out;
        }

        /* Estilos de Alertas */
        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .alerts-grid {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.25rem;
          }
        }
        .alert-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: var(--transition);
          border: 1px solid var(--border);
        }
        .alert-card:hover {
          transform: translateY(-4px);
          filter: brightness(1.1);
        }
        .alert-danger {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
        }
        .alert-danger .alert-icon-box {
          background: var(--danger);
          color: white;
        }
        .alert-danger strong { color: #f87171; }
        
        .alert-warning {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.2);
        }
        .alert-warning .alert-icon-box {
          background: var(--warning);
          color: #000;
        }
        .alert-warning strong { color: #fbbf24; }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .alert-icon-box {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .alert-text strong {
          display: block;
          font-size: 0.9375rem;
          margin-bottom: 2px;
        }
        .alert-text p {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0;
        }
        .alert-arrow {
          color: var(--text-muted);
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
}
