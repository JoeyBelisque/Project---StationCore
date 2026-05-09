import { ImportUploadItem } from '../components/ImportUploadItem'

export function ImportPage() {
  return (
    <div className="page">
      <div className="page-head">
        <h2>📥 Importar Dados</h2>
        <p className="muted">Importação simples: validar arquivo e depois importar.</p>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <ImportUploadItem tipo="headsets" />
          <ImportUploadItem tipo="computadores" />
        </div>

        <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--accent)', fontSize: '1rem' }}>
            📋 Passo a passo rápido
          </h3>
          <ol style={{ margin: '0', paddingLeft: '1.5rem', color: 'var(--muted)', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '0.5rem' }}>Use o template abaixo (mesmos nomes de colunas)</li>
            <li style={{ marginBottom: '0.5rem' }}>Escolha Headsets ou Computadores e selecione o arquivo `.xlsx`</li>
            <li style={{ marginBottom: '0.5rem' }}>Clique em <strong style={{ color: 'var(--text)' }}>Validar</strong></li>
            <li style={{ marginBottom: '0.5rem' }}>Se estiver sem erro, clique em <strong style={{ color: 'var(--text)' }}>Importar</strong></li>
            <li>Lacre existente é atualizado (não duplica)</li>
          </ol>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent)', fontSize: '0.95rem' }}>💡 Regras importantes</h3>
          <ul style={{ margin: '0', paddingLeft: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Tamanho máximo do arquivo: <strong style={{ color: 'var(--text)' }}>5 MB</strong></li>
            <li>Formato suportado: <strong style={{ color: 'var(--text)' }}>Excel (.xlsx)</strong> apenas</li>
            <li>Marca de headset: <strong style={{ color: 'var(--text)' }}>intelbras</strong> ou <strong style={{ color: 'var(--text)' }}>plantronics</strong></li>
            <li>Lacre é chave única: se já existir, o sistema atualiza o headset em vez de duplicar</li>
            <li>Número de série (quando informado) não pode conflitar com outro lacre</li>
            <li>Use <strong style={{ color: 'var(--text)' }}>defeito</strong> para itens com problema e <strong style={{ color: 'var(--text)' }}>retorno_manutencao</strong> para voltar ao estoque</li>
            <li>Se já houver operador no lacre e a planilha tentar trocar sem baixa, o sistema bloqueia e alerta</li>
          </ul>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent)', fontSize: '0.95rem' }}>
            📝 Template Headsets (funcional)
          </h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '5px', display: 'block', marginBottom: '1rem', overflow: 'auto' }}>
              MATRÍCULA (opcional) | LACRE | MARCA (Intelbras/Plantronics) | Nº SÉRIE (opcional) | STATUS | CATEGORIA | OBSERVAÇÕES
            </code>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>
              Valores de <strong>STATUS</strong>: em_uso, estoque, defeito, emprestimo, entrega,
              manutencao, reserva, desligado, retorno_manutencao
            </p>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>
              Valores de <strong>CATEGORIA</strong>: estoque, emprestimo, entrega, manutencao, operacao
            </p>
            <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.15)', color: 'var(--text)' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>MATRÍCULA</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>LACRE</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>MARCA</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nº SÉRIE</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>STATUS</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>CATEGORIA</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>OBSERVAÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.5rem' }}>123456</td>
                    <td style={{ padding: '0.5rem' }}>LC-0001</td>
                    <td style={{ padding: '0.5rem' }}>intelbras</td>
                    <td style={{ padding: '0.5rem' }}>SN-8899</td>
                    <td style={{ padding: '0.5rem' }}>em_uso</td>
                    <td style={{ padding: '0.5rem' }}>operacao</td>
                    <td style={{ padding: '0.5rem' }}>Operador ativo</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem' }}> </td>
                    <td style={{ padding: '0.5rem' }}>LC-0040</td>
                    <td style={{ padding: '0.5rem' }}>plantronics</td>
                    <td style={{ padding: '0.5rem' }}> </td>
                    <td style={{ padding: '0.5rem' }}>estoque</td>
                    <td style={{ padding: '0.5rem' }}>estoque</td>
                    <td style={{ padding: '0.5rem' }}>Disponível para reposição</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem' }}> </td>
                    <td style={{ padding: '0.5rem' }}>LC-0099</td>
                    <td style={{ padding: '0.5rem' }}>plantronics</td>
                    <td style={{ padding: '0.5rem' }}>SN-0099</td>
                    <td style={{ padding: '0.5rem' }}>defeito</td>
                    <td style={{ padding: '0.5rem' }}>manutencao</td>
                    <td style={{ padding: '0.5rem' }}>Microfone falhando</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem' }}> </td>
                    <td style={{ padding: '0.5rem' }}>LC-0099</td>
                    <td style={{ padding: '0.5rem' }}>plantronics</td>
                    <td style={{ padding: '0.5rem' }}>SN-0099</td>
                    <td style={{ padding: '0.5rem' }}>retorno_manutencao</td>
                    <td style={{ padding: '0.5rem' }}>estoque</td>
                    <td style={{ padding: '0.5rem' }}>Retorno da assistência</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: 'var(--text)' }}>Template Computadores:</p>
            <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '5px', display: 'block', overflow: 'auto' }}>
              PA | HOSTNAME | Nº SÉRIE | STATUS
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
