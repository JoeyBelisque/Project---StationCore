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
                <span className="activity-user">{user}</span>
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
          gap: 1rem;
        }
        .activity-item {
          display: flex;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-light);
        }
        .activity-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .activity-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 50%;
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
          gap: 0.25rem;
        }
        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .activity-user {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text);
        }
        .activity-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .activity-description {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
        }
        .activity-log-empty {
          padding: 2rem;
          text-align: center;
        }
        .skeleton-row {
          height: 48px;
          background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border) 50%, var(--bg-secondary) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: var(--radius-sm);
        }
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
