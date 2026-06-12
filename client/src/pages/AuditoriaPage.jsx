import { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  Search, 
  RefreshCcw, 
  History, 
  User, 
  Calendar,
  Filter,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  MoreHorizontal,
  LayoutDashboard,
  Info
} from 'lucide-react'
import { listarAtividades } from '../services/atividadesApi'
import { Pagination } from '../components/Pagination'
import { Modal } from '../components/Modal'

function ActivityIcon({ acao }) {
  const iconSize = 18
  const acaoLower = acao?.toLowerCase() || ''
  if (acaoLower.includes('vincular') || acaoLower.includes('operador')) return <User size={iconSize} className="text-accent" />
  if (acaoLower.includes('cadastro') || acaoLower.includes('novo')) return <ClipboardList size={iconSize} className="text-success" />
  if (acaoLower.includes('troca') || acaoLower.includes('substituir')) return <RefreshCcw size={iconSize} className="text-warning" />
  if (acaoLower.includes('manutencao') || acaoLower.includes('reparo')) return <ShieldCheck size={iconSize} className="text-warning" />
  return <History size={iconSize} className="muted" />
}

/**
 * Página de Auditoria Completa
 * Exibe o histórico detalhado de todas as ações no sistema.
 */
export function AuditoriaPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [page, setPage] = useState(0)
  const [selectedRow, setSelectedRow] = useState(null)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listarAtividades()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (!r) return false
      
      // Filtro de Ativo (Tipo)
      if (tipoFilter) {
        const t = (r.tipo || r.tabela || '').toLowerCase()
        if (!t.includes(tipoFilter)) return false
      }
      
      // Filtro de Data Seguro
      if (dataInicio || dataFim) {
        const timestamp = r.created_at || r.timestamp || r.data
        if (!timestamp) return false
        
        const dataEv = new Date(timestamp)
        if (isNaN(dataEv.getTime())) return false

        if (dataInicio) {
          const dStart = new Date(dataInicio + 'T00:00:00')
          if (dataEv < dStart) return false
        }
        if (dataFim) {
          const dEnd = new Date(dataFim + 'T23:59:59')
          if (dataEv > dEnd) return false
        }
      }

      if (!s) return true
      const blob = `${r.usuario || ''} ${r.descricao || ''} ${r.acao || ''} ${r.tipo || ''} ${r.lacre || ''}`.toLowerCase()
      return blob.includes(s)
    })
  }, [rows, q, tipoFilter, dataInicio, dataFim])

  const pageItems = useMemo(() => {
    return filtered.slice(page * pageSize, (page + 1) * pageSize)
  }, [filtered, page])

  return (
    <div className="page-fade-in">
      <header className="page-header-premium">
        <div className="row space-between wrap gap">
          <div>
            <h2 className="page-title">Módulo de Auditoria</h2>
            <p className="page-subtitle">Rastreabilidade completa de todas as movimentações e alterações do inventário.</p>
          </div>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar Base
          </button>
        </div>
      </header>

      {/* Barra de Ferramentas / Filtros */}
      <div className="toolbar-premium card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div className="row gap wrap">
          <div className="input-with-icon flex-1" style={{ minWidth: '300px' }}>
            <Search className="icon" size={18} />
            <input 
              className="input" 
              placeholder="Buscar por usuário, descrição ou lacre..." 
              value={q} 
              onChange={e => { setQ(e.target.value); setPage(0); }} 
            />
          </div>

          <div className="row gap wrap">
            <div className="row gap">
              <Calendar size={18} className="muted" />
              <input 
                type="date" 
                className="input small-date" 
                value={dataInicio} 
                onChange={e => { setDataInicio(e.target.value); setPage(0); }} 
              />
              <span className="muted">até</span>
              <input 
                type="date" 
                className="input small-date" 
                value={dataFim} 
                onChange={e => { setDataFim(e.target.value); setPage(0); }} 
              />
            </div>

            <div className="row gap">
              <Filter size={18} className="muted" />
              <select 
                className="input" 
                style={{ width: '180px' }}
                value={tipoFilter}
                onChange={e => { setTipoFilter(e.target.value); setPage(0); }}
              >
                <option value="">Todos os Ativos</option>
                <option value="headset">Headsets</option>
                <option value="computador">Computadores</option>
                <option value="usuario">Usuários</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="table-container shadow-lg">
        <table>
          <thead>
            <tr>
              <th><Calendar size={14} style={{ marginRight: 6 }} /> Data / Hora</th>
              <th>Ação</th>
              <th>Usuário Responsável</th>
              <th>Descrição do Evento</th>
              <th style={{ textAlign: 'right' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 muted">Sincronizando registros de auditoria...</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 muted">Nenhum evento registrado com os filtros atuais.</td></tr>
            ) : (
              pageItems.map((r, i) => (
                <tr key={r.id || i}>
                  <td className="mono small">
                    {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td>
                    <div className="row gap">
                      <ActivityIcon acao={r.acao} />
                      <span className="badge badge-info">{r.acao?.replace('_', ' ') || 'Alteração'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="row gap">
                      <div className="stat-icon" style={{ width: 24, height: 24, borderRadius: '50%' }}>
                        <User size={12} />
                      </div>
                      <strong>{r.usuario || 'Sistema'}</strong>
                    </div>
                  </td>
                  <td>
                    <p className="small" style={{ maxWidth: '400px' }}>{r.descricao}</p>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-icon btn-secondary" 
                      title="Ver detalhes técnicos"
                      onClick={() => setSelectedRow(r)}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        page={page} 
        pageSize={pageSize} 
        total={filtered.length} 
        onPageChange={setPage} 
      />

      {/* Modal de Detalhes da Auditoria */}
      {selectedRow && (
        <Modal
          title="Detalhes do Evento"
          onClose={() => setSelectedRow(null)}
          size="md"
          icon={Info}
          footer={<button className="btn btn-secondary" onClick={() => setSelectedRow(null)}>Fechar</button>}
        >
          <div className="audit-details">
            <div className="detail-group">
              <span className="label">Timestamp</span>
              <p className="value mono">{new Date(selectedRow.created_at).toLocaleString('pt-BR')}</p>
            </div>
            <div className="detail-group">
              <span className="label">Ação Realizada</span>
              <p className="value"><span className="badge badge-info">{selectedRow.acao}</span></p>
            </div>
            <div className="detail-group">
              <span className="label">Usuário</span>
              <p className="value"><strong>{selectedRow.usuario || 'Sistema'}</strong></p>
            </div>
            <div className="detail-group">
              <span className="label">Descrição Completa</span>
              <div className="card" style={{ background: 'var(--bg-secondary)', padding: '1rem', marginTop: '0.5rem' }}>
                <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{selectedRow.descricao}</p>
              </div>
            </div>
            
            {selectedRow.lacre && (
              <div className="detail-group">
                <span className="label">Lacre Relacionado</span>
                <p className="value text-accent mono"><strong>{selectedRow.lacre}</strong></p>
              </div>
            )}
            
            {(selectedRow.valor_anterior || selectedRow.valor_novo) && (
              <div className="inner-grid inner-grid-2" style={{ marginTop: '1.5rem' }}>
                <div className="detail-group">
                  <span className="label">Valor Anterior</span>
                  <p className="value muted mono small">{selectedRow.valor_anterior || '—'}</p>
                </div>
                <div className="detail-group">
                  <span className="label">Valor Novo</span>
                  <p className="value text-success mono small">{selectedRow.valor_novo || '—'}</p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      <style>{`
        .mono { font-family: var(--font-mono); }
        .py-12 { padding: 3rem 0; }
        .space-between { justify-content: space-between; }
        .small-date { width: 150px; font-size: 0.8rem; padding: 0.5rem; }
        
        .audit-details {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .detail-group .label {
          display: block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }
        .detail-group .value {
          font-size: 0.9375rem;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
