import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Componente Modal Premium
 * Exibe conteúdo sobreposto com fundo escurecido e centralização garantida usando Portal.
 * Agora suporta um ícone opcional no cabeçalho para maior impacto visual.
 */
export function Modal({ title, icon: Icon, children, onClose, footer, size = 'md' }) {
  // Fecha o modal ao pressionar a tecla Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden' // Bloqueia scroll do fundo
    
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset' // Restaura scroll
    }
  }, [onClose])

  const modalRoot = document.body

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal-panel modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {Icon && (
              <div style={{ 
                color: 'var(--accent)', 
                background: 'var(--accent-glow)', 
                padding: '0.5rem', 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={20} />
              </div>
            )}
            <h2 id="modal-title">{title}</h2>
          </div>
          <button 
            type="button" 
            className="btn-icon-close" 
            onClick={onClose} 
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <footer className="modal-foot">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    modalRoot
  )
}
