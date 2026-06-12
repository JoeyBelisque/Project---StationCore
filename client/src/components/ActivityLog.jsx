import { 
  User, 
  Package, 
  RefreshCcw, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  History 
} from 'lucide-react'

function ActivityIcon({ acao }) {
  const iconSize = 16
  if (acao.includes('vincular') || acao.includes('operador')) return <User size={iconSize} className="text-accent" />
  if (acao.includes('cadastro') || acao.includes('novo')) return <Package size={iconSize} className="text-success" />
  if (acao.includes('troca') || acao.includes('substituir')) return <RefreshCcw size={iconSize} className="text-warning" />
  if (acao.includes('manutencao') || acao.includes('reparo')) return <Wrench size={iconSize} className="text-warning" />
  if (acao.includes('defeito') || acao.includes('erro')) return <AlertTriangle size={iconSize} className="text-danger" />
  if (acao.includes('sucesso') || acao.includes('concluido')) return <CheckCircle2 size={iconSize} className="text-success" />
  return <History size={iconSize} className="muted" />
}

export function ActivityLog({ activities = [], loading }) {
  if (loading) {
    return (
      <div className="activity-log loading">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="activity-item skeleton-row" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="activity-log-empty">
        <p className="muted small">Nenhuma atividade recente encontrada.</p>
      </div>
    )
  }

  return (
    <div className="activity-log">
      {activities.map((activity, idx) => {
        if (!activity) return null

        // Normalização de campos para lidar com diferentes formatos de backend
        const user = activity.usuario || activity.user || activity.operador || 'Sistema'
        const timeStr = activity.created_at || activity.timestamp || activity.data || activity.hora
        const desc = activity.descricao || activity.acao || activity.msg || activity.texto
        const action = (activity.acao || activity.tipo || '').toLowerCase()

        // Validação de data segura para evitar RangeError: invalid time value
        let formattedTime = '—'
        if (timeStr) {
          const dateObj = new Date(timeStr)
          if (!isNaN(dateObj.getTime())) {
            formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          }
        }

        return (
          <div key={activity.id || idx} className="activity-item">
            <div className="activity-icon-wrapper">
              <ActivityIcon acao={action} />
            </div>
            <div className="activity-content">
              <div className="activity-header">
                <div className="row gap-xs" style={{ alignItems: 'center' }}>
                  <span className="activity-user">{user}</span>
                  <span className={`badge-pill ${getActionClass(action)}`}>
                    {action.replace('_', ' ')}
                  </span>
                </div>
                <span className="activity-time">{formattedTime}</span>
              </div>
              <p className="activity-description">{desc}</p>
            </div>
          </div>
        )
      })}

      <style>{`
        .activity-log {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .activity-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.02);
          transition: background 0.2s ease;
        }
        .activity-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .activity-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--border);
        }
        .activity-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .activity-user {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text);
        }
        .activity-time {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .activity-description {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.3;
        }
        .badge-pill {
          font-size: 0.65rem;
          padding: 1px 6px;
          border-radius: 10px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .bp-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .bp-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .bp-danger { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .bp-accent { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .bp-muted { background: var(--bg-secondary); color: var(--text-muted); }

        .gap-xs { gap: 0.35rem; }
        .activity-log-empty {
          padding: 2rem;
          text-align: center;
        }
        .skeleton-row {
          height: 60px;
          background: var(--bg-secondary);
          opacity: 0.5;
          margin-bottom: 0.5rem;
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  )
}

function getActionClass(action) {
  if (action.includes('vincular') || action.includes('sucesso') || action.includes('novo')) return 'bp-success'
  if (action.includes('troca') || action.includes('manutencao')) return 'bp-warning'
  if (action.includes('defeito') || action.includes('excluir')) return 'bp-danger'
  if (action.includes('operador')) return 'bp-accent'
  return 'bp-muted'
}
