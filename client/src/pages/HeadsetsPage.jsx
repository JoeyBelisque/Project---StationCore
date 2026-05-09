import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HEADSET_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import {
  atualizarHeadset,
  criarHeadset,
  listarHistoricoHeadset,
  listarHeadsets,
  removerHeadset,
  trocarLacreHeadset,
} from '../services/headsetsApi'

const PAGE_SIZE = 20

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

function mapRow(r) {
  // Adapta o formato da API para o formato usado pela tela.
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
  categoria: 'estoque',
  observacoes: '',
})

export function HeadsetsPage() {
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

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (statusFilter) next.set('status', statusFilter)
    else next.delete('status')
    if (categoriaFilter) next.set('categoria', categoriaFilter)
    else next.delete('categoria')
    setSearchParams(next, { replace: true })
  }, [statusFilter, categoriaFilter, searchParams, setSearchParams])

  const stats = useMemo(() => {
    return {
      total: items.length,
      estoque: items.filter((h) => h.status === 'estoque').length,
      emUso: items.filter((h) => h.status === 'em_uso').length,
      manutencao: items.filter((h) => h.status === 'manutencao').length,
    }
  }, [items])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    // Concentra todas as regras de filtro em um único passo:
    // status primeiro e busca textual depois.
    return items.filter((h) => {
      if (statusFilter && String(h.status) !== statusFilter) return false
      if (categoriaFilter && String(h.categoria) !== categoriaFilter) return false
      if (!s) return true
      const blob = [
        h.matricula,
        h.lacre,
        h.marca,
        h.numeroSerie,
        h.categoria,
        h.observacoes,
        labelByValue(HEADSET_STATUS, h.status),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(s)
    })
  }, [items, q, statusFilter, categoriaFilter])

  const visibleRows = useMemo(() => {
    if (viewMode === 'inventario') return filtered
    return filtered.filter((h) => h.matricula && h.status === 'em_uso')
  }, [filtered, viewMode])

  const pageItems = useMemo(() => {
    // Paginação em memória para manter a UI rápida com lista filtrada.
    const start = page * PAGE_SIZE
    return visibleRows.slice(start, start + PAGE_SIZE)
  }, [visibleRows, page])

  useEffect(() => {
    // Se o filtro reduz o total, evita ficar em página inválida.
    const maxPage = Math.max(0, Math.ceil(visibleRows.length / PAGE_SIZE) - 1)
    setPage((p) => Math.min(p, maxPage))
  }, [visibleRows.length])

  function openNew() {
    setModal({ mode: 'edit', form: emptyForm() })
  }

  function openNewAsset() {
    setModal({
      mode: 'edit',
      form: {
        ...emptyForm(),
        status: 'estoque',
        categoria: 'estoque',
      },
    })
  }

  function openEdit(row) {
    setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })
  }

  function openVincular(row) {
    setModal({
      mode: 'vincular',
      form: {
        id: row.id,
        lacre: row.lacre,
        matricula: row.matricula ?? '',
        observacoes: row.observacoes ?? '',
      },
    })
  }

  function openTrocaLacre(row) {
    setModal({
      mode: 'trocaLacre',
      form: {
        id: row.id,
        lacreAtual: row.lacre,
        novoLacre: '',
        observacao: '',
      },
    })
  }

  function openAcoes(row) {
    setModal({ mode: 'acoes', headset: row })
  }

  async function openHistorico(row) {
    setModal({
      mode: 'historico',
      headset: row,
      loading: true,
      rows: [],
      error: '',
    })
    try {
      const data = await listarHistoricoHeadset(row.id)
      setModal({
        mode: 'historico',
        headset: row,
        loading: false,
        rows: Array.isArray(data) ? data : [],
        error: '',
      })
    } catch (err) {
      setModal({
        mode: 'historico',
        headset: row,
        loading: false,
        rows: [],
        error: err.message || 'Falha ao carregar histórico',
      })
    }
  }

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
    // Regra de negócio: o mesmo número de série não pode estar em uso em dois registros.
    if (body.status === 'em_uso' && body.numero_serie.trim()) {
      const duplicado = items.some(
        (h) => h.status === 'em_uso' && h.numeroSerie === body.numero_serie && h.id !== f.id
      )
      if (duplicado) {
        alert('Erro: Ja existe um headset em uso com este numero de serie!\n\nUm headset so pode estar em uso uma unica vez.')
        return
      }
    }
    
    try {
      if (f.id) {
        await atualizarHeadset(f.id, body)
      } else {
        await criarHeadset(body)
      }
      setModal(null)
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao salvar')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remover este headset do cadastro?')) return
    try {
      await removerHeadset(id)
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  async function handleTrocaLacre(e) {
    e.preventDefault()
    const f = modal.form
    if (!f.novoLacre.trim()) {
      alert('Informe o novo lacre.')
      return
    }
    try {
      await trocarLacreHeadset(f.id, {
        novo_lacre: f.novoLacre.trim(),
        observacao: f.observacao.trim(),
      })
      setModal(null)
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao trocar lacre')
    }
  }

  async function handleVincular(e) {
    e.preventDefault()
    const f = modal.form
    if (!f.matricula.trim()) {
      alert('Informe a matrícula do operador para vincular.')
      return
    }
    const row = items.find((h) => h.id === f.id)
    if (!row) return
    try {
      await atualizarHeadset(f.id, {
        matricula: f.matricula.trim(),
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status: 'em_uso',
        categoria: 'operacao',
        observacoes: f.observacoes.trim(),
      })
      setModal(null)
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao vincular operador')
    }
  }

  async function handleBaixaOperador(row) {
    if (!confirm(`Dar baixa do operador no lacre ${row.lacre}?`)) return
    try {
      await atualizarHeadset(row.id, {
        matricula: '',
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status: 'estoque',
        categoria: 'estoque',
        observacoes: `Baixa de operador em ${new Date().toLocaleString('pt-BR')}`,
      })
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao dar baixa no operador')
    }
  }

  async function atualizarStatusRapido(row, status, categoria, observacao) {
    try {
      await atualizarHeadset(row.id, {
        matricula: status === 'estoque' ? '' : row.matricula || '',
        lacre: row.lacre,
        marca: row.marca,
        numero_serie: row.numeroSerie,
        status,
        categoria,
        observacoes: observacao,
      })
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao atualizar status')
    }
  }

  return (
    <div className="page">
      <div className="page-head row">
        <div>
          <h2>Headsets</h2>
          <p className="muted">
            Fluxo simples: 1) cadastrar headset no estoque, 2) vincular operador quando for para uso.
          </p>
        </div>
        <div className='row gap'>
        <button  type="button" className="btn" onClick={load} disabled={loading}>
            Atualizar
        </button>
        <button type="button" className="btn" onClick={openNewAsset}>
          Cadastrar headset
        </button>
        <button type="button" className="btn primary" onClick={openNew}>
          Cadastro completo
        </button>
        </div>
      </div>

      <div className="segmented-control" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`segment ${viewMode === 'inventario' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('inventario')
            setPage(0)
          }}
        >
          Inventário de headsets
        </button>
        <button
          type="button"
          className={`segment ${viewMode === 'vinculos' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('vinculos')
            setStatusFilter('em_uso')
            setCategoriaFilter('operacao')
            setPage(0)
          }}
        >
          Vínculos com operadores
        </button>
      </div>

      <div className="stat-row" style={{ marginBottom: '1rem' }}>
        <button type="button" className="stat-card icon headsets" onClick={() => setStatusFilter('')}>
          <span className="stat-label">Total</span>
          <strong className="stat-value">{stats.total}</strong>
          <span className="stat-hint">ativos cadastrados</span>
        </button>
        <button type="button" className="stat-card icon reserved" onClick={() => setStatusFilter('estoque')}>
          <span className="stat-label">Em estoque</span>
          <strong className="stat-value">{stats.estoque}</strong>
          <span className="stat-hint">prontos para vínculo</span>
        </button>
        <button type="button" className="stat-card icon maintenance" onClick={() => setStatusFilter('manutencao')}>
          <span className="stat-label">Em manutenção</span>
          <strong className="stat-value">{stats.manutencao}</strong>
          <span className="stat-hint">fora de operação</span>
        </button>
        <button type="button" className="stat-card icon useless" onClick={() => setStatusFilter('defeito')}>
          <span className="stat-label">Com defeito</span>
          <strong className="stat-value">{items.filter((h) => h.status === 'defeito').length}</strong>
          <span className="stat-hint">aguardando manutenção</span>
        </button>
      </div>

      <div className="toolbar row wrap headset-filters">
        <input
          type="search"
          className="input search grow"
          placeholder="Buscar por matrícula, lacre, série, categoria…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
          aria-label="Buscar headsets"
        />
        <select
          className="input filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(0)
          }}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          {HEADSET_STATUS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="input filter-select"
          value={categoriaFilter}
          onChange={(e) => {
            setCategoriaFilter(e.target.value)
            setPage(0)
          }}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          <option value="estoque">Estoque</option>
          <option value="emprestimo">Empréstimo</option>
          <option value="entrega">Entrega</option>
          <option value="manutencao">Manutenção</option>
          <option value="operacao">Operação</option>
        </select>
      </div>

      {error && (
        <p className="muted" role="alert">
          {error} — confira se o backend está em <code>http://localhost:3000</code> e se rodou{' '}
          <code>npm run db:migrate</code> após criar a tabela <code>headsets</code>.
        </p>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Lacre</th>
              <th>Marca</th>
              <th>Nº série</th>
              <th>Status</th>
              <th>Categoria</th>
              <th>Atualizado</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  Carregando…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  {viewMode === 'vinculos'
                    ? 'Nenhum vínculo encontrado com os filtros atuais.'
                    : 'Nenhum registro. Use "Cadastrar headset" ou ajuste a busca.'}
                </td>
              </tr>
            ) : (
              pageItems.map((h) => (
                <tr
                  key={h.id}
                  style={
                    h.status === 'manutencao'
                      ? { background: 'rgba(250, 204, 21, 0.08)' }
                      : h.status === 'defeito'
                      ? { background: 'rgba(251, 146, 60, 0.08)' }
                      : undefined
                  }
                >
                  <td>{h.matricula || '—'}</td>
                  <td className="mono">{h.lacre || '—'}</td>
                  <td>{h.marca || '—'}</td>
                  <td className="mono">{h.numeroSerie || '—'}</td>
                  <td>
                    <span className={`badge s-${h.status}`}>
                      {labelByValue(HEADSET_STATUS, h.status)}
                    </span>
                  </td>
                  <td>{categoryLabel(h.categoria)}</td>
                  <td className="muted small">
                    {h.atualizadoEm
                      ? new Date(h.atualizadoEm).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td className="col-actions">
                    <button type="button" className="btn small" onClick={() => openAcoes(h)}>
                      Ações
                    </button>
                    <button type="button" className="btn link" onClick={() => openHistorico(h)}>
                      Histórico
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
        pageSize={PAGE_SIZE}
        total={visibleRows.length}
        onPageChange={setPage}
      />

      {modal?.mode === 'edit' && (
        <Modal
          title={modal.form.id ? 'Editar headset' : 'Novo headset'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit" form="form-headset" className="btn primary">
                Salvar
              </button>
            </>
          }
        >
          <form id="form-headset" className="form-grid" onSubmit={handleSubmit}>
            <label>
              Matrícula (operador)
              <input
                className="input"
                value={modal.form.matricula}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, matricula: e.target.value } }))
                }
              />
            </label>
            <label>
              Lacre
              <input
                className="input"
                value={modal.form.lacre}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, lacre: e.target.value } }))
                }
                required
              />
            </label>
            <label>
              Marca
              <select
                className="input"
                value={modal.form.marca}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, marca: e.target.value } }))
                }
              >
                <option value="">Selecione</option>
                <option value="intelbras">Intelbras</option>
                <option value="plantronics">Plantronics</option>
              </select>
            </label>
            <label>
              Número de série
              <input
                className="input mono"
                value={modal.form.numeroSerie}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, numeroSerie: e.target.value } }))
                }
              />
            </label>
            <label className="full">
              Status
              <select
                className="input"
                value={modal.form.status}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))
                }
              >
                {HEADSET_STATUS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <select
                className="input"
                value={modal.form.categoria}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, categoria: e.target.value } }))
                }
              >
                <option value="estoque">Estoque</option>
                <option value="emprestimo">Empréstimo</option>
                <option value="entrega">Entrega</option>
                <option value="manutencao">Manutenção</option>
                <option value="operacao">Operação</option>
              </select>
            </label>
            <label className="full">
              Observações (troca, desligamento, etc.)
              <textarea
                className="input"
                rows={3}
                value={modal.form.observacoes}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, observacoes: e.target.value } }))
                }
              />
            </label>
          </form>
        </Modal>
      )}

      {modal?.mode === 'trocaLacre' && (
        <Modal
          title="Trocar lacre"
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit" form="form-troca-lacre" className="btn primary">
                Confirmar troca
              </button>
            </>
          }
        >
          <form id="form-troca-lacre" className="form-grid" onSubmit={handleTrocaLacre}>
            <label>
              Lacre atual
              <input className="input mono" value={modal.form.lacreAtual} disabled />
            </label>
            <label>
              Novo lacre
              <input
                className="input mono"
                value={modal.form.novoLacre}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, novoLacre: e.target.value } }))
                }
                required
              />
            </label>
            <label className="full">
              Motivo/observação
              <textarea
                className="input"
                rows={3}
                value={modal.form.observacao}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, observacao: e.target.value } }))
                }
              />
            </label>
          </form>
        </Modal>
      )}

      {modal?.mode === 'vincular' && (
        <Modal
          title={`Vincular operador - ${modal.form.lacre}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit" form="form-vincular" className="btn primary">
                Vincular
              </button>
            </>
          }
        >
          <form id="form-vincular" className="form-grid" onSubmit={handleVincular}>
            <label>
              Matrícula do operador
              <input
                className="input"
                value={modal.form.matricula}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, matricula: e.target.value } }))
                }
                required
              />
            </label>
            <label className="full">
              Observações
              <textarea
                className="input"
                rows={3}
                value={modal.form.observacoes}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, observacoes: e.target.value } }))
                }
              />
            </label>
          </form>
        </Modal>
      )}

      {modal?.mode === 'historico' && (
        <Modal
          title={`Histórico - ${modal.headset.lacre}`}
          onClose={() => setModal(null)}
          footer={
            <button type="button" className="btn" onClick={() => setModal(null)}>
              Fechar
            </button>
          }
        >
          {modal.loading ? (
            <p className="muted">Carregando histórico…</p>
          ) : modal.error ? (
            <p className="muted" role="alert">
              {modal.error}
            </p>
          ) : modal.rows.length === 0 ? (
            <p className="muted">Nenhuma alteração registrada.</p>
          ) : (
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Ação</th>
                    <th>Campo</th>
                    <th>De</th>
                    <th>Para</th>
                  </tr>
                </thead>
                <tbody>
                  {modal.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted small">
                        {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td>{r.acao || '—'}</td>
                      <td>{r.campo || '—'}</td>
                      <td className="mono">{r.valor_anterior || '—'}</td>
                      <td className="mono">{r.valor_novo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {modal?.mode === 'acoes' && (
        <Modal
          title={`Ações - ${modal.headset.lacre}`}
          onClose={() => setModal(null)}
          footer={
            <button type="button" className="btn" onClick={() => setModal(null)}>
              Fechar
            </button>
          }
        >
          <div className="form-grid">
            <button type="button" className="btn" onClick={() => openEdit(modal.headset)}>
              Editar cadastro
            </button>
            {(modal.headset.status === 'estoque' || modal.headset.status === 'reserva') && (
              <button type="button" className="btn" onClick={() => openVincular(modal.headset)}>
                Vincular operador
              </button>
            )}
            {modal.headset.status === 'em_uso' && modal.headset.matricula && (
              <button type="button" className="btn" onClick={() => handleBaixaOperador(modal.headset)}>
                Dar baixa do operador
              </button>
            )}
            {(modal.headset.status === 'em_uso' || modal.headset.status === 'estoque') && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  atualizarStatusRapido(
                    modal.headset,
                    'defeito',
                    'manutencao',
                    `Marcado com defeito em ${new Date().toLocaleString('pt-BR')}`
                  )
                }
              >
                Marcar com defeito
              </button>
            )}
            {(modal.headset.status === 'defeito' || modal.headset.status === 'manutencao') && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  atualizarStatusRapido(
                    modal.headset,
                    'estoque',
                    'estoque',
                    `Retorno da manutenção em ${new Date().toLocaleString('pt-BR')}`
                  )
                }
              >
                Retorno da manutenção
              </button>
            )}
            <button type="button" className="btn" onClick={() => openTrocaLacre(modal.headset)}>
              Trocar lacre
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                handleDelete(modal.headset.id)
                setModal(null)
              }}
            >
              Excluir headset
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
