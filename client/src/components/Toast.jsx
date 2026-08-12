import { useState, useRef } from 'react'
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react'
import { ToastContext } from './ToastContext'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextToastId = useRef(0)

  const addToast = (message, type = 'success', options = {}) => {
    setToasts((prev) => {
      if (prev.some(toast => toast.message === message && toast.type === type)) return prev
      const id = `${Date.now()}-${nextToastId.current++}`
      const duration = options.duration ?? (type === 'error' || type === 'warning' ? 8000 : 5000)
      const persistent = options.persistent ?? false
      
      if (!persistent) {
        setTimeout(() => removeToast(id), duration)
      }

      return [...prev, { id, message, type, persistent }]
    })
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type} ${t.persistent ? 'toast-persistent' : ''} page-fade-in`}>
            <div className="toast-icon">
              {t.type === 'success' && <CheckCircle size={20} />}
              {t.type === 'error' && <XCircle size={20} />}
              {t.type === 'warning' && <AlertCircle size={20} />}
              {t.type === 'info' && <Info size={20} />}
            </div>
            <div className="toast-content">
              {t.persistent && <span className="toast-badge">ALERTA</span>}
              <span className="toast-message">{t.message}</span>
            </div>
            <button className="toast-close" onClick={() => removeToast(t.id)} title="Fechar">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        .toast-persistent {
          border-left: 4px solid var(--accent) !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
          animation: toast-pulse 2s infinite;
        }
        @keyframes toast-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .toast-badge {
          font-size: 0.65rem;
          font-weight: 800;
          background: var(--accent);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 4px;
          display: inline-block;
          width: fit-content;
        }
        .toast-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
      `}</style>
    </ToastContext.Provider>
  )
}
