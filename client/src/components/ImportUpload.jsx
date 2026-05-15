import { useState } from 'react'
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  ArrowRight
} from 'lucide-react'
import { getApiBase } from '../lib/api'

export function ImportUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFileSelect(selectedFile) {
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Apenas arquivos .xlsx são permitidos!')
      setFile(null)
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande (máximo 5MB)')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setValidationResult(null)
    setSuccess(null)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  function handleInputChange(e) {
    const files = e.target.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  async function validateFile() {
    if (!file) {
      setError('Selecione um arquivo primeiro')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('arquivo', file)

      const token = localStorage.getItem('stationcore.auth.session')
      const session = token ? JSON.parse(token) : null
      const headers = {
        Authorization: `Bearer ${session?.token || ''}`,
      }

      const response = await fetch(`${getApiBase()}/importacao/inicial?modo=validar`, {
        method: 'POST',
        headers,
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Erro ao validar arquivo')
        return
      }

      setValidationResult(result)
      setSuccess(`Validação OK: ${result.registros?.length || 0} registros encontrados`)
    } catch (err) {
      setError(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function importFile() {
    if (!validationResult) {
      setError('Valide o arquivo primeiro')
      return
    }

    if (!window.confirm(`Tem certeza que quer importar ${validationResult.registros?.length || 0} registros?`)) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('arquivo', file)

      const token = localStorage.getItem('stationcore.auth.session')
      const session = token ? JSON.parse(token) : null
      const headers = {
        Authorization: `Bearer ${session?.token || ''}`,
      }

      const response = await fetch(`${getApiBase()}/importacao/inicial?modo=importar`, {
        method: 'POST',
        headers,
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Erro ao importar')
        return
      }

      setSuccess(`Importação concluída! ${result.importados || 0} registros inseridos.`)
      setFile(null)
      setValidationResult(null)
      
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="import-upload">
      <div className="drop-zone-wrapper">
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          {file ? (
            <div className="file-info">
              <div className="file-icon-wrapper">
                <FileSpreadsheet size={40} className="text-success" />
              </div>
              <div>
                <strong>{file.name}</strong>
                <small>{(file.size / 1024).toFixed(2)} KB</small>
              </div>
            </div>
          ) : (
            <div className="drop-content">
              <div className="drop-icon-wrapper">
                <UploadCloud size={48} />
              </div>
              <p>Arraste um arquivo .xlsx aqui</p>
              <small>ou clique para selecionar do computador</small>
            </div>
          )}
          <input
            type="file"
            accept=".xlsx"
            onChange={handleInputChange}
            style={{ display: 'none' }}
            id="file-input"
          />
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Resultado da Validação */}
      {validationResult && (
        <div className="card validation-card">
          <h4 className="card-title"><CheckCircle size={18} /> Validação Concluída</h4>
          <div className="validation-details">
            <div className="detail-item">
              <span className="label">Registros encontrados:</span>
              <strong className="value">{validationResult.registros?.length || 0}</strong>
            </div>
            {validationResult.tiposEncontrados && (
              <div className="detail-item">
                <span className="label">Tipos detectados:</span>
                <strong className="value">{validationResult.tiposEncontrados.join(', ')}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botões */}
      <div className="button-group">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => document.getElementById('file-input').click()}
        >
          <RefreshCw size={16} />
          {file ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
        </button>
        
        <button
          type="button"
          className="btn btn-primary"
          onClick={validateFile}
          disabled={!file || loading}
        >
          {loading && <RefreshCw size={16} className="animate-spin" />}
          {!loading && <CheckCircle size={16} />}
          {loading ? 'Validando...' : 'Validar Planilha'}
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{ background: 'var(--success)' }}
          onClick={importFile}
          disabled={!validationResult || loading}
        >
          {loading && <RefreshCw size={16} className="animate-spin" />}
          {!loading && <ArrowRight size={16} />}
          {loading ? 'Importando...' : 'Confirmar Importação'}
        </button>
      </div>

      <style>{`
        .import-upload {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: var(--transition);
          background: var(--surface);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .drop-zone:hover {
          border-color: var(--accent);
          background: var(--surface-hover);
        }

        .drop-zone.dragging {
          border-color: var(--accent);
          background: var(--accent-glow);
          transform: scale(1.01);
        }

        .drop-zone.has-file {
          border-color: var(--success);
          background: rgba(16, 185, 129, 0.05);
        }

        .drop-icon-wrapper {
          color: var(--text-muted);
          margin-bottom: 1rem;
          transition: var(--transition);
        }

        .drop-zone:hover .drop-icon-wrapper {
          color: var(--accent);
          transform: translateY(-5px);
        }

        .file-icon-wrapper {
          margin-bottom: 0.5rem;
        }

        .file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .file-info strong {
          display: block;
          font-size: 1rem;
          color: var(--text);
        }

        .file-info small {
          color: var(--text-muted);
        }

        .drop-content p {
          margin-bottom: 0.25rem;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .drop-content small {
          color: var(--text-muted);
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .alert-danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .validation-card {
          margin-top: 0.5rem;
        }

        .validation-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }

        .detail-item .label {
          color: var(--text-muted);
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .button-group .btn {
          flex: 1;
        }

        @media (max-width: 640px) {
          .button-group {
            flex-direction: column;
          }
        }

        @keyframes animate-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: animate-spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
