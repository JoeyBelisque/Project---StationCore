import { useState } from 'react'
import { importarHeadsets, importarComputadores } from '../services/importacaoApi'

export function ImportUploadItem({ tipo = 'headsets' }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const tipoLabel = tipo === 'headsets' ? '🎧 Headsets' : '💻 Computadores'
  const tipoNome = tipo === 'headsets' ? 'headsets' : 'computadores'

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
      const importFunc = tipo === 'headsets' ? importarHeadsets : importarComputadores
      const result = await importFunc(file, 'validar')

      setValidationResult(result)
      const total = tipo === 'headsets' ? result.summary?.total_headsets : result.summary?.total_computadores
      setSuccess(`✅ Validação OK: ${total || 0} registros encontrados`)
    } catch (err) {
      console.error('Erro na validação:', err)
      const errorMsg = err.details?.error || err.message || 'Erro desconhecido'
      setError(`❌ ${errorMsg}`)
      if (err.details?.errors) {
        console.error('Erros de validação:', err.details.errors)
      }
    } finally {
      setLoading(false)
    }
  }

  async function importFile() {
    if (!validationResult) {
      setError('⚠️ Valide o arquivo primeiro')
      return
    }

    const total = tipo === 'headsets' ? validationResult.summary?.total_headsets : validationResult.summary?.total_computadores

    if (!window.confirm(`Tem certeza que quer importar ${total || 0} registros de ${tipoNome}?`)) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const importFunc = tipo === 'headsets' ? importarHeadsets : importarComputadores
      const result = await importFunc(file, 'importar')

      setSuccess(`✅ ${result.message || 'Importação concluída!'} ${total || 0} registros inseridos.`)
      setFile(null)
      setValidationResult(null)

      // Reset após 3 segundos
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      console.error('Erro na importação:', err)
      const errorMsg = err.details?.message || err.details?.error || err.message || 'Erro desconhecido'
      setError(`❌ ${errorMsg}`)
      if (err.details?.errors) {
        console.error('Erros de importação:', err.details.errors)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputId = `file-input-${tipo}`

  return (
    <div className="import-upload-item">
      <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '1.1rem' }}>{tipoLabel}</h3>

      <div className="drop-zone-wrapper">
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById(inputId).click()}
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
            id={inputId}
          />
        </div>
      </div>

      {/* Erro */}
      {error && <div className="banner error">{error}</div>}

      {/* Sucesso */}
      {success && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(74, 222, 128, 0.12)', border: '1px solid rgba(74, 222, 128, 0.35)', color: '#86efac', marginBottom: '1rem', marginTop: '1rem' }}>
          {success}
        </div>
      )}

      {/* Resultado da Validação */}
      {validationResult && (
        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--accent)' }}>✓ Validação OK</h4>
          <p style={{ margin: '0.5rem 0', color: 'var(--text)', fontSize: '0.9rem' }}>
            <strong>Registros encontrados:</strong>{' '}
            {tipo === 'headsets' ? validationResult.summary?.total_headsets : validationResult.summary?.total_computadores}
          </p>
          {validationResult.summary?.erros > 0 && (
            <p style={{ margin: '0.5rem 0', color: '#fca5a5', fontSize: '0.9rem' }}>
              <strong>Erros encontrados:</strong> {validationResult.summary.erros}
            </p>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="button-group" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn"
          onClick={() => document.getElementById(inputId).click()}
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
        .import-upload-item {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }

        .import-upload-item .drop-zone {
          border: 2px dashed rgba(0, 217, 255, 0.4);
          border-radius: var(--radius);
          padding: 2.5rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, rgba(20, 27, 46, 0.5) 0%, rgba(14, 19, 40, 0.8) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 160px;
          position: relative;
          overflow: hidden;
        }

        .import-upload-item .drop-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0, 217, 255, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .import-upload-item .drop-zone:hover {
          border-color: var(--accent);
          background: linear-gradient(135deg, rgba(20, 27, 46, 0.7) 0%, rgba(0, 217, 255, 0.1) 100%);
        }

        .import-upload-item .drop-zone.dragging {
          border-color: var(--accent);
          background: linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.08) 100%);
          transform: scale(1.02);
        }

        .import-upload-item .drop-zone.has-file {
          border-color: var(--success);
          background: linear-gradient(135deg, rgba(81, 207, 102, 0.1) 0%, rgba(20, 27, 46, 0.8) 100%);
        }

        .import-upload-item .drop-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 1rem;
          animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .import-upload-item .file-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: var(--text);
        }

        .import-upload-item .file-icon {
          font-size: 2rem;
        }

        .import-upload-item .file-info strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        .import-upload-item .file-info small {
          color: var(--muted);
          font-size: 0.85rem;
        }

        .import-upload-item .drop-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .import-upload-item .drop-content p {
          margin: 0.5rem 0;
          color: var(--text);
        }

        .import-upload-item .drop-content small {
          color: var(--muted);
          font-size: 0.9rem;
        }

        .import-upload-item .banner {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .import-upload-item .banner.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
        }

        .import-upload-item .button-group {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .import-upload-item .button-group {
            flex-direction: column;
          }

          .import-upload-item .button-group .btn {
            width: 100%;
          }

          .import-upload-item .drop-zone {
            padding: 2rem 1.5rem;
            min-height: 140px;
          }

          .import-upload-item .drop-icon {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  )
}
