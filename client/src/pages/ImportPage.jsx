import { 
  FileUp, 
  HelpCircle, 
  Lightbulb, 
  Table as TableIcon, 
  Info,
  CheckCircle2,
  Download,
  AlertCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  ClipboardList
} from 'lucide-react'
import { ImportUploadItem } from '../components/ImportUploadItem'

/**
 * Página de Importação de Dados
 * Permite a carga massiva de headsets e computadores via arquivos Excel.
 */
export function ImportPage() {
  return (
    <div className="page-fade-in">
      <header className="page-header-premium" style={{ marginBottom: '2.5rem' }}>
        <div className="row gap" style={{ marginBottom: '0.75rem' }}>
          <span className="badge badge-info">Módulo de Administração</span>
        </div>
        <h2 className="page-title">Sincronização de Inventário</h2>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>Importe ativos de forma massiva com validação automática de integridade e histórico.</p>
      </header>

      <div className="page-content-inner">
        {/* Guia Visual do Processo */}
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div className="row gap" style={{ marginBottom: '1.5rem' }}>
            <Zap size={20} className="text-accent" />
            <h4 style={{ margin: 0 }}>Fluxo de Trabalho Inteligente</h4>
          </div>
          <div className="import-workflow-steps">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <strong>Preparação</strong>
                <p>Organize sua planilha seguindo as colunas do template oficial.</p>
              </div>
              <ArrowRight className="step-arrow" size={20} />
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <strong>Análise</strong>
                <p>O sistema valida lacres duplicados e vínculos de operadores ativos.</p>
              </div>
              <ArrowRight className="step-arrow" size={20} />
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <strong>Efetivação</strong>
                <p>Após a confirmação, o banco é atualizado e o histórico é gerado.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Áreas de Importação */}
        <div className="inner-grid inner-grid-2" style={{ marginBottom: '3rem' }}>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div className="row gap">
                <div className="stat-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)' }}>
                  <ClipboardList size={22} />
                </div>
                <h4 className="card-title" style={{ margin: 0 }}>Lote de Headsets</h4>
              </div>
              <span className="badge badge-info">Excel .xlsx</span>
            </div>
            <p className="small muted" style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Utilize este módulo para cadastrar novos equipamentos ou realizar atualizações de status e vínculos de forma massiva.
            </p>
            <ImportUploadItem tipo="headsets" />
          </div>
          
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div className="row gap">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                  <ShieldCheck size={22} />
                </div>
                <h4 className="card-title" style={{ margin: 0 }}>Lote de Computadores</h4>
              </div>
              <span className="badge badge-info">Excel .xlsx</span>
            </div>
            <p className="small muted" style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Gerencie o parque de máquinas vinculando hostnames, números de série e postos de atendimento (PA).
            </p>
            <ImportUploadItem tipo="computadores" />
          </div>
        </div>

        {/* Templates e Regras Técnicas - REDESENHADO */}
        <div className="row gap-lg wrap" style={{ gap: '2rem' }}>
          <div className="flex-1" style={{ minWidth: '400px' }}>
            <h3 className="section-title"><Lightbulb size={20} className="text-warning" /> Regras de Integridade</h3>
            <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
              <div className="rules-grid">
                <div className="rule-box">
                  <div className="rule-tag">Unicidade</div>
                  <p className="small">O campo <strong>LACRE</strong> (Headsets) e <strong>SERIAL</strong> (PCs) são chaves primárias. Duplicatas atualizarão o registro existente.</p>
                </div>
                <div className="rule-box">
                  <div className="rule-tag">Segurança</div>
                  <p className="small">O sistema impede que um operador seja vinculado a dois ativos do mesmo tipo simultaneamente.</p>
                </div>
                <div className="rule-box">
                  <div className="rule-tag">Status</div>
                  <p className="small">Use termos padronizados: <code>estoque</code>, <code>em_uso</code>, <code>defeito</code>, <code>manutencao</code>.</p>
                </div>
                <div className="rule-box">
                  <div className="rule-tag">Histórico</div>
                  <p className="small">Toda importação gera automaticamente um log de auditoria vinculado ao seu usuário.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1" style={{ minWidth: '400px' }}>
            <h3 className="section-title"><TableIcon size={20} className="text-accent" /> Layout Obrigatório</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-preview-header">
                <span className="small">Visualização das Colunas Necessárias</span>
              </div>
              <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <table style={{ minWidth: 'auto', fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>Ativo</th>
                      <th>Coluna A</th>
                      <th>Coluna B</th>
                      <th>Coluna C</th>
                      <th>Coluna D</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Headsets</strong></td>
                      <td className="mono">LACRE</td>
                      <td className="mono">MATRICULA</td>
                      <td className="mono">MARCA</td>
                      <td className="mono">STATUS</td>
                    </tr>
                    <tr>
                      <td><strong>Computadores</strong></td>
                      <td className="mono">PA</td>
                      <td className="mono">HOSTNAME</td>
                      <td className="mono">SERIAL_NUMBER</td>
                      <td className="mono">STATUS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="row gap" style={{ padding: '1rem', background: 'var(--accent-glow)' }}>
                <Info size={16} className="text-accent" />
                <p className="small" style={{ margin: 0 }}>Dica: Baixe um <strong style={{ cursor: 'pointer', textDecoration: 'underline' }}>template de exemplo</strong> para evitar erros de formatação.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .import-workflow-steps {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          justify-content: space-between;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: var(--accent);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
          box-shadow: 0 0 15px var(--accent-glow);
        }

        .step-content strong {
          display: block;
          font-size: 0.875rem;
          color: var(--text);
        }

        .step-content p {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.3;
        }

        .step-arrow {
          color: var(--border);
        }

        @media (max-width: 768px) {
          .import-workflow-steps {
            flex-direction: column;
            align-items: flex-start;
          }
          .step-arrow {
            display: none;
          }
        }

        .rules-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          padding: 1.5rem;
        }
        .rule-box {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .rule-tag {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--accent-light);
          letter-spacing: 0.05em;
        }
        .table-preview-header {
          background: var(--border-light);
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
        }
        .gap-lg { gap: 2rem; }
      `}</style>
    </div>
  )
}
