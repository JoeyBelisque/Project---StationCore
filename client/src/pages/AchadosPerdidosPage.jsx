import { useCallback, useEffect, useState } from 'react'
import { Archive, CheckCircle2, MapPin, Plus, RefreshCcw, Search } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useToast } from '../components/ToastContext'
import { atualizarAchadoPerdido, criarAchadoPerdido, listarAchadosPerdidos } from '../services/achadosPerdidosApi'

const STATUS = {
  aguardando_devolucao: 'Aguardando devolução',
  devolvido: 'Devolvido',
  cancelado: 'Cancelado',
}

const emptyForm = () => ({
  id: null,
  lacre: '',
  numero_serie: '',
  marca: '',
  status: 'aguardando_devolucao',
  localizacao: '',
  encontrado_por: '',
  chamado: '',
  encontrado_em: new Date().toISOString().slice(0, 16),
  devolvido_em: '',
  devolvido_para: '',
  observacoes: '',
})

function formatDate(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '—'
}

export function AchadosPerdidosPage() {
  const { addToast } = useToast()
  const [rows, setRows] = useState([])
  const [statusFilter, setStatusFilter] = useState('aguardando_devolucao')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listarAchadosPerdidos(statusFilter)
      setRows(Array.isArray(data) ? data : [])
    } catch (error) {
      addToast(error.message || 'Falha ao carregar achados e perdidos', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(row => {
    const search = q.trim().toLowerCase()
    if (!search) return true
    return `${row.lacre} ${row.numero_serie} ${row.marca} ${row.localizacao} ${row.chamado} ${row.encontrado_por} ${row.devolvido_para}`.toLowerCase().includes(search)
  })

  const openNew = () => setModal({ mode: 'new', form: emptyForm() })
  const openEdit = row => setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })

  async function handleSubmit(event) {
    event.preventDefault()
    const form = modal.form
    const body = {
      ...form,
      devolvido_em: form.status === 'devolvido' ? (form.devolvido_em || new Date().toISOString()) : null,
    }
    try {
      if (form.id) await atualizarAchadoPerdido(form.id, body)
      else await criarAchadoPerdido(body)
      setModal(null)
      addToast(form.id ? 'Registro atualizado!' : 'Achado registrado!')
      await load()
    } catch (error) {
      addToast(error.message || 'Falha ao salvar registro', 'error')
    }
  }

  function updateForm(field, value) {
    setModal(current => ({ ...current, form: { ...current.form, [field]: value } }))
  }

  return (
    <div className="page-fade-in">
      <header className="page-header-premium achados-header">
        <div>
          <h2 className="page-title">Achados e Perdidos</h2>
          <p className="page-subtitle">Controle equipamentos encontrados na sala até a devolução ou identificação do responsável.</p>
        </div>
        <div className="row gap">
          <button className="btn btn-secondary" onClick={load} disabled={loading} title="Atualizar"><RefreshCcw size={16} /></button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Registrar achado</button>
        </div>
      </header>

      <div className="card toolbar-premium achados-toolbar">
        <div className="input-with-icon flex-1">
          <Search size={18} className="icon" />
          <input className="input w-full" placeholder="Buscar por lacre, série, local ou chamado..." value={q} onChange={event => setQ(event.target.value)} />
        </div>
        <select className="input" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="">Todos os registros</option>
          {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="achados-grid">
        {loading ? <div className="card muted text-center py-8">Carregando registros...</div> : filtered.length === 0 ? <div className="card muted text-center py-8">Nenhum achado encontrado.</div> : filtered.map(row => (
          <article className="card achado-card" key={row.id}>
            <div className="achado-card-head">
              <div className="row gap">
                <div className="stat-icon"><Archive size={18} /></div>
                <div>
                  <strong>{row.lacre || 'Lacre não identificado'}</strong>
                  <span className="small muted">{row.marca || 'Marca não informada'} {row.numero_serie ? `• ${row.numero_serie}` : ''}</span>
                </div>
              </div>
              <span className={`badge ${row.status === 'aguardando_devolucao' ? 'badge-warning' : row.status === 'devolvido' ? 'badge-success' : 'badge-info'}`}>{STATUS[row.status] || row.status}</span>
            </div>
            <div className="achado-details">
              <span><MapPin size={14} /> {row.localizacao || 'Local não informado'}</span>
              <span>Encontrado em {formatDate(row.encontrado_em)}</span>
              {row.chamado && <span>Chamado: <strong>{row.chamado}</strong></span>}
              {row.encontrado_por && <span>Recebido por: {row.encontrado_por}</span>}
            </div>
            {row.observacoes && <p className="small muted achado-notes">{row.observacoes}</p>}
            <div className="achado-actions">
              <button className="btn btn-secondary btn-small" onClick={() => openEdit(row)}>{row.status === 'aguardando_devolucao' ? <><CheckCircle2 size={14} /> Registrar devolução</> : 'Editar registro'}</button>
            </div>
          </article>
        ))}
      </div>

      {modal && (
        <Modal title={modal.form.id ? 'Atualizar achado' : 'Registrar achado'} onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" type="submit" form="f-achado">Salvar</button></>}>
          <form id="f-achado" className="form-grid" onSubmit={handleSubmit}>
            <label><span className="form-label">Lacre</span><input className="input" value={modal.form.lacre} onChange={event => updateForm('lacre', event.target.value)} /></label>
            <label><span className="form-label">Número de série</span><input className="input" value={modal.form.numero_serie} onChange={event => updateForm('numero_serie', event.target.value)} /></label>
            <label><span className="form-label">Marca</span><select className="input" value={modal.form.marca} onChange={event => updateForm('marca', event.target.value)}><option value="">Não informada</option><option value="intelbras">Intelbras</option><option value="plantronics">Plantronics</option></select></label>
            <label><span className="form-label">Status</span><select className="input" value={modal.form.status} onChange={event => updateForm('status', event.target.value)}>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span className="form-label">Local guardado</span><input className="input" value={modal.form.localizacao} onChange={event => updateForm('localizacao', event.target.value)} placeholder="Ex: Sala de TI" required /></label>
            <label><span className="form-label">Quem encontrou/recebeu</span><input className="input" value={modal.form.encontrado_por} onChange={event => updateForm('encontrado_por', event.target.value)} /></label>
            <label><span className="form-label">Número do chamado</span><input className="input" value={modal.form.chamado} onChange={event => updateForm('chamado', event.target.value)} /></label>
            <label><span className="form-label">Devolvido para</span><input className="input" value={modal.form.devolvido_para} onChange={event => updateForm('devolvido_para', event.target.value)} disabled={modal.form.status !== 'devolvido'} /></label>
            <label className="full"><span className="form-label">Observações</span><textarea className="input" rows={3} value={modal.form.observacoes} onChange={event => updateForm('observacoes', event.target.value)} placeholder="Detalhes para identificar e devolver o equipamento" /></label>
          </form>
        </Modal>
      )}

      <style>{`
        .achados-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
        .achados-header .page-subtitle { margin-bottom: 0; }
        .achados-toolbar { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .achados-toolbar select { min-width: 210px; }
        .achados-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
        .achado-card { gap: 1rem; }
        .achado-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .achado-card-head strong, .achado-card-head span { display: block; }
        .achado-details { display: flex; flex-direction: column; gap: 0.45rem; color: var(--text-muted); font-size: 0.8rem; }
        .achado-details span { display: flex; align-items: center; gap: 0.4rem; }
        .achado-notes { border-top: 1px solid var(--border); padding-top: 0.75rem; margin: 0; }
        .achado-actions { display: flex; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 0.75rem; }
        @media (max-width: 640px) { .achados-toolbar { align-items: stretch; flex-direction: column; } .achados-toolbar select { min-width: 0; } .achados-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
