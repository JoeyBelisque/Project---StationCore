import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  XCircle,
  Calendar,
  CheckSquare,
  Square,
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
import { useToast } from '../components/ToastContext'
import { listarAchadosPorLacre } from '../services/achadosPerdidosApi'
import {
  atualizarHeadset,
  atualizarHeadsetsEmLote,
  criarHeadset,
  listarHistoricoHeadset,
  listarHeadsets,
  removerHeadset,
  trocarLacreHeadset,
  trocarHeadset,
} from '../services/headsetsApi'

const PAGE_SIZE = 20

const CATEGORIA_LABELS = {
  operacao: 'Operação',
  emprestimo: 'Empréstimo',
}

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysToToday(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return formatDateInput(date)
}

const todayInputDate = () => formatDateInput(new Date())

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

function historyFieldLabel(field) {
  const labels = {
    usuario: 'Usuário',
    matricula: 'Matrícula',
    nome_operador: 'Nome do operador',
    status: 'Status',
    data_devolucao: 'Data de devolução',
    data_envio_manutencao: 'Envio para manutenção',
  }
  return labels[field] || field || 'Alteração'
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
    categoria: r.categoria === 'estoque' ? 'operacao' : (r.categoria ?? 'operacao'),
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
  categoria: 'operacao',
  observacoes: '',
})

