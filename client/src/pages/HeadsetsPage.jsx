import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  RefreshCcw, 
  History, 
  MoreHorizontal, 
  UserPlus, 
  UserMinus,
  AlertTriangle,
  RotateCcw,
  FileText,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { HEADSET_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { useToast } from '../components/Toast'
import {
  atualizarHeadset,
  criarHeadset,
  listarHistoricoHeadset,
  listarHeadsets,
  removerHeadset,
  trocarLacreHeadset,
  trocarHeadset,
} from '../services/headsetsApi'

const PAGE_SIZE = 20

/**
 * Mapeia o status técnico para classes CSS de badge premium.
 */
function getBadgeClass(status) {
  const map = {
    em_uso: 'badge-success',
    estoque: 'badge-info',
    manutencao: 'badge-warning',
    defeito: 'badge-danger',
    reserva: 'badge-info',
    desligado: 'badge-danger',
    emprestimo: 'badge-info',
    entrega: 'badge-warning',
    perdido: 'badge-danger',
    furtado: 'badge-danger',
  }
  return `badge ${map[status] || 'badge-info'}`
}

/**
 * Mapeia categorias para exibição amigável.
 */
function categoryLabel(value) {
  const map = {
    estoque: 'Estoque',
    emprestimo: 'Empréstimo',
    entrega: 'Entrega',
    manutencao: 'Manutenção',
    operacao: 'Operação',
  }
  return map[value] ?? value ?? '—'
}

/**
 * Normaliza os dados vindos da API para o componente.
 */
function mapRow(r) {
  return {
    id: r.id,
    matricula: r.matricula,
    lacre: r.lacre,
    marca: r.marca ?? '',
    numeroSerie: r.numero_serie ?? '',
    status: r.status,
    categoria: r.categoria ?? 'estoque',
    observacoes: r.observacoes ?? '',
    atualizadoEm: r.updated_at,
  }
}

const emptyForm = () => ({
  id: null,
  matricula: '',
  lacre: '',
  marca: '',
  numeroSerie: '',
  status: 'estoque',
  observacoes: '',
})

/**
 * Gerenciamento de Headsets
 * Permite controle total do inventário, vínculos e histórico.
 */
export function HeadsetsPage() {
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [categoriaFilter, setCategoriaFilter] = useState(searchParams.get('categoria') || '')
  const [viewMode, setViewMode] = useState('inventario')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(null)

  // Headsets disponíveis para substituição
  const disponiveisParaTroca = useMemo(() => {
    return items.filter(h => h.status === 'estoque' || h.status === 'reserva')
  }, [items])

  // Carrega os dados da API
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listarHeadsets()
      setItems(Array.isArray(data) ? data.map(mapRow) : [])
    } catch (e) {
      setError(e.message || 'Falha ao carregar')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Sincroniza filtros com a URL para permitir compartilhamento de links
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (statusFilter) next.set('status', statusFilter)
    else next.delete('status')
    if (categoriaFilter) next.set('categoria', categoriaFilter)
    else next.delete('categoria')
    setSearchParams(next, { replace: true })
  }, [statusFilter, categoriaFilter, searchParams, setSearchParams])

  // Lógica de filtragem otimizada
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((h) => {
      if (statusFilter && String(h.status) !== statusFilter) return false
      if (categoriaFilter && String(h.categoria) !== categoriaFilter) return false
      if (!s) return true
      const blob = `${h.matricula} ${h.lacre} ${h.marca} ${h.numeroSerie} ${h.categoria} ${h.observacoes} ${labelByValue(HEADSET_STATUS, h.status)}`.toLowerCase()
      return blob.includes(s)
    })
  }, [items, q, statusFilter, categoriaFilter])

  // Define os itens visíveis com base no modo (Inventário ou Vínculos)
  const visibleRows = useMemo(() => {
    if (viewMode === 'inventario') return filtered
    return filtered.filter((h) => h.matricula && (h.status === 'em_uso' || h.status === 'emprestimo'))
  }, [filtered, viewMode])

  // Paginação
  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE
    return visibleRows.slice(start, start + PAGE_SIZE)
  }, [visibleRows, page])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(visibleRows.length / PAGE_SIZE) - 1)
    setPage((p) => Math.min(p, maxPage))
  }, [visibleRows.length])

  // Handlers para Modais
  const openNew = () => setModal({ mode: 'edit', form: emptyForm() })
  const openEdit = (row) => setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })
  const openVincular = (row) => setModal({ mode: 'vincular', form: { id: row.id, lacre: row.lacre, matricula: row.matricula ?? '', observacoes: row.observacoes ?? '', isEmprestimo: false } })
  const openEmprestimo = (row) => setModal({ mode: 'vincular', form: { id: row.id, lacre: row.lacre, matricula: row.matricula ?? '', observacoes: row.observacoes ?? '', isEmprestimo: true } })
  const openTrocaLacre = (row) => setModal({ mode: 'trocaLacre', form: { id: row.id, lacreAtual: row.lacre, novoLacre: '', observacao: '' } })
  const openTroca = (row) => setModal({ mode: 'troca', headset: row, form: { id_novo: '', status_novo_original: 'defeito', observacao: '' } })
  const openAcoes = (row) => setModal({ mode: 'acoes', headset: row })

  // Carregamento de histórico
  async function openHistorico(row) {
    setModal({ mode: 'historico', headset: row, loading: true, rows: [], error: '' })
    try {
      const data = await listarHistoricoHeadset(row.id)
      setModal({ mode: 'historico', headset: row, loading: false, rows: Array.isArray(data) ? data : [], error: '' })
    } catch (err) {
      setModal({ mode: 'historico', headset: row, loading: false, rows: [], error: err.message || 'Falha ao carregar histórico' })
    }
  }

  // Persistência de dados (Criar/Editar)
  async function handleSubmit(e) {
    e.preventDefault()
    const f = modal.form
    const body = {
      matricula: f.matricula.trim(),
      lacre: f.lacre.trim(),
      marca: f.marca.trim(),
      numero_serie: f.numeroSerie.trim(),
      status: f.status,
      categoria: f.categoria,
      observacoes: f.observacoes.trim(),
    }

    // Regra de segurança: evitar duplicidade de número de série em uso
    if (body.status === 'em_uso' && body.numero_serie.trim()) {
      const duplicado = items.some(h => h.status === 'em_uso' && h.numeroSerie === body.numero_serie && h.id !== f.id)
      if (duplicado) return addToast('Este número de série já está em uso em outro registro.', 'error')
    }
    
    try {
      if (f.id) await atualizarHeadset(f.id, body)
      else await criarHeadset(body)
      setModal(null)
      addToast('Alterações salvas com sucesso!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao salvar', 'error') }
  }

  // Troca de Lacre
  async function handleTrocaLacre(e) {
    e.preventDefault()
    const f = modal.form
    if (!f.novoLacre.trim()) return addToast('Informe o novo lacre.', 'warning')
    try {
      await trocarLacreHeadset(f.id, { novo_lacre: f.novoLacre.trim(), observacao: f.observacao.trim() })
      setModal(null)
      addToast('Lacre atualizado com sucesso!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao trocar lacre', 'error') }
  }

  // Vincular Operador ou Empréstimo
  async function handleVincular(e) {
    e.preventDefault()
    const f = modal.form
    if (!f.matricula.trim()) return addToast('Informe a matrícula.', 'warning')
    try {
      const row = items.find(h => h.id === f.id)
      await atualizarHeadset(f.id, {
        matricula: f.matricula.trim(),
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie, // FIX: backend expects numero_serie
        status: f.isEmprestimo ? 'emprestimo' : 'em_uso',
        categoria: f.isEmprestimo ? 'emprestimo' : 'operacao',
        observacoes: f.observacoes.trim()
      })
      setModal(null)
      addToast(f.isEmprestimo ? 'Empréstimo registrado!' : 'Vínculo realizado!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao vincular', 'error') }
  }

  // Troca de Headset (Defeito/Perda/Furto)
  async function handleTroca(e) {
    e.preventDefault()
    const { headset, form } = modal
    if (!form.id_novo) return addToast('Selecione o novo headset.', 'warning')
    if (!form.status_novo_original) return addToast('Selecione o motivo da troca.', 'warning')

    const novoHeadset = items.find(h => h.id === form.id_novo)
    const msg = `Confirmar a troca do lacre ${headset.lacre} pelo ${novoHeadset.lacre}?\nO headset antigo ficará com status "${labelByValue(HEADSET_STATUS, form.status_novo_original)}".`

    if (!confirm(msg)) return

    try {
      await trocarHeadset(headset.id, {
        id_novo: form.id_novo,
        status_novo_original: form.status_novo_original,
        observacao: form.observacao.trim()
      })
      setModal(null)
      addToast('Troca realizada com sucesso!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao realizar troca', 'error') }
  }

  // Dar Baixa no Operador / Empréstimo
  async function handleBaixaOperador(row) {
    const isEmprestimo = row.status === 'emprestimo'
    const msg = isEmprestimo 
      ? `Confirmar baixa de empréstimo do lacre ${row.lacre}?`
      : `Confirmar baixa do operador no lacre ${row.lacre}?`
    
    if (!confirm(msg)) return
    try {
      await atualizarHeadset(row.id, {
        matricula: '',
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status: 'estoque',
        observacoes: `Baixa de ${isEmprestimo ? 'empréstimo' : 'operador'} realizada em ${new Date().toLocaleString('pt-BR')}`
      })
      setModal(null)
      addToast('Baixa realizada com sucesso!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao dar baixa', 'error') }
  }

  // Atualização Rápida de Status
  async function handleStatusRapido(row, status) {
    try {
      await atualizarHeadset(row.id, {
        matricula: (status === 'estoque' || status === 'defeito' || status === 'manutencao') ? '' : row.matricula || '',
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status,
        observacoes: `Status alterado para ${status} em ${new Date().toLocaleString('pt-BR')}`
      })
      setModal(null)
      addToast(`Status atualizado para ${labelByValue(HEADSET_STATUS, status)}`)
      await load()
    } catch (err) { addToast(err.message || 'Erro ao alterar status', 'error') }
  }

  // Deleção de registro
  async function handleDelete(id) {
    if (!confirm('Esta ação é irreversível. Remover este headset?')) return
    try {
      await removerHeadset(id)
      setModal(null)
      addToast('Registro removido com sucesso!')
      await load()
    } catch (err) { addToast(err.message || 'Erro ao excluir', 'error') }
  }

  return (
    <div className="page-fade-in">
      <header className="page-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">Headsets</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Gestão de inventário e atribuição de equipamentos.</p>
        </div>
        <div className="row gap">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hide-mobile">Atualizar</span>
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} />
            Novo Headset
          </button>
        </div>
      </header>

      {error && (
        <div className="badge badge-danger w-full" style={{ marginBottom: '1.5rem', padding: '1rem', justifyContent: 'center' }}>
          <AlertTriangle size={16} style={{ marginRight: 8 }} />
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Navegação entre modos de visualização */}
      <div className="segmented-control" style={{ marginBottom: '1.5rem' }}>
        <button 
          className={`segment ${viewMode === 'inventario' ? 'active' : ''}`}
          onClick={() => { setViewMode('inventario'); setPage(0); }}
        >
          Inventário Completo
        </button>
        <button 
          className={`segment ${viewMode === 'vinculos' ? 'active' : ''}`}
          onClick={() => { setViewMode('vinculos'); setStatusFilter('em_uso'); setPage(0); }}
        >
          Vínculos Ativos
        </button>
      </div>

      {/* Toolbar de Filtros */}
      <div className="card toolbar-premium">
        <div className="input-with-icon">
          <Search size={18} className="icon" />
          <input 
            type="search" 
            className="input w-full" 
            placeholder="Buscar por lacre, matrícula ou série..." 
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
          {HEADSET_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select 
          className="input" 
          value={categoriaFilter} 
          onChange={(e) => { setCategoriaFilter(e.target.value); setPage(0); }}
        >
          <option value="">Todas Categorias</option>
          <option value="estoque">Estoque</option>
          <option value="operacao">Operação</option>
          <option value="manutencao">Manutenção</option>
          <option value="emprestimo">Empréstimo</option>
          <option value="entrega">Entrega</option>
        </select>
      </div>

      {/* Tabela de Dados */}
      <div className="table-container shadow-lg">
        <table>
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Lacre</th>
              <th>Marca</th>
              <th>Série</th>
              <th>Status</th>
              <th>Categoria</th>
              <th>Última Alt.</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 muted">Carregando dados...</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 muted">Nenhum registro encontrado.</td></tr>
            ) : (
              pageItems.map((h) => (
                <tr key={h.id}>
                  <td><strong>{h.matricula || '—'}</strong></td>
                  <td><code className="mono text-accent">{h.lacre}</code></td>
                  <td>{h.marca || '—'}</td>
                  <td className="mono small">{h.numeroSerie || '—'}</td>
                  <td>
                    <span className={getBadgeClass(h.status)}>
                      {labelByValue(HEADSET_STATUS, h.status)}
                    </span>
                  </td>
                  <td><span className="muted small">{categoryLabel(h.categoria)}</span></td>
                  <td className="small muted">
                    {h.atualizadoEm ? new Date(h.atualizadoEm).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row gap" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-icon" title="Ações Rápidas" onClick={() => openAcoes(h)}>
                        <MoreHorizontal size={16} />
                      </button>
                      <button className="btn btn-secondary btn-icon" title="Ver Histórico" onClick={() => openHistorico(h)}>
                        <History size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={visibleRows.length} onPageChange={setPage} />

      {/* Modal: Criar / Editar */}
      {modal?.mode === 'edit' && (
        <Modal
          title={modal.form.id ? 'Editar Equipamento' : 'Novo Cadastro'}
          onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-hs" className="btn btn-primary">Salvar Alterações</button></>}
        >
          <form id="f-hs" className="form-grid" onSubmit={handleSubmit}>
            <label>Matrícula (Opcional)<input className="input" value={modal.form.matricula} onChange={e => setModal(m => ({...m, form: {...m.form, matricula: e.target.value}}))} /></label>
            <label>Lacre<input className="input mono" value={modal.form.lacre} onChange={e => setModal(m => ({...m, form: {...m.form, lacre: e.target.value}}))} required /></label>
            <label>Marca
              <select className="input" value={modal.form.marca} onChange={e => setModal(m => ({...m, form: {...m.form, marca: e.target.value}}))}>
                <option value="">Selecione</option>
                <option value="intelbras">Intelbras</option>
                <option value="plantronics">Plantronics</option>
              </select>
            </label>
            <label>Número de Série<input className="input mono" value={modal.form.numeroSerie} onChange={e => setModal(m => ({...m, form: {...m.form, numeroSerie: e.target.value}}))} /></label>
            <label className="full">Status
              <select className="input" value={modal.form.status} onChange={e => setModal(m => ({...m, form: {...m.form, status: e.target.value}}))}>
                {HEADSET_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="full">Observações Técnicas<textarea className="input" rows={3} value={modal.form.observacoes} onChange={e => setModal(m => ({...m, form: {...m.form, observacoes: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Ações Rápidas */}
      {modal?.mode === 'acoes' && (
        <Modal 
          title={`Gestão: ${modal.headset.lacre}`} 
          size="sm"
          onClose={() => setModal(null)}
        >
          <div className="action-grid-premium" style={{ gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <button className="btn btn-secondary w-full" onClick={() => openEdit(modal.headset)}>
              <FileText size={16} /> Editar Cadastro
            </button>
            
            {(modal.headset.status === 'estoque' || modal.headset.status === 'reserva') && (
              <>
                <button className="btn btn-primary w-full" onClick={() => openVincular(modal.headset)}>
                  <UserPlus size={16} /> Vincular Operador
                </button>
                <button className="btn btn-secondary w-full" style={{ border: '1px solid var(--accent)' }} onClick={() => openEmprestimo(modal.headset)}>
                  <RefreshCcw size={16} /> Registrar Empréstimo
                </button>
              </>
            )}

            {(modal.headset.status === 'em_uso' || modal.headset.status === 'emprestimo') && modal.headset.matricula && (
              <>
                <button className="btn btn-primary w-full" style={{ background: 'var(--warning)', borderColor: 'var(--warning)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }} onClick={() => openTroca(modal.headset)}>
                  <RefreshCcw size={16} /> Trocar Headset (Defeito/Perda)
                </button>
                <button className="btn btn-secondary w-full" onClick={() => handleBaixaOperador(modal.headset)}>
                  <UserMinus size={16} /> {modal.headset.status === 'emprestimo' ? 'Encerrar Empréstimo' : 'Dar Baixa do Operador'}
                </button>
              </>
            )}

            {(modal.headset.status === 'em_uso' || modal.headset.status === 'estoque' || modal.headset.status === 'emprestimo') && (
              <button className="btn btn-secondary w-full text-danger" onClick={() => handleStatusRapido(modal.headset, 'defeito')}>
                <AlertTriangle size={16} /> Marcar com Defeito
              </button>
            )}

            {(modal.headset.status === 'defeito' || modal.headset.status === 'manutencao') && (
              <button className="btn btn-secondary w-full" style={{ color: 'var(--success)' }} onClick={() => handleStatusRapido(modal.headset, 'estoque')}>
                <CheckCircle size={16} /> Retorno da Manutenção
              </button>
            )}

            <button className="btn btn-secondary w-full" onClick={() => openTrocaLacre(modal.headset)}>
              <RotateCcw size={16} /> Trocar Lacre
            </button>
            
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-secondary w-full text-danger" onClick={() => handleDelete(modal.headset.id)}>
                <Trash2 size={16} /> Excluir Registro
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Vincular */}
      {modal?.mode === 'vincular' && (
        <Modal 
          title={modal.form.isEmprestimo ? `Registrar Empréstimo: ${modal.form.lacre}` : `Vincular Operador: ${modal.form.lacre}`} 
          onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-vinc" className="btn btn-primary">{modal.form.isEmprestimo ? 'Confirmar Empréstimo' : 'Confirmar Vínculo'}</button></>}
        >
          <form id="f-vinc" className="form-grid" onSubmit={handleVincular}>
            <label className="full">Matrícula do {modal.form.isEmprestimo ? 'Colaborador' : 'Operador'}<input className="input" value={modal.form.matricula} onChange={e => setModal(m => ({...m, form: {...m.form, matricula: e.target.value}}))} required autoFocus /></label>
            <label className="full">Observações de {modal.form.isEmprestimo ? 'Empréstimo' : 'Entrega'}<textarea className="input" rows={3} value={modal.form.observacoes} onChange={e => setModal(m => ({...m, form: {...m.form, observacoes: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Trocar Lacre */}
      {modal?.mode === 'trocaLacre' && (
        <Modal 
          title="Substituir Lacre" 
          onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-lacre" className="btn btn-primary">Atualizar Lacre</button></>}
        >
          <form id="f-lacre" className="form-grid" onSubmit={handleTrocaLacre}>
            <label>Lacre Atual<input className="input mono" value={modal.form.lacreAtual} disabled /></label>
            <label>Novo Lacre<input className="input mono" value={modal.form.novoLacre} onChange={e => setModal(m => ({...m, form: {...m.form, novoLacre: e.target.value}}))} required autoFocus /></label>
            <label className="full">Motivo da Troca<textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Troca de Headset (Defeito/Perda/Furto) */}
      {modal?.mode === 'troca' && (
        <Modal 
          title={`Troca de Equipamento: ${modal.headset.lacre}`} 
          onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-swap" className="btn btn-primary" style={{ background: 'var(--warning)' }}>Confirmar Troca</button></>}
        >
          <form id="f-swap" className="form-grid" onSubmit={handleTroca}>
            <div className="full badge badge-info" style={{ padding: '0.75rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              Operador: {modal.headset.matricula}
            </div>
            
            <label className="full">Novo Headset (Disponível em Estoque)
              <select 
                className="input" 
                value={modal.form.id_novo} 
                onChange={e => setModal(m => ({...m, form: {...m.form, id_novo: e.target.value}}))}
                required
              >
                <option value="">Selecione um headset do estoque...</option>
                {disponiveisParaTroca.map(h => (
                  <option key={h.id} value={h.id}>
                    Lacre: {h.lacre} | {h.marca} {h.numeroSerie ? `(SN: ${h.numeroSerie})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="full">Motivo da Troca / Destino do Antigo
              <select 
                className="input" 
                value={modal.form.status_novo_original} 
                onChange={e => setModal(m => ({...m, form: {...m.form, status_novo_original: e.target.value}}))}
                required
              >
                <option value="defeito">Defeito Técnico</option>
                <option value="perdido">Equipamento Perdido</option>
                <option value="furtado">Equipamento Furtado</option>
                <option value="manutencao">Encaminhar para Manutenção</option>
              </select>
            </label>

            <label className="full">Observações Adicional<textarea className="input" rows={3} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} placeholder="Descreva o defeito ou circunstância..." /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Histórico */}
      {modal?.mode === 'historico' && (
        <Modal 
          title={`Histórico: ${modal.headset.lacre}`} 
          onClose={() => setModal(null)} 
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>}
          size="lg"
        >
          {modal.loading ? <p className="muted py-4">Carregando histórico...</p> : 
           modal.rows.length === 0 ? <p className="muted py-4">Nenhuma alteração registrada.</p> : (
            <div className="table-container" style={{ marginTop: 0, maxHeight: '400px' }}>
              <table>
                <thead>
                  <tr><th>Data</th><th>Ação</th><th>Campo</th><th>De</th><th>Para</th></tr>
                </thead>
                <tbody>
                  {modal.rows.map(r => (
                    <tr key={r.id}>
                      <td className="small muted">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                      <td>{r.acao}</td>
                      <td>{r.campo || '—'}</td>
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

