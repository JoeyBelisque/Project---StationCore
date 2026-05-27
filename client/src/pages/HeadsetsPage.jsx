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
  XCircle,
  Calendar,
  CheckSquare,
  Square,
  Package,
  Wrench,
  Eye,
  Tag,
  Hash,
  Info,
  User as UserIcon,
  ChevronRight,
  Filter,
  Layers,
  ArrowDownLeft,
  Settings2
} from 'lucide-react'
import { HEADSET_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { useToast } from '../components/Toast'
import {
  atualizarHeadset,
  atualizarHeadsetsEmLote,
  criarHeadset,
  listarHistoricoHeadset,
  listarHeadsets,
  removerHeadset,
  trocarLacreHeadset,
  trocarHeadset,
  desligarOperador,
} from '../services/headsetsApi'

const PAGE_SIZE = 20

const CATEGORIA_LABELS = {
  estoque: 'Operação',
  emprestimo: 'Empréstimo',
}

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

function mapRow(r) {
  return {
    id: r.id,
    nome: r.nome ?? '',
    nomeOperador: r.nome_operador ?? '',
    matricula: r.matricula ?? '',
    lacre: r.lacre ?? '',
    marca: r.marca ?? '',
    numeroSerie: r.numero_serie ?? '',
    status: r.status,
    categoria: r.categoria ?? 'estoque',
    observacoes: r.observacoes ?? '',
    dataDevolucao: r.data_devolucao,
    dataEnvioManutencao: r.data_envio_manutencao,
    atualizadoEm: r.updated_at,
    criadoEm: r.created_at,
  }
}

const emptyForm = () => ({
  id: null,
  nome: '',
  nomeOperador: '',
  matricula: '',
  lacre: '',
  marca: '',
  numeroSerie: '',
  status: 'estoque',
  categoria: 'estoque',
  observacoes: '',
})

export function HeadsetsPage() {
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [recentUpdates, setRecentUpdates] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  
  const [statusFilter, setStatusFilter] = useState(() => 
    searchParams.get('status') || localStorage.getItem('hs_filter_status') || ''
  )
  const [categoriaFilter, setCategoriaFilter] = useState(() => 
    searchParams.get('categoria') || localStorage.getItem('hs_filter_categoria') || ''
  )
  
  const [viewMode, setViewMode] = useState('inventario')
  const [isCompact, setIsCompact] = useState(() => localStorage.getItem('hs_compact') === 'true')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    localStorage.setItem('hs_compact', isCompact)
  }, [isCompact])

  useEffect(() => {
    localStorage.setItem('hs_filter_status', statusFilter)
    localStorage.setItem('hs_filter_categoria', categoriaFilter)
  }, [statusFilter, categoriaFilter])

  const disponiveisParaTroca = useMemo(() => {
    return items.filter(h => h.status === 'estoque' || h.status === 'reserva')
  }, [items])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listarHeadsets()
      setItems(Array.isArray(data) ? data.map(mapRow) : [])
      setSelectedIds(new Set())
    } catch (e) {
      setError(e.message || 'Falha ao carregar')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (statusFilter) next.set('status', statusFilter)
    else next.delete('status')
    if (categoriaFilter) next.set('categoria', categoriaFilter)
    else next.delete('categoria')
    setSearchParams(next, { replace: true })
  }, [statusFilter, categoriaFilter, searchParams, setSearchParams])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((h) => {
      if (statusFilter && String(h.status) !== statusFilter) return false
      if (categoriaFilter && String(h.categoria) !== categoriaFilter) return false
      if (!s) return true
      const blob = `${h.nome} ${h.nomeOperador} ${h.matricula} ${h.lacre} ${h.marca} ${h.numeroSerie} ${h.categoria} ${labelByValue(HEADSET_STATUS, h.status)}`.toLowerCase()
      return blob.includes(s)
    })
  }, [items, q, statusFilter, categoriaFilter])

  const visibleRows = useMemo(() => {
    if (viewMode === 'inventario') return filtered
    return filtered.filter((h) => (h.matricula || h.nomeOperador) && (h.status === 'em_uso' || h.status === 'emprestimo'))
  }, [filtered, viewMode])

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE
    return visibleRows.slice(start, start + PAGE_SIZE)
  }, [visibleRows, page])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(visibleRows.length / PAGE_SIZE) - 1)
    setPage((p) => Math.min(p, maxPage))
  }, [visibleRows.length])

  // Handlers de Seleção
  const toggleSelect = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pageItems.length && pageItems.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pageItems.map(i => i.id)))
    }
  }

  // Handlers para Modais
  const openNew = () => setModal({ mode: 'edit', form: emptyForm() })
  const openEdit = (row) => setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })
  const openView = (row) => setModal({ mode: 'view', headset: row })
  const openVincular = (row) => setModal({ mode: 'vincular', form: { id: row.id, lacre: row.lacre, matricula: row.matricula ?? '', nomeOperador: row.nomeOperador ?? '', observacoes: row.observacoes ?? '', dataDevolucao: '', isEmprestimo: false } })
  const openEmprestimo = (row) => setModal({ mode: 'vincular', form: { id: row.id, lacre: row.lacre, matricula: row.matricula ?? '', nomeOperador: row.nomeOperador ?? '', observacoes: row.observacoes ?? '', dataDevolucao: '', isEmprestimo: true } })
  const openTrocaLacre = (row) => setModal({ mode: 'trocaLacre', form: { id: row.id, lacreAtual: row.lacre, novoLacre: '', observacao: '' } })
  const openTroca = (row) => setModal({ mode: 'troca', headset: row, form: { id_novo: '', status_novo_original: 'defeito', observacao: '' } })
  const openRetornoManutencao = (row) => setModal({ mode: 'retornoManutencao', form: { id: row.id, lacre: row.lacre, custo: '', pecas: '', observacao: '' } })
  const openAcoes = (row) => setModal({ mode: 'acoes', headset: row })
  
  const openDesligamento = () => setModal({ 
    mode: 'desligamento', 
    form: { 
      matricula: '', 
      observacao: '' 
    } 
  })

  const openBaixa = (row) => setModal({ 
    mode: 'baixa', 
    headset: row, 
    form: { 
      status: 'estoque', 
      observacao: '' 
    } 
  })

  const openBatchToStock = () => {
    const targets = items.filter(h => selectedIds.has(h.id) && h.status !== 'em_uso')
    if (targets.length === 0) return addToast('Nenhum equipamento passível de retorno selecionado.', 'warning')
    setModal({ mode: 'batchStock', count: targets.length, form: { observacao: '' } })
  }

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

  // Ações de Persistência
  async function handleSubmit(e) {
    e.preventDefault()
    const f = modal.form
    const body = {
      nome: f.nome.trim(),
      nome_operador: f.nomeOperador.trim(),
      matricula: f.matricula.trim(),
      lacre: f.lacre.trim(),
      marca: f.marca.trim(),
      numero_serie: f.numeroSerie.trim(),
      status: f.status,
      categoria: f.categoria,
      observacoes: f.observacoes.trim(),
    }
    
    try {
      if (f.id) await atualizarHeadset(f.id, body)
      else await criarHeadset(body)
      
      if (f.id) {
        setRecentUpdates(new Set([f.id]))
        setTimeout(() => setRecentUpdates(new Set()), 3000)
      }

      setModal(null)
      addToast('Alterações salvas com sucesso!')
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  async function handleBatchToStock(e) {
    e.preventDefault()
    const targets = items.filter(h => selectedIds.has(h.id) && h.status !== 'em_uso')
    const ids = targets.map(t => t.id)
    try {
      setLoading(true)
      await atualizarHeadsetsEmLote(ids, { 
        status: 'estoque',
        observacoes: modal.form.observacao.trim() || 'Retorno em lote ao estoque'
      })
      setRecentUpdates(new Set(ids))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      addToast(`${ids.length} equipamentos movidos para estoque!`)
      setModal(null)
      await load()
    } catch (err) { addToast(err.message, 'error') } finally { setLoading(false) }
  }

  async function handleVincular(e) {
    e.preventDefault()
    const f = modal.form
    try {
      const row = items.find(h => h.id === f.id)
      await atualizarHeadset(f.id, {
        nome: row.nome,
        matricula: f.matricula.trim(),
        nome_operador: f.nomeOperador.trim(),
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status: f.isEmprestimo ? 'emprestimo' : 'em_uso',
        categoria: row.categoria,
        data_devolucao: f.isEmprestimo && f.dataDevolucao ? f.dataDevolucao : null
      })
      setRecentUpdates(new Set([f.id]))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      setModal(null)
      addToast(f.isEmprestimo ? 'Empréstimo registrado!' : 'Vínculo realizado!')
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  async function handleStatusRapido(row, status) {
    try {
      await atualizarHeadset(row.id, {
        nome: row.nome,
        nome_operador: (status === 'estoque' || status === 'defeito' || status === 'manutencao' || status === 'perdido' || status === 'furtado') ? '' : row.nomeOperador,
        matricula: (status === 'estoque' || status === 'defeito' || status === 'manutencao' || status === 'perdido' || status === 'furtado') ? '' : row.matricula,
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status,
        categoria: row.categoria,
        data_envio_manutencao: status === 'manutencao' ? new Date().toISOString() : (status === 'estoque' ? null : row.dataEnvioManutencao)
      })
      setRecentUpdates(new Set([row.id]))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      addToast(`Status atualizado para ${labelByValue(HEADSET_STATUS, status)}`)
      setModal(null)
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  async function handleBaixaOperador(e) {
    e.preventDefault()
    const { headset, form } = modal
    const isLoan = headset.status === 'emprestimo'
    
    // B. Automação de Observações (Auditoria)
    const dataHora = new Date().toLocaleString('pt-BR')
    const userLog = `[AUTO] ${dataHora}: Recebido de ${headset.nomeOperador || 'Mat:' + headset.matricula || 'N/I'} em estado ${labelByValue(HEADSET_STATUS, form.status).toUpperCase()}.`
    const novaObs = form.observacao.trim() 
      ? `${userLog}\nMotivo: ${form.observacao.trim()}\n---\n${headset.observacoes}`
      : `${userLog}\n---\n${headset.observacoes}`

    try {
      await atualizarHeadset(headset.id, {
        nome: headset.nome,
        matricula: '',
        nome_operador: '',
        lacre: headset.lacre,
        marca: headset.marca,
        numero_serie: headset.numeroSerie,
        status: form.status,
        categoria: headset.categoria,
        data_devolucao: null,
        observacoes: novaObs.slice(0, 1000) // Limite de segurança para o campo
      })
      setRecentUpdates(new Set([headset.id]))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      addToast(isLoan ? 'Empréstimo encerrado!' : 'Equipamento recolhido!')
      setModal(null)
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  async function handleTrocaLacre(e) {
    e.preventDefault()
    const { id, novoLacre, observacao } = modal.form
    try {
      await trocarLacreHeadset(id, { novo_lacre: novoLacre.trim(), observacao: observacao.trim() })
      setRecentUpdates(new Set([id]))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      addToast('Lacre atualizado com sucesso!')
      setModal(null)
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  async function handleRetornoManutencao(e) {
    e.preventDefault()
    const f = modal.form
    const row = items.find(h => h.id === f.id)
    try {
      await atualizarHeadset(f.id, {
        nome: row.nome,
        matricula: '',
        nome_operador: '',
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status: 'estoque',
        categoria: row.categoria,
        data_envio_manutencao: null,
        observacoes: `Retorno de manutenção em ${new Date().toLocaleDateString('pt-BR')}. Custo: R$${f.custo}. Peças: ${f.pecas}. ${f.observacao}\n---\n${row.observacoes}`.slice(0, 1000)
      })
      setRecentUpdates(new Set([f.id]))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      setModal(null)
      addToast('Equipamento retornou ao estoque com sucesso!')
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  async function handleTroca(e) {
    e.preventDefault()
    const { headset, form } = modal
    if (!form.id_novo) return addToast('Selecione o novo headset.', 'warning')
    try {
      await trocarHeadset(headset.id, {
        id_novo: form.id_novo,
        status_novo_original: form.status_novo_original,
        observacao: form.observacao.trim()
      })
      setRecentUpdates(new Set([form.id_novo]))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      setModal(null)
      addToast('Troca realizada com sucesso!')
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  async function handleDesligamento(e) {
    e.preventDefault()
    const { matricula, observacao } = modal.form
    if (!matricula.trim()) return addToast('Informe a matrícula do operador.', 'warning')
    
    try {
      setLoading(true)
      const res = await desligarOperador(matricula.trim(), { observacao: observacao.trim() })
      addToast(`Sucesso! ${res.count} equipamento(s) recolhidos para estoque.`, 'success')
      setModal(null)
      await load()
    } catch (err) { 
      addToast(err.message || 'Erro ao realizar desligamento', 'error') 
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir permanentemente este registro?')) return
    try {
      await removerHeadset(id)
      addToast('Registro excluído com sucesso!')
      setModal(null)
      await load()
    } catch (err) { addToast(err.message, 'error') }
  }

  const selectedCount = selectedIds.size
  const canMoveCount = items.filter(h => selectedIds.has(h.id) && h.status !== 'em_uso').length
  const inUseSelected = selectedCount - canMoveCount

  return (
    <div className="page-fade-in">
      <header className="page-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">Headsets</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Gestão de inventário e atribuição de equipamentos.</p>
        </div>
        <div className="row gap">
          <button className={`btn btn-secondary ${isCompact ? 'active' : ''}`} onClick={() => setIsCompact(!isCompact)} title="Alternar Visualização"><MoreHorizontal size={16} /></button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button className="btn btn-secondary text-danger" onClick={openDesligamento} title="Baixa por Desligamento"><UserMinus size={16} /><span className="hide-mobile">Desligamento</span></button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Cadastro</button>
        </div>
      </header>

      {/* SELETOR DE DESTINAÇÃO NO TOPO */}
      <div className="segmented-control" style={{ marginBottom: '1.5rem', maxWidth: '450px' }}>
        <button className={`segment ${categoriaFilter === '' ? 'active' : ''}`} onClick={() => setCategoriaFilter('')}>
          <Layers size={14} /> Todos
        </button>
        <button className={`segment ${categoriaFilter === 'estoque' ? 'active' : ''}`} onClick={() => setCategoriaFilter('estoque')}>
          <Package size={14} /> Operação
        </button>
        <button className={`segment ${categoriaFilter === 'emprestimo' ? 'active' : ''}`} onClick={() => setCategoriaFilter('emprestimo')}>
          <Calendar size={14} /> Empréstimos
        </button>
      </div>

      <div className="segmented-control" style={{ marginBottom: '1.5rem', width: 'fit-content' }}>
        <button className={`segment ${viewMode === 'inventario' ? 'active' : ''}`} onClick={() => setViewMode('inventario')}>Visão Geral</button>
        <button className={`segment ${viewMode === 'vinculos' ? 'active' : ''}`} onClick={() => setViewMode('vinculos')}>Vínculos Ativos</button>
      </div>

      <div className="card toolbar-premium">
        <div className="input-with-icon">
          <Search size={18} className="icon" />
          <input type="search" className="input w-full" placeholder="Buscar por nome, lacre, série ou operador..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="row gap wrap">
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Condição (Todos)</option>
            {HEADSET_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn btn-secondary btn-icon" onClick={() => { setStatusFilter(''); setCategoriaFilter(''); setQ(''); }} title="Limpar Filtros">
            <XCircle size={18} />
          </button>
        </div>
      </div>

      {/* Barra de Ações em Lote */}
      {selectedCount > 0 && (
        <div className="batch-actions-bar card" style={{ marginBottom: '1.5rem', background: 'var(--accent-glow)', borderColor: 'var(--accent)', padding: '1rem' }}>
          <div className="row space-between wrap gap">
            <div className="row gap">
              <CheckSquare size={20} className="text-accent" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong>{selectedCount} selecionado(s)</strong>
                {inUseSelected > 0 && (
                  <span className="small text-warning" style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {inUseSelected} em uso não serão alterados
                  </span>
                )}
              </div>
            </div>
            <div className="row gap">
              <button className="btn btn-secondary btn-small" onClick={() => setSelectedIds(new Set())}>Desmarcar</button>
              <button className="btn btn-primary btn-small" onClick={openBatchToStock} disabled={canMoveCount === 0}>
                <Package size={14} /> Retornar p/ Estoque ({canMoveCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela Principal */}
      <div className="table-container shadow-lg">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}><button className="btn-icon-minimal" onClick={toggleSelectAll}>{selectedIds.size === pageItems.length ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} />}</button></th>
              <th>Equipamento (Nome/Lacre)</th>
              {!isCompact && <th>Responsável (Operador)</th>}
              {!isCompact && <th>Marca</th>}
              {!isCompact && <th>Finalidade</th>}
              <th>Condição</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-12 muted">Carregando dados...</td></tr> : 
             pageItems.length === 0 ? <tr><td colSpan={7} className="text-center py-12 muted">Nenhum registro encontrado.</td></tr> :
             pageItems.map(h => (
              <tr key={h.id} className={selectedIds.has(h.id) ? 'selected-row' : ''} style={recentUpdates.has(h.id) ? { background: 'rgba(16, 185, 129, 0.15)', transition: 'background 0.5s' } : selectedIds.has(h.id) ? { background: 'var(--accent-glow)' } : {}}>
                <td><button className="btn-icon-minimal" onClick={() => toggleSelect(h.id)}>{selectedIds.has(h.id) ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} />}</button></td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong className="text-accent">{h.nome || 'Headset'}</strong>
                    <span className="small muted mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={10} /> {h.lacre}</span>
                  </div>
                </td>
                {!isCompact && (
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{h.nomeOperador || h.matricula || '—'}</strong>
                      {h.nomeOperador && h.matricula && <span className="small muted">Mat: {h.matricula}</span>}
                    </div>
                  </td>
                )}
                {!isCompact && (
                  <td>
                    <span className="small mono" style={{ textTransform: 'capitalize' }}>{h.marca || '—'}</span>
                  </td>
                )}
                {!isCompact && (
                  <td>
                    <span className="badge" style={{ width: 'fit-content', padding: '2px 8px', fontSize: '0.65rem', background: h.categoria === 'emprestimo' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(var(--accent-rgb), 0.1)', color: h.categoria === 'emprestimo' ? '#a78bfa' : 'var(--accent-light)', border: 'none' }}>
                      {h.categoria === 'emprestimo' ? 'Empréstimo' : 'Operação'}
                    </span>
                  </td>
                )}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className={getBadgeClass(h.status)}>{labelByValue(HEADSET_STATUS, h.status)}</span>
                    {h.status === 'emprestimo' && h.dataDevolucao && <span className="small text-warning" style={{ marginTop: 4, fontSize: '0.65rem' }}>Dev: {new Date(h.dataDevolucao).toLocaleDateString('pt-BR')}</span>}
                    {h.status === 'manutencao' && h.dataEnvioManutencao && <span className="small text-info" style={{ marginTop: 4, fontSize: '0.65rem' }}>Env: {new Date(h.dataEnvioManutencao).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="row gap" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-icon" title="Ver Detalhes" onClick={() => openView(h)}><Eye size={16} /></button>
                    <button className="btn btn-secondary btn-icon" title="Gerenciar" onClick={() => openAcoes(h)}><MoreHorizontal size={16} /></button>
                    <button className="btn btn-secondary btn-icon" title="Histórico" onClick={() => openHistorico(h)}><History size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={visibleRows.length} onPageChange={setPage} />

      {/* Modal: Visualizar Detalhes */}
      {modal?.mode === 'view' && (
        <Modal 
          title={`Ficha: ${modal.headset.lacre}`} 
          onClose={() => setModal(null)}
          size="md"
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar Consulta</button>}
        >
          <div className="detail-grid-premium">
            <div className="detail-section full" style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <span className="prop-label" style={{ marginBottom: '0.5rem' }}>Estado Atual do Ativo</span>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <span className={getBadgeClass(modal.headset.status)} style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
                  {labelByValue(HEADSET_STATUS, modal.headset.status)}
                </span>
              </div>
              <h3 className="text-accent" style={{ fontSize: '1.5rem' }}>{modal.headset.nome || 'Headset'}</h3>
              <p className="small muted">Destinado a: {modal.headset.categoria === 'emprestimo' ? 'Empréstimo' : 'Operação'}</p>
            </div>

            <div className="detail-section">
              <h5 className="section-title" style={{ fontSize: '0.9rem' }}><Tag size={16} /> Dados Técnicos</h5>
              <div className="prop-row"><span className="prop-label">Lacre</span><p className="prop-value mono"><strong>{modal.headset.lacre}</strong></p></div>
              <div className="prop-row"><span className="prop-label">Marca</span><p className="prop-value" style={{ textTransform: 'capitalize' }}>{modal.headset.marca || '—'}</p></div>
              <div className="prop-row"><span className="prop-label">Número de Série</span><p className="prop-value mono small">{modal.headset.numeroSerie || '—'}</p></div>
            </div>

            <div className="detail-section">
              <h5 className="section-title" style={{ fontSize: '0.9rem' }}><UserIcon size={16} /> Vínculo Operacional</h5>
              <div className="prop-row"><span className="prop-label">Operador</span><p className="prop-value"><strong>{modal.headset.nomeOperador || 'Equipamento Disponível'}</strong></p></div>
              <div className="prop-row"><span className="prop-label">Matrícula</span><p className="prop-value">{modal.headset.matricula || '—'}</p></div>
              {(modal.headset.dataDevolucao || modal.headset.dataEnvioManutencao) && (
                <div className="prop-row">
                  <span className="prop-label">{modal.headset.status === 'emprestimo' ? 'Prazo de Devolução' : 'Enviado p/ Reparo'}</span>
                  <p className={`prop-value ${modal.headset.status === 'emprestimo' ? 'text-warning' : 'text-info'}`}>
                    <strong>{new Date(modal.headset.dataDevolucao || modal.headset.dataEnvioManutencao).toLocaleDateString('pt-BR')}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="detail-section full">
              <span className="prop-label">Observações Técnicas</span>
              <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minHeight: '80px' }}>
                <p className="small muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{modal.headset.observacoes || 'Sem notas adicionais.'}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar */}
      {modal?.mode === 'edit' && (
        <Modal title={modal.form.id ? 'Editar Equipamento' : 'Novo Cadastro'} onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-hs" className="btn btn-primary">Salvar</button></>}>
          <form id="f-hs" className="form-grid" onSubmit={handleSubmit}>
            <div className="full" style={{ marginBottom: '1rem' }}>
              <label style={{ marginBottom: '0.5rem' }}>Destinação do Equipamento</label>
              <div className="segmented-control" style={{ background: 'var(--bg)' }}>
                <button type="button" className={`segment ${modal.form.categoria === 'estoque' ? 'active' : ''}`} onClick={() => setModal(m => ({...m, form: {...m.form, categoria: 'estoque'}}))}>Operação Comum</button>
                <button type="button" className={`segment ${modal.form.categoria === 'emprestimo' ? 'active' : ''}`} onClick={() => setModal(m => ({...m, form: {...m.form, categoria: 'emprestimo'}}))}>Equipamento de Empréstimo</button>
              </div>
            </div>

            <label className="full">Identificador / Nome<input className="input" value={modal.form.nome} onChange={e => setModal(m => ({...m, form: {...m.form, nome: e.target.value}}))} placeholder="Ex: Headset Reserva 01" /></label>
            <label>Matrícula<input className="input" value={modal.form.matricula} onChange={e => setModal(m => ({...m, form: {...m.form, matricula: e.target.value}}))} /></label>
            <label>Nome Operador<input className="input" value={modal.form.nomeOperador} onChange={e => setModal(m => ({...m, form: {...m.form, nomeOperador: e.target.value}}))} /></label>
            <label>Lacre<input className="input mono" value={modal.form.lacre} onChange={e => setModal(m => ({...m, form: {...m.form, lacre: e.target.value}}))} required /></label>
            <label>Marca<select className="input" value={modal.form.marca} onChange={e => setModal(m => ({...m, form: {...m.form, marca: e.target.value}}))}><option value="">Selecione</option><option value="intelbras">Intelbras</option><option value="plantronics">Plantronics</option></select></label>
            <label>Série<input className="input mono" value={modal.form.numeroSerie} onChange={e => setModal(m => ({...m, form: {...m.form, numeroSerie: e.target.value}}))} /></label>
            <label className="full">Status Atual<select className="input" value={modal.form.status} onChange={e => setModal(m => ({...m, form: {...m.form, status: e.target.value}}))}>{HEADSET_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="full">Observações<textarea className="input" rows={3} value={modal.form.observacoes} onChange={e => setModal(m => ({...m, form: {...m.form, observacoes: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Gestão de Ações */}
      {modal?.mode === 'acoes' && (
        <Modal title={`Gestão: ${modal.headset.lacre}`} size="sm" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="btn btn-secondary w-full" onClick={() => openEdit(modal.headset)}><FileText size={16} /> Editar Cadastro</button>
            
            {(modal.headset.status === 'em_uso' || modal.headset.status === 'emprestimo') ? (
              <>
                <button className="btn btn-primary w-full" style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => openTroca(modal.headset)}>
                  <RefreshCcw size={16} /> Substituir Headset
                </button>
                <button 
                  className="btn w-full" 
                  style={{ 
                    background: modal.headset.status === 'emprestimo' ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-hover)', 
                    color: modal.headset.status === 'emprestimo' ? 'var(--success)' : 'var(--text)',
                    border: modal.headset.status === 'emprestimo' ? '1px solid var(--success)' : '1px solid var(--border)'
                  }} 
                  onClick={() => openBaixa(modal.headset)}
                >
                  {modal.headset.status === 'emprestimo' ? <ArrowDownLeft size={16} /> : <UserMinus size={16} />} 
                  <strong>{modal.headset.status === 'emprestimo' ? 'Encerrar Empréstimo (Baixa)' : 'Dar Baixa (Recolher)'}</strong>
                </button>
              </>
            ) : (
              (modal.headset.status === 'estoque' || modal.headset.status === 'reserva') && (
                <>
                  <button className="btn btn-primary w-full" onClick={() => openVincular(modal.headset)}><UserPlus size={16} /> Vincular Operador</button>
                  <button className="btn btn-secondary w-full" style={{ border: '1px solid var(--accent)' }} onClick={() => openEmprestimo(modal.headset)}><Calendar size={16} /> Registrar Empréstimo</button>
                </>
              )
            )}

            {/* C. Bloqueio de Segurança: Ação de vincular bloqueada se estiver com defeito ou manutenção */}
            {!(modal.headset.status === 'em_uso' || modal.headset.status === 'emprestimo' || modal.headset.status === 'estoque' || modal.headset.status === 'reserva') && (
              <div className="badge badge-danger" style={{ padding: '0.75rem', justifyContent: 'center', gap: 8 }}>
                <AlertTriangle size={14} /> Equipamento indisponível para vínculo
              </div>
            )}

            {!(modal.headset.status === 'em_uso' || modal.headset.status === 'emprestimo') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-small text-danger" onClick={() => handleStatusRapido(modal.headset, 'defeito')} title="Marcar como Defeito">
                  <AlertTriangle size={14} /> Defeito
                </button>
                <button className="btn btn-secondary btn-small text-danger" onClick={() => handleStatusRapido(modal.headset, 'perdido')} title="Marcar como Extravio">
                  <XCircle size={14} /> Extravio
                </button>
              </div>
            )}

            {modal.headset.status === 'defeito' && <button className="btn btn-primary w-full" style={{ background: 'var(--accent)' }} onClick={() => handleStatusRapido(modal.headset, 'manutencao')}><Wrench size={16} /> Enviar Manutenção</button>}
            {modal.headset.status === 'manutencao' && <button className="btn btn-primary w-full" style={{ background: 'var(--success)' }} onClick={() => openRetornoManutencao(modal.headset)}><CheckCircle size={16} /> Registrar Retorno</button>}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-secondary w-full" onClick={() => openTrocaLacre(modal.headset)}><RotateCcw size={16} /> Atualizar Lacre</button>
              <button className="btn btn-secondary w-full text-danger" onClick={() => handleDelete(modal.headset.id)}><Trash2 size={16} /> Excluir Registro</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Baixa / Retorno */}
      {modal?.mode === 'baixa' && (
        <Modal 
          title={modal.headset.status === 'emprestimo' ? 'Encerrar Empréstimo' : 'Dar Baixa no Equipamento'} 
          onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-baixa" className="btn btn-primary">Confirmar Retorno</button></>}
        >
          <form id="f-baixa" className="form-grid" onSubmit={handleBaixaOperador}>
            <div className="full badge badge-info" style={{ padding: '1rem', borderRadius: '4px', display: 'block', marginBottom: '0.5rem' }}>
              Equipamento: <strong>{modal.headset.lacre}</strong><br/>
              Responsável: <strong>{modal.headset.nomeOperador || modal.headset.matricula}</strong>
              <p className="small" style={{ marginTop: 8 }}>O vínculo com o operador será removido.</p>
            </div>
            
            <label className="full">Condição de Retorno
              <select className="input" value={modal.form.status} onChange={e => setModal(m => ({...m, form: {...m.form, status: e.target.value}}))}>
                <option value="estoque">Em bom estado (Estoque)</option>
                <option value="reserva">Reserva Técnica</option>
                <option value="defeito">Com Defeito / Danificado</option>
                <option value="perdido">Extraviado / Não Devolvido</option>
              </select>
            </label>

            <label className="full">Observações do Retorno
              <textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} placeholder="Ex: Devolvido com espumas gastas..." />
            </label>
          </form>
        </Modal>
      )}

      {/* Modal: Vincular */}
      {modal?.mode === 'vincular' && (
        <Modal title={modal.form.isEmprestimo ? 'Registrar Empréstimo' : 'Vincular Operador'} onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-vinc" className="btn btn-primary">Confirmar</button></>}>
          <form id="f-vinc" className="form-grid" onSubmit={handleVincular}>
            <label className="full">Nome Operador<input className="input" value={modal.form.nomeOperador} onChange={e => setModal(m => ({...m, form: {...m.form, nomeOperador: e.target.value}}))} autoFocus required /></label>
            <label className="full">Matrícula (Opcional)<input className="input" value={modal.form.matricula} onChange={e => setModal(m => ({...m, form: {...m.form, matricula: e.target.value}}))} /></label>
            {modal.form.isEmprestimo && <label className="full">Data Devolução<input type="date" className="input" value={modal.form.dataDevolucao} onChange={e => setModal(m => ({...m, form: {...m.form, dataDevolucao: e.target.value}}))} required /></label>}
            <label className="full">Observações Técnicas<textarea className="input" rows={2} value={modal.form.observacoes} onChange={e => setModal(m => ({...m, form: {...m.form, observacoes: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Troca/Substituição */}
      {modal?.mode === 'troca' && (
        <Modal title={`Substituição: ${modal.headset.lacre}`} onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-swap" className="btn btn-primary" style={{ background: 'var(--warning)' }}>Efetivar Troca</button></>}>
          <form id="f-swap" className="form-grid" onSubmit={handleTroca}>
            <div className="full badge badge-info" style={{ padding: '1rem', marginBottom: '0.5rem', borderRadius: '4px', display: 'block' }}>Operador: <strong>{modal.headset.nomeOperador || modal.headset.matricula}</strong><p className="small">O operador será transferido para o novo equipamento.</p></div>
            <label className="full">Selecionar Novo Headset (Estoque)<select className="input" value={modal.form.id_novo} onChange={e => setModal(m => ({...m, form: {...m.form, id_novo: e.target.value}}))} required><option value="">Selecione...</option>{disponiveisParaTroca.map(h => (<option key={h.id} value={h.id}>{h.nome ? `${h.nome} (${h.lacre})` : `Lacre: ${h.lacre}`} | {h.marca} {h.numeroSerie ? `(SN: ${h.numeroSerie})` : ''}</option>))}</select></label>
            <label className="full">Motivo / Destino do Antigo<select className="input" value={modal.form.status_novo_original} onChange={e => setModal(m => ({...m, form: {...m.form, status_novo_original: e.target.value}}))} required><option value="defeito">Defeito Técnico</option><option value="perdido">Extravio / Perda</option><option value="furtado">Furto / Roubo</option></select></label>
            <label className="full">Obs Técnicas<textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Batch Action */}
      {modal?.mode === 'batchStock' && (
        <Modal title="Mover p/ Estoque em Lote" onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-batch" className="btn btn-primary">Confirmar</button></>}>
          <form id="f-batch" onSubmit={handleBatchToStock}>
            <div className="badge badge-info" style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '4px', display: 'block' }}>Mover {modal.count} equipamentos p/ estoque? Matrículas e nomes serão removidos.</div>
            <label className="full">Observação (Opcional)<textarea className="input" rows={3} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Troca Lacre */}
      {modal?.mode === 'trocaLacre' && (
        <Modal title="Atualizar Lacre" onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-lacre" className="btn btn-primary">Salvar</button></>}>
          <form id="f-lacre" className="form-grid" onSubmit={handleTrocaLacre}>
            <label className="full">Lacre Atual<input className="input mono" value={modal.form.lacreAtual} disabled /></label>
            <label className="full">Novo Lacre<input className="input mono" value={modal.form.novoLacre} onChange={e => setModal(m => ({...m, form: {...m.form, novoLacre: e.target.value}}))} required autoFocus /></label>
            <label className="full">Motivo da Troca<textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} required /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Retorno Manutenção */}
      {modal?.mode === 'retornoManutencao' && (
        <Modal title={`Retorno: ${modal.form.lacre}`} onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-ret" className="btn btn-primary">Efetivar</button></>}>
          <form id="f-ret" className="form-grid" onSubmit={handleRetornoManutencao}>
            <label className="full">Custo Reparo (R$)<input type="number" step="0.01" className="input" value={modal.form.custo} onChange={e => setModal(m => ({...m, form: {...m.form, custo: e.target.value}}))} /></label>
            <label className="full">Serviços / Peças<textarea className="input" rows={2} value={modal.form.pecas} onChange={e => setModal(m => ({...m, form: {...m.form, pecas: e.target.value}}))} placeholder="Ex: Cabo trocado, espumas novas..." /></label>
            <label className="full">Obs Adicionais<textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Histórico */}
      {modal?.mode === 'historico' && (
        <Modal title={`Histórico: ${modal.headset.lacre}`} onClose={() => setModal(null)} size="lg" footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>}>
          {modal.loading ? <p className="muted">Carregando...</p> : modal.rows.length === 0 ? <p className="muted">Nenhuma alteração registrada.</p> : (
            <div className="table-container" style={{ maxHeight: '400px', marginTop: 0 }}>
              <table>
                <thead><tr><th>Data</th><th>Ação</th><th>Campo</th><th>De</th><th>Para</th></tr></thead>
                <tbody>{modal.rows.map(r => (<tr key={r.id}><td className="small muted">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td>{r.acao}</td><td>{r.campo || '—'}</td><td className="mono small">{r.valor_anterior || '—'}</td><td className="mono small">{r.valor_novo || '—'}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* Modal: Desligamento em Massa - Visual Oficial Premium Vertical */}
      {modal?.mode === 'desligamento' && (
        <Modal 
          title="Procedimento de Desligamento" 
          onClose={() => setModal(null)}
          size="md"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button 
                type="submit" 
                form="f-deslig" 
                className="btn btn-primary" 
                style={{ 
                  background: 'var(--danger)', 
                  borderColor: 'rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' 
                }}
              >
                Efetivar Baixa Geral
              </button>
            </>
          }
        >
          <form id="f-deslig" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={handleDesligamento}>
            {/* Header de Alerta Integrado */}
            <div style={{ 
              background: 'linear-gradient(to bottom right, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}>
                <UserMinus size={80} className="text-danger" />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  background: 'var(--danger)', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                }}>
                  <AlertTriangle size={24} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--text)', fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Recolhimento de Ativos por Desligamento
                  </h4>
                  <p className="small muted" style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5' }}>
                    O sistema irá localizar e desvincular automaticamente todos os equipamentos registrados sob esta matrícula, movendo-os para o <strong>estoque disponível</strong>.
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontWeight: '600' }}>
                  <Hash size={14} className="text-accent" /> Matrícula do Operador
                </span>
                <input 
                  className="input mono" 
                  style={{ 
                    fontSize: '1.25rem', 
                    padding: '1rem', 
                    textAlign: 'center', 
                    background: 'rgba(255,255,255,0.02)',
                    letterSpacing: '3px',
                    borderColor: 'var(--border)'
                  }}
                  value={modal.form.matricula} 
                  onChange={e => setModal(m => ({...m, form: {...m.form, matricula: e.target.value}}))} 
                  placeholder="000000"
                  autoFocus
                  required 
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontWeight: '600' }}>
                  <Info size={14} className="text-accent" /> Justificativa / Observações
                </span>
                <textarea 
                  className="input" 
                  rows={3} 
                  style={{ 
                    padding: '0.75rem', 
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: '0.9rem' 
                  }}
                  value={modal.form.observacao} 
                  onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} 
                  placeholder="Ex: Desligamento reportado pelo RH em 27/05..." 
                />
              </label>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .selected-row { background: var(--accent-glow) !important; }
        .segmented-control { display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 8px; }
        .segment { flex: 1; padding: 8px; border: none; border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; transition: 0.2s; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .segment.active { background: var(--accent); color: white; box-shadow: var(--shadow-sm); }
        .segment:hover:not(.active) { background: var(--surface-hover); color: var(--text); }
      `}</style>
    </div>
  )
}
