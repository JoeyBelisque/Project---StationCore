import { useEffect, useMemo, useState } from 'react'
import { HEADSET_STATUS, labelByValue } from '../constants/status'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { listarHeadsets, removerHeadset, salvarHeadset } from '../services/headsetStorage'

const PAGE_SIZE = 20

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
  const [items, setItems] = useState(() => listarHeadsets())
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((h) => {
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
  }, [items, q])

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1)
    setPage((p) => Math.min(p, maxPage))
  }, [filtered.length])

  function refresh() {
    setItems(listarHeadsets())
  }

  function openNew() {
    setModal({ mode: 'edit', form: emptyForm() })
  }

  function openEdit(row) {
    setModal({ mode: 'edit', form: { ...emptyForm(), ...row } })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const f = modal.form
    salvarHeadset({
      id: f.id,
      matricula: f.matricula.trim(),
      lacre: f.lacre.trim(),
      marca: f.marca.trim(),
      numeroSerie: f.numeroSerie.trim(),
      status: f.status,
      observacoes: f.observacoes.trim(),
    })
    refresh()
    setModal(null)
  }

  function handleDelete(id) {
    if (!confirm('Remover este headset do cadastro local?')) return
    removerHeadset(id)
    refresh()
  }

  return (
    <div className="page">
      <div className="page-head row">
        <div>
          <h2>Headsets</h2>
          <p className="muted">
            Vínculo operador (matrícula) ↔ lacre; marca e série. Dados salvos neste navegador até
            existir API.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={openNew}>
          Novo headset
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="input search"
          placeholder="Buscar por matrícula, lacre, marca, série…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
          aria-label="Buscar headsets"
        />
      </div>

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
            {pageItems.length === 0 ? (
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
