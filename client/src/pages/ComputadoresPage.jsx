import { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  Plus, 
  Search, 
  RefreshCcw, 
  Monitor, 
  Edit3, 
  Trash2, 
  MapPin, 
  Hash,
  AlertTriangle,
  MoreHorizontal,
  History,
  RefreshCw,
  Eye,
  FileText
} from 'lucide-react'
import { PC_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { useToast } from '../components/ToastContext'
import {
  criarComputador,
  listarComputadores,
  atualizarComputador,
  removerComputador,
  listarHistoricoComputador,
  trocarComputador
} from '../services/computadoresApi'

const PAGE_SIZE = 25

/**
 * Mapeia o status do PC para classes de badge.
 */
function getBadgeClass(status) {
  const map = {
    em_uso: 'badge-success',
    manutencao: 'badge-warning',
    inutilizavel: 'badge-danger',
    estoque: 'badge-info',
    troca_pendente: 'badge-warning',
  }
  return `badge ${map[status] || 'badge-info'}`
}

const emptyForm = () => ({
  id: null,
  nome: '',
  hostname: '',
  serial_number: '',
  status: 'em_uso',
  pa: '',
  observacoes: ''
})

/**
 * Gestão de Computadores por PA
 * Controle de hostnames, números de série e localização física (PA).
 */
export function ComputadoresPage() {
  const { addToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isCompact, setIsCompact] = useState(() => localStorage.getItem('pc_compact') === 'true')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(null)

  // Persistência de modo compacto
  useEffect(() => {
    localStorage.setItem('pc_compact', isCompact)
  }, [isCompact])

  // Formatação de data amigável
  function formatUpdatedAt(value) {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
  }

  // Carregamento de dados
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listarComputadores()
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Falha ao carregar dados do servidor.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Lógica de busca e filtragem
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter && String(r.status) !== statusFilter) return false
      if (!s) return true
      const blob = `${r.nome} ${r.hostname} ${r.serial_number} ${r.pa} ${r.status}`.toLowerCase()
      return blob.includes(s)
    })
  }, [rows, q, statusFilter])

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1)
    setPage((p) => Math.min(p, maxPage))
  }, [filtered.length])

  // Handlers de formulário
  async function handleSubmit(e) {
    e.preventDefault()
    const f = modal.form
    const body = {
      nome: f.nome.trim(),
      hostname: f.hostname.trim(),
      serial_number: f.serial_number.trim(),
      status: f.status,
      pa: f.pa.trim(),
      observacoes: f.observacoes.trim()
    }
    try {
      if (f.id) await atualizarComputador(f.id, body)
      else await criarComputador(body)
      setModal(null)
      addToast('Computador salvo com sucesso!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao salvar', 'error') }
  }

  const openNew = () => setModal({ mode: 'edit', form: emptyForm() })
  const openEdit = (row) => setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })
  const openView = (row) => setModal({ mode: 'view', pc: row })
  
  const openHistorico = async (row) => {
    setModal({ mode: 'historico', pc: row, loading: true, rows: [], error: '' })
    try {
      const data = await listarHistoricoComputador(row.id)
      setModal({ mode: 'historico', pc: row, loading: false, rows: Array.isArray(data) ? data : [], error: '' })
    } catch (err) {
      setModal({ mode: 'historico', pc: row, loading: false, rows: [], error: err.message || 'Falha ao carregar histórico' })
    }
  }

  const openTroca = (row) => {
    const disponiveis = rows.filter(r => r.id !== row.id && r.status === 'estoque')
    setModal({ 
      mode: 'troca', 
      pc: row, 
      form: { id_novo: '', status_novo_original: 'manutencao', observacao: '' },
      disponiveis 
    })
  }

  async function handleTroca(e) {
    e.preventDefault()
    try {
      await trocarComputador(modal.pc.id, modal.form)
      addToast('Substituição realizada com sucesso!')
      setModal(null)
      await load()
    } catch (err) { addToast(err.message || 'Erro na troca', 'error') }
  }

  async function handleDelete(id) {
    if (!confirm('Remover este computador do sistema?')) return
    try {
      await removerComputador(id)
      addToast('Computador removido com sucesso!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao excluir', 'error') }
  }

  return (
    <div className="page-fade-in">
      <header className="page-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">Computadores</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Gestão de postos de atendimento (PA) e equipamentos.</p>
        </div>
        <div className="row gap">
          <button 
            className={`btn btn-secondary ${isCompact ? 'active' : ''}`} 
            onClick={() => setIsCompact(!isCompact)}
            title={isCompact ? 'Desativar modo compacto' : 'Ativar modo compacto'}
          >
            <MoreHorizontal size={16} />
            <span className="hide-mobile">{isCompact ? 'Expandir' : 'Compactar'}</span>
          </button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hide-mobile">Atualizar</span>
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} />
            Novo PC
          </button>
        </div>
      </header>

      {error && (
        <div className="badge badge-danger w-full" style={{ marginBottom: '1.5rem', padding: '1rem', justifyContent: 'center' }}>
          <AlertTriangle size={16} style={{ marginRight: 8 }} />
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Toolbar de Filtros */}
      <div className="card toolbar-premium">
        <div className="input-with-icon">
          <Search size={18} className="icon" />
          <input 
            type="search" 
            className="input w-full" 
            placeholder="Buscar por Hostname, Série ou PA..." 
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
          />
        </div>
        <select 
          className="input" 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">Todos os Status</option>
          {PC_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="table-container shadow-lg">
        <table>
          <thead>
            <tr>
              <th>Identificador / PA</th>
              <th>Hostname</th>
              {!isCompact && <th><Hash size={14} style={{ marginRight: 4 }} /> Nº Série</th>}
              <th>Status</th>
              {!isCompact && <th>Atualizado</th>}
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isCompact ? 4 : 6} className="text-center py-8 muted">Carregando...</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={isCompact ? 4 : 6} className="text-center py-8 muted">Nenhum computador encontrado.</td></tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{r.nome || r.pa || '—'}</strong>
                      {isCompact && r.pa && <span className="small muted">{r.pa}</span>}
                    </div>
                  </td>
                  <td><code className="mono text-accent">{r.hostname ?? '—'}</code></td>
                  {!isCompact && <td className="mono small">{r.serial_number ?? '—'}</td>}
                  <td>
                    <span className={getBadgeClass(r.status)}>
                      {labelByValue(PC_STATUS, r.status)}
                    </span>
                  </td>
                  {!isCompact && (
                    <td className="small muted">
                      {formatUpdatedAt(r.updated_at)}
                    </td>
                  )}
                  <td style={{ textAlign: 'right' }}>
                    <div className="row gap" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-icon" title="Ver Detalhes" onClick={() => openView(r)}>
                        <Eye size={16} />
                      </button>
                      {r.status === 'em_uso' && (
                        <button className="btn btn-secondary btn-icon text-warning" title="Substituir PC" onClick={() => openTroca(r)}>
                          <RefreshCw size={16} />
                        </button>
                      )}
                      <button className="btn btn-secondary btn-icon" title="Editar" onClick={() => openEdit(r)}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn btn-secondary btn-icon" title="Histórico" onClick={() => openHistorico(r)}>
                        <History size={16} />
                      </button>
                      <button className="btn btn-secondary btn-icon text-danger" title="Excluir" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      {/* Modal: Visualizar Detalhes */}
      {modal?.mode === 'view' && (
        <Modal 
          title={`PC: ${modal.pc.hostname}`} 
          onClose={() => setModal(null)}
          size="md"
          icon={Monitor}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>}
        >
          <div className="modal-view-container">
            {/* Header: Status Integrado */}
            <div className="modal-header-status">
              <span className="prop-label">Situação Atual</span>
              <span className={`status-pill ${getBadgeClass(modal.pc.status)}`}>
                {labelByValue(PC_STATUS, modal.pc.status)}
              </span>
            </div>

            {/* Grid de Dados: Uniforme */}
            <div className="modal-data-grid">
              <div className="data-card">
                <span className="prop-label">Hostname</span>
                <p className="prop-value mono">{modal.pc.hostname}</p>
              </div>
              <div className="data-card">
                <span className="prop-label">PA / Posto</span>
                <p className="prop-value">{modal.pc.pa || '—'}</p>
              </div>
              <div className="data-card">
                <span className="prop-label">Série</span>
                <p className="prop-value mono">{modal.pc.serial_number || '—'}</p>
              </div>
              <div className="data-card">
                <span className="prop-label">Identificador</span>
                <p className="prop-value">{modal.pc.nome || '—'}</p>
              </div>
            </div>

            {/* Observações */}
            <div className="modal-vinc-card">
                <span className="prop-label">Observações Técnicas</span>
                <p className="prop-value" style={{ fontWeight: '400' }}>{modal.pc.observacoes || 'Sem notas adicionais.'}</p>
            </div>
          </div>

          <style>{`
            .modal-view-container { display: flex; flex-direction: column; gap: 1rem; padding: 0.25rem; }
            .modal-header-status { display: flex; flex-direction: column; align-items: center; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border); gap: 0.25rem; }
            .status-pill { padding: 0.35rem 0.85rem; border-radius: 999px; font-weight: 700; font-size: 0.8rem; }
            .modal-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
            .data-card { background: var(--surface-hover); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border); }
            .modal-vinc-card { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; background: var(--surface); display: flex; flex-direction: column; gap: 0.5rem; }
            .prop-label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem; display: block; }
            .prop-value { font-size: 0.95rem; font-weight: 600; color: var(--text); margin: 0; }
          `}</style>
        </Modal>
      )}

      {/* Modal: Editar / Novo */}
      {modal?.mode === 'edit' && (
        <Modal
          title={modal.form.id ? 'Editar Equipamento' : 'Cadastrar PC'}
          onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-pc" className="btn btn-primary">Salvar</button></>}
        >
          <form id="f-pc" className="form-grid" onSubmit={handleSubmit}>
            <label className="full">Identificador / Apelido (Opcional)<input className="input" value={modal.form.nome} onChange={e => setModal(m => ({...m, form: {...m.form, nome: e.target.value}}))} placeholder="Ex: PC Recepção, Estação 01..." /></label>
            <label>PA (Mesa / Posto)<input className="input" value={modal.form.pa} onChange={e => setModal(m => ({...m, form: {...m.form, pa: e.target.value}}))} required /></label>
            <label>Hostname<input className="input mono" value={modal.form.hostname} onChange={e => setModal(m => ({...m, form: {...m.form, hostname: e.target.value}}))} required /></label>
            <label>Número de Série<input className="input mono" value={modal.form.serial_number} onChange={e => setModal(m => ({...m, form: {...m.form, serial_number: e.target.value}}))} required /></label>
            <label className="full">Status
              <select className="input" value={modal.form.status} onChange={e => setModal(m => ({...m, form: {...m.form, status: e.target.value}}))}>
                {PC_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="full">Observações Técnicas
              <textarea className="input" rows={3} value={modal.form.observacoes} onChange={e => setModal(m => ({...m, form: {...m.form, observacoes: e.target.value}}))} />
            </label>
          </form>
        </Modal>
      )}

      {/* Modal: Troca / Substituição */}
      {modal?.mode === 'troca' && (
        <Modal 
          title={`Substituição: ${modal.pc.hostname}`} 
          onClose={() => setModal(null)} 
          icon={RefreshCw}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-swap" className="btn btn-primary" style={{ background: 'var(--warning)' }}>Efetivar Troca</button></>}
        >
          <form id="f-swap" className="form-grid" onSubmit={handleTroca}>
            <div className="full badge badge-info" style={{ padding: '1rem', marginBottom: '0.5rem', borderRadius: '4px', display: 'block' }}>
              PA Atual: <strong>{modal.pc.pa}</strong>
              <p className="small">A PA será transferida para o novo computador.</p>
            </div>
            <label className="full">Selecionar Novo PC (Estoque)
              <select className="input" value={modal.form.id_novo} onChange={e => setModal(m => ({...m, form: {...m.form, id_novo: e.target.value}}))} required>
                <option value="">Selecione...</option>
                {modal.disponiveis.map(p => (
                  <option key={p.id} value={p.id}>{p.nome ? `${p.nome} (${p.hostname})` : p.hostname} | SN: {p.serial_number || '—'}</option>
                ))}
              </select>
            </label>
            <label className="full">Motivo / Destino do Antigo
              <select className="input" value={modal.form.status_novo_original} onChange={e => setModal(m => ({...m, form: {...m.form, status_novo_original: e.target.value}}))} required>
                <option value="manutencao">Enviar p/ Manutenção</option>
                <option value="inutilizavel">Marcar como Inutilizável</option>
                <option value="troca_pendente">Troca Pendente (Aguardando Retirada)</option>
              </select>
            </label>
            <label className="full">Obs Técnicas
              <textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} />
            </label>
          </form>
        </Modal>
      )}

      {/* Modal: Histórico */}
      {modal?.mode === 'historico' && (
        <Modal 
          title={`Histórico: ${modal.pc.hostname}`} 
          onClose={() => setModal(null)} 
          size="lg" 
          icon={History}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>}
        >
          {modal.loading ? <p className="muted">Carregando...</p> : modal.error ? <p className="text-danger">{modal.error}</p> : modal.rows.length === 0 ? <p className="muted">Nenhuma alteração registrada.</p> : (
            <div className="table-container" style={{ maxHeight: '400px', marginTop: 0 }}>
              <table>
                <thead><tr><th>Data</th><th>Ação</th><th>Campo</th><th>De</th><th>Para</th></tr></thead>
                <tbody>
                  {modal.rows.map(r => (
                    <tr key={r.id}>
                      <td className="small muted">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                      <td><span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{r.acao}</span></td>
                      <td><strong>{r.campo || '—'}</strong></td>
                      <td className="mono small">{r.valor_anterior || '—'}</td>
                      <td className="mono small">{r.valor_novo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
