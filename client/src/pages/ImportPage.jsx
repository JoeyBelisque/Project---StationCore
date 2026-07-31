import { useState } from 'react'
import { 
  Lightbulb, 
  Table as TableIcon, 
  Info,
  Zap,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  Download,
  Loader2
} from 'lucide-react'
import { ImportUploadItem } from '../components/ImportUploadItem'
import { baixarTemplate } from '../services/importacaoApi'
import { useToast } from '../components/Toast'

const LAYOUT_HEADSETS = [
  { col: 'LACRE', obrigatorio: true, desc: 'Identificador único do equipamento' },
  { col: 'MATRICULA', obrigatorio: false, desc: 'Matrícula do operador (se em uso)' },
  { col: 'NOME_OPERADOR', obrigatorio: false, desc: 'Nome do operador responsável' },
  { col: 'MARCA', obrigatorio: false, desc: 'intelbras ou plantronics' },
  { col: 'NUMERO_SERIE', obrigatorio: false, desc: 'Número de série do fabricante' },
  { col: 'STATUS', obrigatorio: false, desc: 'em_uso, estoque, defeito, manutencao, extravio...' },
  { col: 'OBSERVACOES', obrigatorio: false, desc: 'Notas adicionais' },
]

const LAYOUT_COMPUTADORES = [
  { col: 'PA', obrigatorio: false, desc: 'Posto de atendimento' },
  { col: 'HOSTNAME', obrigatorio: true, desc: 'Nome da máquina na rede' },
  { col: 'SERIAL_NUMBER', obrigatorio: false, desc: 'Número de série / service tag' },
  { col: 'STATUS', obrigatorio: false, desc: 'em_uso, estoque, manutencao...' },
  { col: 'OBSERVACOES', obrigatorio: false, desc: 'Notas adicionais' },
]

function DownloadButton({ tipo, label, onDownload, loading }) {
  return (
    <button
      className="btn btn-secondary btn-small"
      onClick={() => onDownload(tipo)}
      disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {loading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
      {label}
    </button>
  )
}

/**
 * Página de Importação de Dados
 * Permite a carga massiva de headsets e computadores via arquivos Excel.
 */
export function ImportPage() {
  const { addToast } = useToast()
  const [downloading, setDownloading] = useState(null)

  async function handleDownload(tipo) {
    setDownloading(tipo)
    try {
      await baixarTemplate(tipo)
      addToast('Template baixado com sucesso!')
    } catch (err) {
      addToast(err.message || 'Erro ao baixar template', 'error')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="page-fade-in" style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h2 className="page-title" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text)' }}>Sincronização de Inventário</h2>
        <p className="page-subtitle" style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Gerenciamento inteligente de ativos corporativos</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        <section>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Zap size={20} className="text-accent" /> Importação de Lote
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
                <div className="card" style={{ padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Headsets</h4>
                    <ImportUploadItem tipo="headsets" />
                </div>
                <div className="card" style={{ padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Computadores</h4>
                    <ImportUploadItem tipo="computadores" />
                </div>
            </div>
        </section>

        <section className="card" style={{ padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div className="row space-between" style={{ marginBottom: '2rem' }}>
                <h3 className="section-title" style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><TableIcon size={20} className="text-accent" /> Documentação Técnica</h3>
                <DownloadButton tipo="completo" label="Baixar Template Completo" onDownload={handleDownload} loading={downloading === 'completo'} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Regras de Integridade</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {[
                            { title: 'Unicidade', desc: 'LACRE e HOSTNAME são chaves primárias. Duplicatas atualizam o registro.' },
                            { title: 'Vínculo Automático', desc: 'Planilha com MATRICULA/OPERADOR sem status definida como em_uso.' },
                            { title: 'Status', desc: 'Aceitos: em_uso, estoque, defeito, manutencao, extravio, furtado, reserva, desligado.' },
                            { title: 'Auditoria', desc: 'Cada importação gera log rastreável de usuário.' }
                        ].map(item => (
                            <div key={item.title} style={{ paddingLeft: '1rem', borderLeft: '3px solid var(--accent)' }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</strong>
                                <p className="small" style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', lineHeight: '1.4' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mapeamento de Colunas</h4>
                    <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                         <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ativo</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Colunas Chave</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}><strong>Headsets</strong></td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{LAYOUT_HEADSETS.map(l => l.col).join(', ')}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.75rem' }}><strong>Computadores</strong></td>
                                    <td style={{ padding: '0.75rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{LAYOUT_COMPUTADORES.map(l => l.col).join(', ')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
      </div>

      <style>{`
        .rules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
        .rule-box { border: 1px solid var(--border); padding: 0.75rem; border-radius: var(--radius-md); }
        .rule-tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--accent-light); margin-bottom: 0.25rem; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
