import { useState } from 'react'
import { 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Loader2, 
  UploadCloud, 
  FileText,
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info
} from 'lucide-react'
import { importarHeadsets, importarComputadores } from '../services/importacaoApi'

/**
 * Item de Upload para Importação
 * Gerencia o estado de seleção, validação e envio de arquivos Excel.
 */
export function ImportUploadItem({ tipo = 'headsets' }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const isHeadset = tipo === 'headsets'
  const tipoLabel = isHeadset ? 'Headsets' : 'Computadores'

  // Validação básica de arquivo no cliente
  function handleFileSelect(selectedFile) {
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Apenas arquivos Excel (.xlsx) são suportados.')
      setFile(null)
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('O arquivo excede o limite de 5MB.')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setValidationResult(null)
    setSuccess(null)
    setShowErrors(false)
  }

  // Handlers para Drag & Drop
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0])
  }

  // Validação no servidor
  async function validateFile() {
    if (!file) return setError('Selecione um arquivo para validar.')

    setLoading(true)
    setError(null)
    setSuccess(null)
    setValidationResult(null)

    try {
      const importFunc = isHeadset ? importarHeadsets : importarComputadores
      const result = await importFunc(file, 'validar')
      
      if (!result.ok && result.errors?.length > 0) {
        setValidationResult(result)
        setError(`${result.errors.length} inconsistências encontradas.`)
      } else {
        setValidationResult(result)
        setSuccess(`Arquivo validado com sucesso!`)
      }
    } catch (err) {
      setError(err.details?.error || err.message || 'Erro na validação do arquivo.')
    } finally {
      setLoading(false)
    }
  }

  // Importação definitiva
  async function importFile() {
    if (!validationResult || !validationResult.ok) return setError('O arquivo possui erros que impedem a importação.')

    const total = isHeadset ? (validationResult.summary?.total_headsets || validationResult.registros?.length) : (validationResult.summary?.total_computadores || validationResult.registros?.length)
    if (!window.confirm(`Confirmar a importação de ${total || 0} ${tipoLabel.toLowerCase()}?`)) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const importFunc = isHeadset ? importarHeadsets : importarComputadores
      const result = await importFunc(file, 'importar')
      setSuccess(`${result.message || 'Importação concluída com sucesso!'}`)
      setFile(null)
      setValidationResult(null)
    } catch (err) {
      setError(err.details?.message || err.message || 'Erro durante a importação.')
    } finally {
      setLoading(false)
    }
  }

  const inputId = `file-input-${tipo}`
  const hasValidationErrors = validationResult && !validationResult.ok && validationResult.errors?.length > 0

  return (
    <div className="import-card-item-v2" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
      <div 
        className={`drop-zone-premium ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${hasValidationErrors ? 'has-errors' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && document.getElementById(inputId).click()}
      >
        {file ? (
          <div className="file-preview-v2">
            <div className="file-icon-box">
              <FileSpreadsheet size={32} className={hasValidationErrors ? 'text-danger' : 'text-accent'} />
            </div>
            <div className="file-meta">
              <strong title={file.name}>{file.name}</strong>
              <span>{(file.size / 1024).toFixed(2)} KB • Pronto para análise</span>
            </div>
            {!loading && (
              <button className="btn-remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); setValidationResult(null); setError(null); }}>
                <XCircle size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="drop-prompt-v2">
            <div className="upload-icon-circle">
              <UploadCloud size={32} />
            </div>
            <div className="prompt-text">
              <p>Arraste sua planilha aqui</p>
              <small>ou clique para navegar nos arquivos</small>
            </div>
          </div>
        )}
        <input 
          type="file" 
          accept=".xlsx" 
          onChange={(e) => handleFileSelect(e.target.files[0])} 
          style={{ display: 'none' }} 
          id={inputId} 
          disabled={loading}
        />
      </div>

      {/* Resultado da Validação / Erros */}
      {validationResult && (
        <div className={`validation-result-panel ${hasValidationErrors ? 'error' : 'success'}`}>
          <div className="panel-header" onClick={() => hasValidationErrors && setShowErrors(!showErrors)}>
            <div className="row gap">
              {hasValidationErrors ? <AlertTriangle size={18} className="text-danger" /> : <CheckCircle2 size={18} className="text-success" />}
              <div className="flex-1">
                <strong>{hasValidationErrors ? 'Inconsistências Detectadas' : 'Validação Concluída'}</strong>
                <p className="small muted">
                  {hasValidationErrors 
                    ? `${validationResult.errors.length} erro(s) impedem a importação` 
                    : `${isHeadset ? validationResult.summary?.total_headsets : validationResult.summary?.total_computadores} registros prontos para o banco`}
                </p>
              </div>
              {hasValidationErrors && (
                <button className="btn-toggle-errors">
                  {showErrors ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              )}
            </div>
          </div>

          {hasValidationErrors && showErrors && (
            <div className="error-list-scroll">
              <table className="error-table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Descrição do Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.errors.map((err, i) => (
                    <tr key={i}>
                      <td><span className="badge-line">{err.linha}</span></td>
                      <td className="error-msg">{err.erro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!hasValidationErrors && (
            <div className="validation-success-info">
              <div className="info-row">
                <Info size={14} />
                <span>Os dados foram pré-processados e estão íntegros.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedbacks de Status Gerais */}
      {error && !hasValidationErrors && (
        <div className="badge badge-danger w-full mt-1" style={{ padding: '0.75rem', justifyContent: 'center' }}>
          <AlertCircle size={14} style={{ marginRight: 6 }} /> {error}
        </div>
      )}

      {success && !validationResult && (
        <div className="badge badge-success w-full mt-1" style={{ padding: '0.75rem', justifyContent: 'center' }}>
          <CheckCircle2 size={14} style={{ marginRight: 6 }} /> {success}
        </div>
      )}

      {/* Ações */}
      <div className="row gap mt-1" style={{ marginTop: '1rem' }}>
        <button 
          className="btn btn-secondary flex-1" 
          onClick={(e) => { e.stopPropagation(); validateFile(); }} 
          disabled={!file || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
          {loading ? 'Analisando...' : 'Validar Planilha'}
        </button>
        
        <button 
          className="btn btn-primary flex-1" 
          onClick={(e) => { e.stopPropagation(); importFile(); }} 
          disabled={!validationResult || !validationResult.ok || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {loading ? 'Processando...' : 'Confirmar Importação'}
        </button>
      </div>

      <style>{`
        .import-card-item-v2 {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .drop-zone-premium {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          cursor: pointer;
          transition: var(--transition);
          background: rgba(var(--bg-rgb), 0.2);
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drop-zone-premium:hover {
          border-color: var(--accent);
          background: var(--accent-glow);
        }

        .drop-zone-premium.dragging {
          border-color: var(--accent);
          background: var(--accent-glow);
          transform: scale(1.02);
        }

        .drop-zone-premium.has-file {
          border-style: solid;
          border-color: var(--accent);
          background: rgba(14, 165, 233, 0.05);
        }

        .drop-zone-premium.has-errors {
          border-color: var(--danger);
          background: rgba(239, 68, 68, 0.05);
        }

        .file-preview-v2 {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          position: relative;
        }

        .file-icon-box {
          width: 56px;
          height: 56px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .file-meta {
          flex: 1;
          min-width: 0;
        }

        .file-meta strong {
          display: block;
          font-size: 0.9375rem;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-meta span {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .btn-remove-file {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: var(--transition);
        }

        .btn-remove-file:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }

        .drop-prompt-v2 {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          text-align: center;
        }

        .upload-icon-circle {
          width: 56px;
          height: 56px;
          background: var(--surface-hover);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: var(--transition);
        }

        .drop-zone-premium:hover .upload-icon-circle {
          color: var(--accent);
          background: var(--accent-glow);
          transform: translateY(-4px);
        }

        .prompt-text p {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text);
        }

        .prompt-text small {
          color: var(--text-muted);
        }

        .validation-result-panel {
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          overflow: hidden;
          background: var(--surface);
        }

        .validation-result-panel.error { border-color: rgba(239, 68, 68, 0.3); }
        .validation-result-panel.success { border-color: rgba(16, 185, 129, 0.3); }

        .panel-header {
          padding: 0.875rem;
          cursor: pointer;
          transition: var(--transition);
        }

        .panel-header:hover {
          background: var(--surface-hover);
        }

        .btn-toggle-errors {
          background: transparent;
          border: none;
          color: var(--text-muted);
        }

        .error-list-scroll {
          max-height: 200px;
          overflow-y: auto;
          border-top: 1px solid var(--border-light);
          background: rgba(239, 68, 68, 0.02);
        }

        .error-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .error-table th {
          padding: 0.5rem 0.875rem;
          text-align: left;
          background: var(--bg);
          color: var(--text-muted);
          position: sticky;
          top: 0;
          font-size: 0.7rem;
        }

        .error-table td {
          padding: 0.625rem 0.875rem;
          border-bottom: 1px solid var(--border-light);
        }

        .badge-line {
          background: var(--surface-hover);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-family: var(--font-mono);
          font-size: 0.75rem;
        }

        .error-msg {
          color: var(--danger);
          font-weight: 500;
        }

        .validation-success-info {
          padding: 0.875rem;
          border-top: 1px solid var(--border-light);
          background: rgba(16, 185, 129, 0.02);
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: var(--success);
          font-weight: 500;
        }

        .mt-1 { margin-top: 0.5rem; }
      `}</style>
    </div>
  )
}
