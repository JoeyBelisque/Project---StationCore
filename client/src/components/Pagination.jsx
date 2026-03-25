export function Pagination({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const safe = Math.min(page, pages - 1)
  const from = total === 0 ? 0 : safe * pageSize + 1
  const to = Math.min((safe + 1) * pageSize, total)

  return (
    <div className="pagination-bar">
      <span className="muted">
        {total === 0 ? 'Nenhum registro' : `${from}–${to} de ${total}`}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn small"
          disabled={safe <= 0}
          onClick={() => onPageChange(safe - 1)}
        >
          Anterior
        </button>
        <span className="muted">
          Página {safe + 1} / {pages}
        </span>
        <button
          type="button"
          className="btn small"
          disabled={safe >= pages - 1}
          onClick={() => onPageChange(safe + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