export function HeadsetsPage() {
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [recentUpdates, setRecentUpdates] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [categoriaFilter, setCategoriaFilter] = useState(() => searchParams.get('categoria') || '')
  
  const [viewMode, setViewMode] = useState('inventario')
  const [isCompact, setIsCompact] = useState(() => localStorage.getItem('hs_compact') === 'true')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(null)

  // Função central para atualizar a URL e manter o histórico do navegador sincronizado
  const updateParams = useCallback((newStatus, newCat) => {
    const next = new URLSearchParams(searchParams)
    if (newStatus !== undefined) {
      if (newStatus) next.set('status', newStatus)
      else next.delete('status')
    }
    if (newCat !== undefined) {
      if (newCat) next.set('categoria', newCat)
      else next.delete('categoria')
    }
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // Sincroniza filtros locais com a URL sempre que o endereço mudar (via Sidebar ou Abas)
  // Isso garante que a "verdade" sobre o estado da página venha sempre da URL.
  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '')
    setCategoriaFilter(searchParams.get('categoria') || '')
    setPage(0) // Reseta a paginação ao trocar de categoria para evitar páginas vazias
  }, [searchParams])

  useEffect(() => {
    localStorage.setItem('hs_compact', isCompact)
  }, [isCompact])

  // Identifica equipamentos que podem ser usados para substituição imediata
  const disponiveisParaTroca = useMemo(() => {
    return items.filter(h => h.status === 'estoque' || h.status === 'reserva')
  }, [items])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listarHeadsets()
      // Normaliza os dados vindos do banco para o padrão usado no componente (camelCase)
      setItems(Array.isArray(data) ? data.map(mapRow) : [])
      setSelectedIds(new Set())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Lógica de filtragem central: combina Busca Global + Status + Categoria
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((h) => {
      if (statusFilter && String(h.status) !== statusFilter) return false
      if (categoriaFilter && String(h.categoria) !== categoriaFilter) return false
      if (!s) return true
      // O 'blob' permite busca por qualquer campo em uma única string
      const blob = `${h.nome} ${h.nomeOperador} ${h.matricula} ${h.lacre} ${h.marca} ${h.numeroSerie} ${h.categoria} ${labelByValue(HEADSET_STATUS, h.status)}`.toLowerCase()
      return blob.includes(s)
    })
  }, [items, q, statusFilter, categoriaFilter])

  /**
   * Título Dinâmico: Melhora a orientação do usuário.
   * Em vez de apenas "Headsets", indica o contexto atual.
   */
  const pageTitle = useMemo(() => {
    if (categoriaFilter === 'operacao') return 'Headsets > Operação'
    if (categoriaFilter === 'emprestimo') return 'Headsets > Empréstimos'
    return 'Headsets'
  }, [categoriaFilter])

  // Filtra apenas registros com vínculos ativos (usado no botão de alternância de visão)
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
  const openView = async (row) => {
    setModal({ mode: 'view', headset: row, achados: [], loadingAchados: true })
    try {
      const achados = await listarAchadosPorLacre(row.lacre)
      setModal(current => current?.mode === 'view' && current.headset.id === row.id
        ? { ...current, achados, loadingAchados: false }
        : current)
    } catch {
      setModal(current => current?.mode === 'view' && current.headset.id === row.id
        ? { ...current, loadingAchados: false }
        : current)
    }
  }
  const openVincular = (row) => setModal({ mode: 'vincular', form: { id: row.id, lacre: row.lacre, matricula: row.matricula ?? '', nomeOperador: row.nomeOperador ?? '', observacoes: row.observacoes ?? '', dataDevolucao: '', isEmprestimo: false } })
  const openEmprestimo = (row) => setModal({ mode: 'vincular', form: { id: row.id, lacre: row.lacre, matricula: row.matricula ?? '', nomeOperador: row.nomeOperador ?? '', observacoes: row.observacoes ?? '', dataDevolucao: addDaysToToday(7), isEmprestimo: true } })
  const openTrocaLacre = (row) => setModal({ mode: 'trocaLacre', form: { id: row.id, lacreAtual: row.lacre, novoLacre: '', observacao: '' } })
  const openTroca = (row) => setModal({ mode: 'troca', headset: row, form: { id_novo: '', status_novo_original: 'defeito', observacao: '', busca: '' } })
  const openAcoes = (row) => setModal({ mode: 'acoes', headset: row })

  const openBaixa = (row) => setModal({ 
    mode: 'baixa', 
    headset: row, 
    form: { 
      status: 'estoque', 
      observacao: '' 
    } 
  })

  const openBatchStatus = () => {
    if (selectedIds.size === 0) return
    setModal({ mode: 'batchStatus', count: selectedIds.size, form: { status: 'em_uso', observacao: '' } })
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

  async function handleBatchStatus(e) {
    e.preventDefault()
    const ids = [...selectedIds]
    const { status, observacao } = modal.form
    try {
      setLoading(true)
      await atualizarHeadsetsEmLote(ids, {
        status,
        observacoes: observacao.trim() || `Alteração em lote para ${labelByValue(HEADSET_STATUS, status)}`,
      })
      setRecentUpdates(new Set(ids))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      addToast(`${ids.length} equipamento(s) atualizado(s) para "${labelByValue(HEADSET_STATUS, status)}"!`)
      setModal(null)
      await load()
    } catch (err) { addToast(err.message, 'error') } finally { setLoading(false) }
  }

  async function handleVincular(e) {
    e.preventDefault()
    const f = modal.form
    try {
      const row = items.find(h => h.id === f.id)
      if (row.categoria === 'emprestimo' && !f.isEmprestimo) {
        addToast('Este headset é destinado a empréstimos e não pode ser vinculado como uso comum.', 'warning')
        return
      }
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

  async function handleEnviarManutencao(row) {
    try {
      await atualizarHeadset(row.id, {
        nome: row.nome,
        matricula: '',
        nome_operador: '',
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status: 'manutencao',
        categoria: row.categoria,
        data_envio_manutencao: new Date().toISOString(),
        observacoes: row.observacoes
      })
      setRecentUpdates(new Set([row.id]))
      setTimeout(() => setRecentUpdates(new Set()), 3000)
      addToast('Equipamento enviado para manutenção!')
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
        desvincular_antes: true,
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
  const selectedLinkedCount = items.filter(item => selectedIds.has(item.id) && (item.matricula || item.nomeOperador)).length
  const selectedLoanCount = items.filter(item => selectedIds.has(item.id) && item.categoria === 'emprestimo').length

  return (
    <div className="page-fade-in">
      <header className="page-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">{pageTitle}</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Gestão de inventário e atribuição de equipamentos.</p>
        </div>
        <div className="row gap">
          <button className={`btn btn-secondary ${isCompact ? 'active' : ''}`} onClick={() => setIsCompact(!isCompact)} title="Alternar Visualização"><MoreHorizontal size={16} /></button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Cadastro</button>
        </div>
      </header>

      {/* ABAS DE CONTEXTO (Simplificação de Fluxo) */}
      <div className="segmented-control" style={{ marginBottom: '1.5rem', width: 'fit-content' }}>
        {/* Caso: Empréstimos */}
        {categoriaFilter === 'emprestimo' && (
          <>
            <button className={`segment ${statusFilter === '' ? 'active' : ''}`} onClick={() => updateParams('', undefined)}>Todos</button>
            <button className={`segment ${statusFilter === 'estoque' ? 'active' : ''}`} onClick={() => updateParams('estoque', undefined)}>Disponíveis</button>
            <button className={`segment ${statusFilter === 'emprestimo' ? 'active' : ''}`} onClick={() => updateParams('emprestimo', undefined)}>Emprestados</button>
          </>
        )}

        {/* Caso: Operação */}
        {categoriaFilter === 'operacao' && (
          <>
            <button className={`segment ${statusFilter === '' ? 'active' : ''}`} onClick={() => updateParams('', undefined)}>Todos</button>
            <button className={`segment ${statusFilter === 'em_uso' ? 'active' : ''}`} onClick={() => updateParams('em_uso', undefined)}>Em Uso</button>
            <button className={`segment ${statusFilter === 'estoque' ? 'active' : ''}`} onClick={() => updateParams('estoque', undefined)}>No Estoque</button>
          </>
        )}

        {/* Caso: Visão Geral (Sem categoria fixa) */}
        {!categoriaFilter && (
          <>
            <button className={`segment ${viewMode === 'inventario' ? 'active' : ''}`} onClick={() => { setViewMode('inventario'); updateParams('', undefined); }}>Visão Geral</button>
            <button className={`segment ${viewMode === 'vinculos' ? 'active' : ''}`} onClick={() => { setViewMode('vinculos'); updateParams('', undefined); }}>Vínculos Ativos</button>
          </>
        )}
      </div>

      <div className="card toolbar-premium">
        <div className="input-with-icon">
          <Search size={18} className="icon" />
          <input type="search" className="input w-full" placeholder="Buscar por nome, lacre, série ou operador..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="row gap wrap">
          {/* Só mostra o select de status na visão geral, pois nas outras as abas já resolvem */}
          {!categoriaFilter && (
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Condição (Todos)</option>
              {HEADSET_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <button className="btn btn-secondary btn-icon" onClick={() => { setQ(''); setStatusFilter(''); }} title="Limpar Busca">
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
              <strong>{selectedCount} selecionado(s)</strong>
            </div>
            <div className="row gap">
              <button className="btn btn-secondary btn-small" onClick={() => setSelectedIds(new Set())}>Desmarcar</button>
              <button className="btn btn-primary btn-small" onClick={openBatchStatus}>
                <Settings2 size={14} /> Alterar Status em Lote
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
          title={`Detalhes: ${modal.headset.lacre}`} 
          onClose={() => setModal(null)}
          size="md"
          icon={Tag}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>}
        >
          <div className="modal-view-container">
            {/* Header: Status Integrado e Simétrico */}
            <div className="modal-header-status">
              <span className="prop-label">Situação Atual</span>
              <span className={`status-pill ${getBadgeClass(modal.headset.status)}`}>
                {labelByValue(HEADSET_STATUS, modal.headset.status)}
              </span>
            </div>

            {/* Grid de Dados: Simétrico e Uniforme (Lacre primeiro) */}
            <div className="modal-data-grid">
              <div className="data-card">
                <span className="prop-label">Lacre</span>
                <p className="prop-value mono" style={{ color: 'var(--accent-light)' }}>{modal.headset.lacre}</p>
              </div>
              {modal.headset.nome && (
                <div className="data-card">
                  <span className="prop-label">Equipamento (Nome)</span>
                  <p className="prop-value">{modal.headset.nome}</p>
                </div>
              )}
              <div className="data-card">
                <span className="prop-label">Marca</span>
                <p className="prop-value">{modal.headset.marca || '—'}</p>
              </div>
              <div className="data-card">
                <span className="prop-label">Série</span>
                <p className="prop-value mono">{modal.headset.numeroSerie || '—'}</p>
              </div>
            </div>

            {/* Vínculo: Layout de Card Simétrico */}
            <div className="modal-vinc-card">
              <h5 className="section-title"><UserIcon size={16} /> Detalhes do Vínculo</h5>
              <div className="modal-data-grid">
                <div className="data-card">
                  <span className="prop-label">Operador</span>
                  <p className="prop-value">{modal.headset.nomeOperador || 'Disponível'}</p>
                </div>
                <div className="data-card">
                  <span className="prop-label">Matrícula</span>
                  <p className="prop-value">{modal.headset.matricula || '—'}</p>
                </div>
              </div>
            </div>
            {modal.loadingAchados === false && modal.achados?.some(item => item.status === 'aguardando_devolucao') && (
              <div className="badge badge-warning modal-notice" style={{ padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                <AlertTriangle size={16} />
                <span className="modal-notice-text">Este headset possui uma ocorrência pendente em Achados e Perdidos. Consulte o módulo antes de fazer uma nova movimentação.</span>
                <Link className="btn btn-small btn-secondary" to="/achados-perdidos">Abrir ocorrência</Link>
              </div>
            )}
          </div>

          <style>{`
            .modal-view-container { display: flex; flex-direction: column; gap: 1.25rem; padding: 0.5rem; }
            .modal-header-status { display: flex; flex-direction: column; align-items: center; padding: 1.25rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border); gap: 0.5rem; }
            .status-pill { padding: 0.4rem 1rem; border-radius: 999px; font-weight: 700; font-size: 0.85rem; }
            .modal-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            .data-card { background: var(--surface-hover); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); }
            .modal-vinc-card { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; background: var(--surface); display: flex; flex-direction: column; gap: 1rem; }
            .section-title { font-size: 0.8rem; margin: 0; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem; }
            .prop-label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem; display: block; }
            .prop-value { font-size: 1rem; font-weight: 600; color: var(--text); margin: 0; }
          `}</style>
        </Modal>
      )}

      {/* Modal: Editar */}
      {modal?.mode === 'edit' && (
        <Modal title={modal.form.id ? 'Editar Equipamento' : 'Novo Cadastro'} onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-hs" className="btn btn-primary">Salvar</button></>}>
          <form id="f-hs" className="form-grid" onSubmit={handleSubmit}>
            <div className="full" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Destinação do Equipamento</label>
              <div className="segmented-control" style={{ background: 'var(--bg)' }}>
                <button type="button" className={`segment ${modal.form.categoria === 'operacao' ? 'active' : ''}`} onClick={() => setModal(m => ({...m, form: {...m.form, categoria: 'operacao'}}))}>Operação Comum</button>
                <button type="button" className={`segment ${modal.form.categoria === 'emprestimo' ? 'active' : ''}`} onClick={() => setModal(m => ({...m, form: {...m.form, categoria: 'emprestimo'}}))}>Equipamento de Empréstimo</button>
              </div>
            </div>

            <label className="full">
              <span className="form-label">Identificador / Nome (Opcional)</span>
              <input className="input" value={modal.form.nome} onChange={e => setModal(m => ({...m, form: {...m.form, nome: e.target.value}}))} placeholder="Ex: Headset Reserva 01" />
            </label>
            <label>
              <span className="form-label">Matrícula</span>
              <input className="input" value={modal.form.matricula} onChange={e => setModal(m => ({...m, form: {...m.form, matricula: e.target.value}}))} />
            </label>
            <label>
              <span className="form-label">Nome Operador</span>
              <input className="input" value={modal.form.nomeOperador} onChange={e => setModal(m => ({...m, form: {...m.form, nomeOperador: e.target.value}}))} />
            </label>
            <label>
              <span className="form-label">Lacre</span>
              <input className="input mono" value={modal.form.lacre} onChange={e => setModal(m => ({...m, form: {...m.form, lacre: e.target.value}}))} required />
            </label>
            <label>
              <span className="form-label">Marca</span>
              <select className="input" value={modal.form.marca} onChange={e => setModal(m => ({...m, form: {...m.form, marca: e.target.value}}))}><option value="">Selecione</option><option value="intelbras">Intelbras</option><option value="plantronics">Plantronics</option></select>
            </label>
            <label>
              <span className="form-label">Série</span>
              <input className="input mono" value={modal.form.numeroSerie} onChange={e => setModal(m => ({...m, form: {...m.form, numeroSerie: e.target.value}}))} />
            </label>
            <label className="full">
              <span className="form-label">Status Atual</span>
              <select className="input" value={modal.form.status} onChange={e => setModal(m => ({...m, form: {...m.form, status: e.target.value}}))}>{HEADSET_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </label>
            <label className="full">
              <span className="form-label">Observações</span>
              <textarea className="input" rows={3} value={modal.form.observacoes} onChange={e => setModal(m => ({...m, form: {...m.form, observacoes: e.target.value}}))} />
            </label>
          </form>
        </Modal>
      )}

      <style>{`
        .form-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .full { grid-column: 1 / -1; }
        /* ... existing styles ... */
      `}</style>

      {/* Modal: Gestão de Ações */}
      {modal?.mode === 'acoes' && (
        <Modal title={`Gestão: ${modal.headset.lacre}`} size="sm" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Grupo: Vínculo e Operação */}
            <div className="action-group">
              <span className="action-group-label">Vínculo e Movimentação</span>
              <div className="action-group-content">
                {(modal.headset.status === 'em_uso' || modal.headset.status === 'emprestimo') ? (
                  <>
                    <button className="btn btn-primary w-full" style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => openTroca(modal.headset)}>
                      <RefreshCcw size={16} /> Substituir Headset
                    </button>
                    <button 
                      className="btn w-full action-btn-highlight" 
                      style={{ 
                        background: modal.headset.status === 'emprestimo' ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-hover)', 
                        color: modal.headset.status === 'emprestimo' ? 'var(--success)' : 'var(--text)',
                        borderColor: modal.headset.status === 'emprestimo' ? 'var(--success)' : 'var(--border)'
                      }} 
                      onClick={() => openBaixa(modal.headset)}
                    >
                      {modal.headset.status === 'emprestimo' ? <ArrowDownLeft size={16} /> : <UserMinus size={16} />} 
                      <span>{modal.headset.status === 'emprestimo' ? 'Encerrar Empréstimo' : 'Dar Baixa (Recolher)'}</span>
                    </button>
                  </>
                ) : (
                  (modal.headset.status === 'estoque' || modal.headset.status === 'reserva') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {modal.headset.categoria !== 'emprestimo' && (
                        <button className="btn btn-primary w-full" onClick={() => openVincular(modal.headset)}><UserPlus size={16} /> Vincular Operador</button>
                      )}
                      <button className={`btn ${modal.headset.categoria === 'emprestimo' ? 'btn-primary' : 'btn-secondary'} w-full`} style={{ border: '1px solid var(--accent)' }} onClick={() => openEmprestimo(modal.headset)}><Calendar size={16} /> Registrar Empréstimo</button>
                    </div>
                  )
                )}

                {/* Bloqueio de Segurança */}
                {!(modal.headset.status === 'em_uso' || modal.headset.status === 'emprestimo' || modal.headset.status === 'estoque' || modal.headset.status === 'reserva') && (
                  <div className="badge badge-danger" style={{ padding: '0.75rem', justifyContent: 'center', gap: 8, width: '100%' }}>
                    <AlertTriangle size={14} /> Equipamento indisponível para vínculo
                  </div>
                )}
              </div>
            </div>

            {modal.headset.status === 'defeito' && (
              <div className="action-group">
                <span className="action-group-label">Próximo passo</span>
                <div className="action-group-content">
                  <button className="btn btn-primary w-full" onClick={() => handleEnviarManutencao(modal.headset)}>
                    <Wrench size={16} /> Enviar p/ Manutenção
                  </button>
                </div>
              </div>
            )}

            {/* Grupo: Configurações */}
            <div className="action-group">
              <span className="action-group-label">Sistema</span>
              <div className="action-group-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-secondary w-full" onClick={() => openEdit(modal.headset)}><FileText size={16} /> Editar Cadastro</button>
                <button className="btn btn-secondary w-full" onClick={() => openTrocaLacre(modal.headset)}><RotateCcw size={16} /> Atualizar Lacre</button>
                <button className="btn btn-secondary w-full text-danger" style={{ marginTop: '0.5rem', borderStyle: 'dashed' }} onClick={() => handleDelete(modal.headset.id)}><Trash2 size={16} /> Excluir Registro</button>
              </div>
            </div>

          </div>

          <style>{`
            .action-group { display: flex; flex-direction: column; gap: 0.5rem; }
            .action-group-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; padding-left: 2px; }
            .action-group-content { display: flex; flex-direction: column; gap: 0.5rem; }
            .action-btn-highlight { font-weight: 700; border: 1px solid var(--border); }
            .date-field-group { display: flex; flex-direction: column; gap: 0.5rem; }
            .date-field-group label { display: flex; flex-direction: column; gap: 0.5rem; }
            .date-shortcuts { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
            .date-shortcuts .btn.active { border-color: var(--accent); color: var(--accent-light); background: var(--accent-glow); }
            .swap-search-results { display: flex; flex-direction: column; gap: 0.25rem; max-height: 180px; overflow-y: auto; margin-top: 0.5rem; }
            .swap-result { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; width: 100%; padding: 0.55rem 0.7rem; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer; }
            .swap-result:hover, .swap-result.selected { border-color: var(--accent); background: var(--accent-glow); }
            .swap-result strong { font-size: 0.8rem; }
            .swap-result span { color: var(--text-muted); font-size: 0.7rem; }
          `}</style>
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
            {modal.form.isEmprestimo && (
              <div className="full date-field-group">
                <label>Data de devolução
                  <input
                    type="date"
                    className="input"
                    min={todayInputDate()}
                    value={modal.form.dataDevolucao}
                    onChange={e => setModal(m => ({...m, form: {...m.form, dataDevolucao: e.target.value}}))}
                    required
                  />
                </label>
                <div className="date-shortcuts" aria-label="Prazos rápidos">
                  <span className="small muted">Prazo rápido:</span>
                  {[1, 7, 15, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      className={`btn btn-small btn-secondary ${modal.form.dataDevolucao === addDaysToToday(days) ? 'active' : ''}`}
                      onClick={() => setModal(m => ({...m, form: {...m.form, dataDevolucao: addDaysToToday(days)}}))}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="full">Observações Técnicas<textarea className="input" rows={2} value={modal.form.observacoes} onChange={e => setModal(m => ({...m, form: {...m.form, observacoes: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Troca/Substituição */}
      {modal?.mode === 'troca' && (
        <Modal title={`Substituição: ${modal.headset.lacre}`} onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-swap" className="btn btn-primary" style={{ background: 'var(--warning)' }}>Efetivar Troca</button></>}>
          <form id="f-swap" className="form-grid" onSubmit={handleTroca}>
            <div className="full badge badge-info" style={{ padding: '1rem', marginBottom: '0.5rem', borderRadius: '4px', display: 'block' }}>Operador: <strong>{modal.headset.nomeOperador || modal.headset.matricula}</strong><p className="small">O operador será transferido para o novo equipamento.</p></div>
            <label className="full swap-search-field">
              <span className="form-label">Pesquisar headset disponível</span>
              <div className="input-with-icon">
                <Search size={16} className="icon" />
                <input
                  className="input"
                  placeholder="Buscar por lacre, nome, série ou marca..."
                  value={modal.form.busca}
                  onChange={e => setModal(m => ({...m, form: {...m.form, busca: e.target.value}}))}
                />
              </div>
              {modal.form.busca.trim() && (
                <div className="swap-search-results">
                  {disponiveisParaTroca
                    .filter(h => `${h.nome} ${h.lacre} ${h.marca} ${h.numeroSerie}`.toLowerCase().includes(modal.form.busca.trim().toLowerCase()))
                    .slice(0, 8)
                    .map(h => (
                      <button
                        type="button"
                        key={h.id}
                        className={`swap-result ${modal.form.id_novo === h.id ? 'selected' : ''}`}
                        onClick={() => setModal(m => ({...m, form: {...m.form, id_novo: h.id, busca: h.lacre}}))}
                      >
                        <strong>{h.nome || `Lacre ${h.lacre}`}</strong>
                        <span>{h.lacre} {h.marca ? `• ${h.marca}` : ''} {h.numeroSerie ? `• ${h.numeroSerie}` : ''}</span>
                      </button>
                    ))}
                </div>
              )}
            </label>
            <label className="full">Selecionar Novo Headset (Estoque)
              <select className="input" value={modal.form.id_novo} onChange={e => setModal(m => ({...m, form: {...m.form, id_novo: e.target.value}}))} required>
                <option value="">Selecione...</option>
                {disponiveisParaTroca
                  .filter(h => `${h.nome} ${h.lacre} ${h.marca} ${h.numeroSerie}`.toLowerCase().includes((modal.form.busca || '').trim().toLowerCase()))
                  .map(h => (
                    <option key={h.id} value={h.id}>{h.nome ? `${h.nome} (${h.lacre})` : `Lacre: ${h.lacre}`} | {h.marca} {h.numeroSerie ? `(SN: ${h.numeroSerie})` : ''}</option>
                  ))}
              </select>
              {modal.form.busca && !disponiveisParaTroca.some(h => `${h.nome} ${h.lacre} ${h.marca} ${h.numeroSerie}`.toLowerCase().includes(modal.form.busca.trim().toLowerCase())) && (
                <span className="small muted">Nenhum headset disponível encontrado.</span>
              )}
            </label>
            <label className="full">Motivo / Destino do Antigo<select className="input" value={modal.form.status_novo_original} onChange={e => setModal(m => ({...m, form: {...m.form, status_novo_original: e.target.value}}))} required><option value="defeito">Defeito Técnico</option><option value="perdido">Extravio / Perda</option><option value="furtado">Furto / Roubo</option></select></label>
            <label className="full">Obs Técnicas<textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} /></label>
          </form>
          <style>{`
            .swap-search-field { position: relative; }
            .swap-search-results { position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% - 0.25rem); display: flex; flex-direction: column; gap: 0.25rem; max-height: 180px; overflow-y: auto; padding: 0.35rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); }
            .swap-result { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; width: 100%; padding: 0.55rem 0.7rem; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer; }
            .swap-result:hover, .swap-result.selected { border-color: var(--accent); background: var(--accent-glow); }
            .swap-result strong { font-size: 0.8rem; }
            .swap-result span { color: var(--text-muted); font-size: 0.7rem; }
          `}</style>
        </Modal>
      )}

      {/* Modal: Alteração de Status em Lote */}
      {modal?.mode === 'batchStatus' && (
        <Modal title="Alterar Status em Lote" onClose={() => setModal(null)} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-batch" className="btn btn-primary">Confirmar</button></>}>
          <form id="f-batch" onSubmit={handleBatchStatus}>
            <div className="badge badge-info" style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '4px', display: 'block' }}>
              Alterar status de <strong>{modal.count}</strong> equipamento(s) selecionado(s).
              {['estoque', 'reserva', 'perdido', 'furtado'].includes(modal.form.status) && (
                <span> Este status exige recolhimento e remove o vínculo do operador.</span>
              )}
              {selectedLinkedCount > 0 && (
                <span className="text-danger" style={{ display: 'block', marginTop: '0.5rem' }}>
                  {selectedLinkedCount} selecionado(s) possui(em) vínculo ativo. Estoque, reserva, extravio e furto exigem recolhimento explícito.
                </span>
              )}
              {selectedLoanCount > 0 && (
                <span className="text-warning" style={{ display: 'block', marginTop: '0.5rem' }}>
                  {selectedLoanCount} selecionado(s) pertence(m) à finalidade empréstimo. A finalidade não será convertida em operação em lote.
                </span>
              )}
            </div>
            <label className="full">
              <span className="form-label">Novo Status</span>
              <select className="input" value={modal.form.status} onChange={e => setModal(m => ({...m, form: {...m.form, status: e.target.value}}))} required>
                {HEADSET_STATUS.filter(o => o.value !== 'desligado').map(o => (
                  <option
                    key={o.value}
                    value={o.value}
                    disabled={
                      o.value === 'desligado' ||
                      (selectedLinkedCount > 0 && ['estoque', 'reserva', 'perdido', 'furtado'].includes(o.value)) ||
                      (selectedLoanCount > 0 && o.value === 'em_uso') ||
                      (selectedLoanCount < selectedCount && o.value === 'emprestimo')
                    }
                  >
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">Observação (Opcional)<textarea className="input" rows={3} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} placeholder="Ex: Correção pós-importação de planilha" /></label>
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
        <Modal 
          title={`Retorno: ${modal.form.lacre}`} 
          onClose={() => setModal(null)} 
          icon={Wrench}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-ret" className="btn btn-primary">Efetivar</button></>}
        >
          <form id="f-ret" className="form-grid" onSubmit={handleRetornoManutencao}>
            <label className="full">Custo Reparo (R$)<input type="number" step="0.01" className="input" value={modal.form.custo} onChange={e => setModal(m => ({...m, form: {...m.form, custo: e.target.value}}))} /></label>
            <label className="full">Serviços / Peças<textarea className="input" rows={2} value={modal.form.pecas} onChange={e => setModal(m => ({...m, form: {...m.form, pecas: e.target.value}}))} placeholder="Ex: Cabo trocado, espumas novas..." /></label>
            <label className="full">Obs Adicionais<textarea className="input" rows={2} value={modal.form.observacao} onChange={e => setModal(m => ({...m, form: {...m.form, observacao: e.target.value}}))} /></label>
          </form>
        </Modal>
      )}

      {/* Modal: Histórico */}
      {modal?.mode === 'historico' && (
        <Modal 
          title={`Histórico: ${modal.headset.lacre}`} 
          onClose={() => setModal(null)} 
          size="lg" 
          icon={History}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>}
        >
          {modal.loading ? <p className="muted">Carregando...</p> : modal.rows.length === 0 ? <p className="muted">Nenhuma alteração registrada.</p> : (
            <div className="table-container" style={{ maxHeight: '400px', marginTop: 0 }}>
              <table>
                <thead><tr><th>Data</th><th>Ação</th><th>O que mudou</th><th>Antes</th><th>Depois</th></tr></thead>
                <tbody>{modal.rows.map(r => (<tr key={r.id}><td className="small muted">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td>{r.acao?.replaceAll('_', ' ') || 'Alteração'}</td><td>{historyFieldLabel(r.campo)}</td><td className="mono small">{r.valor_anterior || '—'}</td><td className="mono small">{r.valor_novo || '—'}</td></tr>))}</tbody>
              </table>
            </div>
          )}
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
