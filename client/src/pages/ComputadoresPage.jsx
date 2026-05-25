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
  MoreHorizontal
} from 'lucide-react'
import { PC_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { useToast } from '../components/Toast'
import {
  criarComputador,
  listarComputadores,
  atualizarComputador,
  removerComputador,
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
                      {formatUpdatedAt(r.updated_at ?? r.atualizadoEm ?? r.atualizado_em)}
                    </td>
                  )}
                  <td style={{ textAlign: 'right' }}>
                    <div className="row gap" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-icon" onClick={() => openEdit(r)}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn btn-secondary btn-icon text-danger" onClick={() => handleDelete(r.id)}>
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
          </form>
        </Modal>
      )}
    </div>
  )
}
