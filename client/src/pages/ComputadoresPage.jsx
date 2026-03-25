import { useCallback, useEffect, useMemo, useState } from 'react'
import { PC_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { criarComputador, listarComputadores } from '../services/computadoresApi'

const PAGE_SIZE = 25

const emptyForm = () => ({
  hostname: '',
  serial_number: '',
  status: 'em_uso',
  pa: '',
})

export function ComputadoresPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(false)

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

  async function handleCreate(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = {
      hostname: String(fd.get('hostname') || '').trim(),
      serial_number: String(fd.get('serial_number') || '').trim(),
      status: String(fd.get('status') || 'em_uso'),
      pa: String(fd.get('pa') || '').trim(),
    }
    try {
      await criarComputador(body)
      setModal(false)
      await load()
    } catch (err) {
      alert(err.message || 'Erro ao salvar')
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
            onClick={() => setModal(true)}
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
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    {rows.length === 0
                      ? 'Nenhum computador cadastrado ou API indisponível.'
                      : 'Nenhum resultado para o filtro atual.'}
                  </td>
                </tr>
              ) : (
                pageItems.map((r) => (
                  <tr key={r.id ?? `${r.hostname}-${r.serial_number}`}>
                    <td className="mono">{r.pa ?? '—'}</td>
                    <td className="mono">{r.hostname ?? '—'}</td>
                    <td className="mono">{r.serial_number ?? '—'}</td>
                    <td>
                      <span className={`badge pc-${r.status}`}>
                        {labelByValue(PC_STATUS, r.status)}
                      </span>
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
          title="Cadastrar computador"
          onClose={() => setModal(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button type="submit" form="form-pc" className="btn primary">
                Salvar
              </button>
            </>
          }
        >
          <form id="form-pc" className="form-grid" onSubmit={handleCreate}>
            <label>
              PA (mesa / posto)
              <input name="pa" className="input" required />
            </label>
            <label>
              Hostname
              <input name="hostname" className="input mono" required />
            </label>
            <label>
              Número de série
              <input name="serial_number" className="input mono" required />
            </label>
            <label className="full">
              Status
              <select name="status" className="input" defaultValue={emptyForm().status}>
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
