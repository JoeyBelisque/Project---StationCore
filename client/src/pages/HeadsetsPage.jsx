import { useCallback, useEffect, useMemo, useState } from 'react'
import { HEADSET_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import {
  atualizarHeadset,
  criarHeadset,
  listarHeadsets,
  removerHeadset,
} from '../services/headsetsApi'

const PAGE_SIZE = 20

function mapRow(r) {
  // Adapta o formato da API para o formato usado pela tela.
  return {
    id: r.id,
    matricula: r.matricula,
    lacre: r.lacre,
    marca: r.marca ?? '',
    numeroSerie: r.numero_serie ?? '',
    status: r.status,
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
  status: 'em_uso',
  observacoes: '',
})

export function HeadsetsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    // Concentra todas as regras de filtro em um único passo:
    // status primeiro e busca textual depois.
    return items.filter((h) => {
      if (statusFilter && String(h.status) !== statusFilter) return false
      if (!s) return true
      const blob = [
        h.matricula,
        h.lacre,
        h.marca,
        h.numeroSerie,
        h.observacoes,
        labelByValue(HEADSET_STATUS, h.status),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(s)
    })
  }, [items, q, statusFilter])

  const pageItems = useMemo(() => {
    // Paginação em memória para manter a UI rápida com lista filtrada.
    const start = page * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    // Se o filtro reduz o total, evita ficar em página inválida.
    const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1)
    setPage((p) => Math.min(p, maxPage))
  }, [filtered.length])

  function openNew() {
    setModal({ mode: 'edit', form: emptyForm() })
  }

  function openEdit(row) {
    setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })
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

  return (
    <div className="page">
      <div className="page-head row">
        <div>
          <h2>Headsets</h2>
          <p className="muted">
            Vínculo operador (matrícula) ↔ lacre; marca e série. Dados no PostgreSQL (mesma API que
            computadores).
          </p>
        </div>
        <div className='row gap'>
        <button  type="button" className="btn" onClick={load} disabled={loading}>
            Atualizar
        </button>
        <button type="button" className="btn primary" onClick={openNew}>
          Novo headset
        </button>
        </div>
      </div>

      <div className="toolbar row wrap">
        <input
          type="search"
          className="input search grow"
          placeholder="Buscar por matrícula, lacre, série…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
          aria-label="Buscar headsets"
        />
        <select
          className="input"
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
              <th>Atualizado</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Carregando…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Nenhum registro. Use &quot;Novo headset&quot; ou ajuste a busca.
                </td>
              </tr>
            ) : (
              pageItems.map((h) => (
                <tr key={h.id}>
                  <td>{h.matricula || '—'}</td>
                  <td className="mono">{h.lacre || '—'}</td>
                  <td>{h.marca || '—'}</td>
                  <td className="mono">{h.numeroSerie || '—'}</td>
                  <td>
                    <span className={`badge s-${h.status}`}>
                      {labelByValue(HEADSET_STATUS, h.status)}
                    </span>
                  </td>
                  <td className="muted small">
                    {h.atualizadoEm
                      ? new Date(h.atualizadoEm).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td className="col-actions">
                    <button type="button" className="btn link" onClick={() => openEdit(h)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn link danger"
                      onClick={() => handleDelete(h.id)}
                    >
                      Excluir
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
        total={filtered.length}
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
                required
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
              <input
                className="input"
                value={modal.form.marca}
                onChange={(e) =>
                  setModal((m) => ({ ...m, form: { ...m.form, marca: e.target.value } }))
                }
              />
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
    </div>
  )
}
