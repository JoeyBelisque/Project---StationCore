import { ImportUploadItem } from '../components/ImportUploadItem'

export function ImportPage() {
  return (
    <div className="page">
      <div className="page-head">
        <h2>📥 Importar Dados</h2>
        <p className="muted">Faça upload de arquivos .xlsx para importar dados de headsets e computadores em lote</p>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <ImportUploadItem tipo="headsets" />
          <ImportUploadItem tipo="computadores" />
        </div>

        <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--accent)', fontSize: '1rem' }}>📋 Como usar:</h3>
          <ol style={{ margin: '0', paddingLeft: '1.5rem', color: 'var(--muted)', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '0.5rem' }}>Prepare um arquivo Excel (.xlsx) com os dados</li>
            <li style={{ marginBottom: '0.5rem' }}>Selecione se vai importar <strong>Headsets</strong> ou <strong>Computadores</strong></li>
            <li style={{ marginBottom: '0.5rem' }}>Clique no campo acima ou arraste o arquivo</li>
            <li style={{ marginBottom: '0.5rem' }}>Clique em <strong style={{ color: 'var(--text)' }}>Validar</strong> para verificar se os dados estão corretos</li>
            <li style={{ marginBottom: '0.5rem' }}>Se tudo estiver OK, clique em <strong style={{ color: 'var(--text)' }}>Importar</strong> para inserir no banco</li>
            <li>Após importar, os dados apareçam nas páginas de Headsets ou Computadores</li>
          </ol>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent)', fontSize: '0.95rem' }}>💡 Dicas:</h3>
          <ul style={{ margin: '0', paddingLeft: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Tamanho máximo do arquivo: <strong style={{ color: 'var(--text)' }}>5 MB</strong></li>
            <li>Formato suportado: <strong style={{ color: 'var(--text)' }}>Excel (.xlsx)</strong> apenas</li>
            <li>Cada planilha deve ter uma aba: <strong style={{ color: 'var(--text)' }}>'headsets'</strong> ou <strong style={{ color: 'var(--text)' }}>'computadores'</strong></li>
            <li>Validação ocorre antes da importação para evitar erros</li>
            <li>A importação não pode ser desfeita, então valide bem antes de importar!</li>
            <li>Você pode importar headsets e computadores em arquivos separados ou no mesmo arquivo</li>
          </ul>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent)', fontSize: '0.95rem' }}>📝 Formato das planilhas:</h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            <p style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: 'var(--text)' }}>Headsets:</p>
            <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '5px', display: 'block', marginBottom: '1rem', overflow: 'auto' }}>
              MATRÍCULA | LACRE | MARCA | Nº SÉRIE | STATUS | OBSERVAÇÕES
            </code>
            <p style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: 'var(--text)' }}>Computadores:</p>
            <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '5px', display: 'block', overflow: 'auto' }}>
              PA | HOSTNAME | Nº SÉRIE | STATUS
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
