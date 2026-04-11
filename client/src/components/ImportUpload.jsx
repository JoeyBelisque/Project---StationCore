import { useState } from 'react'
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
      setError('❌ Apenas arquivos .xlsx são permitidos!')
      setFile(null)
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('❌ Arquivo muito grande (máximo 5MB)')
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
      setError('⚠️ Selecione um arquivo primeiro')
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
        setError(`❌ ${result.error || 'Erro ao validar arquivo'}`)
        return
      }

      setValidationResult(result)
      setSuccess(`✅ Validação OK: ${result.registros?.length || 0} registros encontrados`)
    } catch (err) {
      setError(`❌ Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function importFile() {
    if (!validationResult) {
      setError('⚠️ Valide o arquivo primeiro')
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
        setError(`❌ ${result.error || 'Erro ao importar'}`)
        return
      }

      setSuccess(`✅ Importação concluída! ${result.importados || 0} registros inseridos.`)
      setFile(null)
      setValidationResult(null)
      
      // Reset após 2 segundos
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError(`❌ Erro: ${err.message}`)
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
              <span className="file-icon">📄</span>
              <div>
                <strong>{file.name}</strong>
                <small>{(file.size / 1024).toFixed(2)} KB</small>
              </div>
            </div>
          ) : (
            <div className="drop-content">
              <span className="drop-icon">📁</span>
              <p>Arraste um arquivo .xlsx aqui</p>
              <small>ou clique para selecionar</small>
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

      {/* Erro */}
      {error && <div className="banner error">{error}</div>}

      {/* Sucesso */}
      {success && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(74, 222, 128, 0.12)', border: '1px solid rgba(74, 222, 128, 0.35)', color: '#86efac', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {/* Resultado da Validação */}
      {validationResult && (
        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--accent)' }}>✓ Validação OK</h3>
          <p style={{ margin: '0.5rem 0', color: 'var(--text)', fontSize: '0.9rem' }}>
            <strong>Registros encontrados:</strong> {validationResult.registros?.length || 0}
          </p>
          {validationResult.tiposEncontrados && (
            <p style={{ margin: '0.5rem 0', color: 'var(--text)', fontSize: '0.9rem' }}>
              <strong>Tipos:</strong> {validationResult.tiposEncontrados.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="button-group">
        <button
          type="button"
          className="btn"
          onClick={() => document.getElementById('file-input').click()}
        >
          {file ? '🔄 Trocar arquivo' : '📂 Selecionar arquivo'}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={validateFile}
          disabled={!file || loading}
        >
          {loading ? '⏳ Validando...' : '✓ Validar'}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={importFile}
          disabled={!validationResult || loading}
          style={{ opacity: (!validationResult || loading) ? '0.5' : '1' }}
        >
          {loading ? '⏳ Importando...' : '✓ Importar'}
        </button>
      </div>

      <style>{`
        .import-upload {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .drop-zone-wrapper {
          width: 100%;
        }

        .drop-zone {
          border: 2px dashed rgba(0, 217, 255, 0.4);
          border-radius: var(--radius);
          padding: 3.5rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, rgba(20, 27, 46, 0.5) 0%, rgba(14, 19, 40, 0.8) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 220px;
          position: relative;
          overflow: hidden;
        }

        .drop-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0, 217, 255, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .drop-zone:hover {
          border-color: var(--accent);
          background: linear-gradient(135deg, rgba(20, 27, 46, 0.7) 0%, rgba(0, 217, 255, 0.1) 100%);
        }

        .drop-zone.dragging {
          border-color: var(--accent);
          background: linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.08) 100%);
          transform: scale(1.02);
        }

        .drop-zone.has-file {
          border-color: var(--success);
          background: linear-gradient(135deg, rgba(81, 207, 102, 0.1) 0%, rgba(20, 27, 46, 0.8) 100%);
        }

        .drop-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
          animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .file-icon {
          font-size: 2.2rem;
          display: block;
          margin-bottom: 0.75rem;
        }

        .file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          position: relative;
          z-index: 1;
        }

        .file-info div {
          text-align: center;
        }

        .file-info strong {
          display: block;
          color: var(--text);
          font-size: 1.1rem;
          margin-bottom: 0.2rem;
        }

        .file-info small {
          display: block;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .drop-content {
          position: relative;
          z-index: 1;
        }

        .drop-content p {
          margin: 0.5rem 0 0.25rem;
          font-weight: 600;
          color: var(--text);
          font-size: 1.05rem;
        }

        .drop-content small {
          color: var(--muted);
          font-size: 0.85rem;
        }

        .button-group {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
        }

        .button-group .btn {
          flex: 1;
          min-width: 140px;
        }

        @media (max-width: 600px) {
          .drop-zone {
            padding: 2.5rem 1.5rem;
            min-height: 180px;
          }

          .button-group {
            flex-direction: column;
          }

          .button-group .btn {
            flex: 1;
            min-width: unset;
          }

          .drop-icon {
            font-size: 2.2rem;
          }
        }
      `}</style>
    </div>
  )
}
