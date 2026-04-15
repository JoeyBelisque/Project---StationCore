import { useCallback, useEffect, useMemo, useState } from 'react'
import { PC_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import {
  criarComputador,
  listarComputadores,
  atualizarComputador,
  removerComputador,
} from '../services/computadoresApi'

const PAGE_SIZE = 25

const emptyForm = () => ({
  id: null,
  hostname: '',
  serial_number: '',
  status: 'em_uso',
  pa: '',
})

export function ComputadoresPage() {
  // Mostra data/hora de atualização com fallback seguro para dados antigos/incompletos.
  function formatUpdatedAt(value) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('pt-BR')
  }

  const [rows, setRows] = useState([])
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
      const data = await listarComputadores()
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Falha ao carregar')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter && String(r.status) !== statusFilter) return false
      if (!s) return true
      const blob = [r.hostname, r.serial_number, r.pa, r.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
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

  async function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = {
      hostname: String(fd.get('hostname') || '').trim(),
      serial_number: String(fd.get('serial_number') || '').trim(),
      status: String(fd.get('status') || 'em_uso'),
      pa: String(fd.get('pa') || '').trim(),
    }
    try {
      if (modal.form.id) {
        await atualizarComputador(modal.form.id, body)
      } else {
        await criarComputador(body)
      }
      setModal(null)
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao salvar')
    }
  }

  function openNew() {
    setModal({ mode: 'edit', form: emptyForm() })
  }

  function openEdit(row) {
    setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })
  }

  async function handleDelete(id) {
    if (!confirm('Remover este computador do cadastro?')) return
    try {
      await removerComputador(id)
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="page">
      <div className="page-head row">
        <div>
          <h2>Computadores por PA</h2>
          <p className="muted">
            Hostname, número de série e PA. Use busca e filtros para achar equipamentos entre milhares
            de registros.
          </p>
        </div>
        <div className="row gap">
          <button type="button" className="btn" onClick={load} disabled={loading}>
            Atualizar
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={openNew}
            disabled={!!error}
          >
            Novo computador
          </button>
        </div>
      </div>

      {error && (
        <div className="banner error" role="alert">
          <strong>Backend:</strong> {error}. Confirme se o servidor está em{' '}
          <code>http://localhost:3000</code> e o banco configurado.
        </div>
      )}

      <div className="toolbar row wrap">
        <input
          type="search"
          className="input search grow"
          placeholder="Buscar por hostname, série, PA…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
          aria-label="Buscar computadores"
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
          {PC_STATUS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        {loading ? (
          <p className="muted padded">Carregando…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PA</th>
                <th>Hostname</th>
                <th>Nº série</th>
                <th>Status</th>
                <th>Atualizado</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {rows.length === 0
                      ? 'Nenhum computador cadastrado ou API indisponível.'
                      : 'Nenhum resultado para o filtro atual.'}
                  </td>
                </tr>
              ) : (
                pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.pa ?? '—'}</td>
                    <td className="mono">{r.hostname ?? '—'}</td>
                    <td className="mono">{r.serial_number ?? '—'}</td>
                    <td>
                      <span className={`badge pc-${r.status}`}>
                        {labelByValue(PC_STATUS, r.status)}
                      </span>
                    </td>
                    <td className="muted small">
                      {/* Compatibilidade com payloads antigos e novos do backend. */}
                      {formatUpdatedAt(r.updated_at ?? r.atualizadoEm ?? r.atualizado_em)}
                    </td>
                    <td className="col-actions">
                      <button type="button" className="btn link" onClick={() => openEdit(r)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn link danger"
                        onClick={() => handleDelete(r.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />

      {modal && (
        <Modal
          title={modal.form.id ? 'Editar computador' : 'Cadastrar computador'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit" form="form-pc" className="btn primary">
                Salvar
              </button>
            </>
          }
        >
          <form id="form-pc" className="form-grid" onSubmit={handleSubmit}>
            <label>
              PA (mesa / posto)
              <input
                name="pa"
                className="input"
                defaultValue={modal.form.pa}
                required
              />
            </label>
            <label>
              Hostname
              <input
                name="hostname"
                className="input mono"
                defaultValue={modal.form.hostname}
                required
              />
            </label>
            <label>
              Número de série
              <input
                name="serial_number"
                className="input mono"
                defaultValue={modal.form.serial_number}
                required
              />
            </label>
            <label className="full">
              Status
              <select name="status" className="input" defaultValue={modal.form.status}>
                {PC_STATUS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </Modal>
      )}
    </div>
  )
}
