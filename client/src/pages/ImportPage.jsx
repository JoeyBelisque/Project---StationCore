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
        <div className="inner-grid inner-grid-2" style={{ marginBottom: '2rem' }}>
          <div className="card h-full">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 className="card-title" style={{ margin: 0 }}>
                <ClipboardList size={20} /> 
                Lote de Headsets
              </h4>
              <span className="badge badge-info">Excel (.xlsx)</span>
            </div>
            <p className="small muted" style={{ marginBottom: '1.5rem' }}>Ideal para cadastrar novos lacres ou atualizar status de equipamentos em massa.</p>
            <ImportUploadItem tipo="headsets" />
          </div>
          
          <div className="card h-full">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 className="card-title" style={{ margin: 0 }}>
                <ShieldCheck size={20} /> 
                Lote de Computadores
              </h4>
              <span className="badge badge-info">Excel (.xlsx)</span>
            </div>
            <p className="small muted" style={{ marginBottom: '1.5rem' }}>Gerenciamento de estações de trabalho vinculadas por Hostname e Serial.</p>
            <ImportUploadItem tipo="computadores" />
          </div>
        </div>

        {/* Templates e Regras Técnicas */}
        <div className="dashboard-grid">
          <div className="card">
            <h4 className="card-title" style={{ color: 'var(--warning)' }}>
              <Lightbulb size={20} /> 
              Regras de Negócio
            </h4>
            <ul className="premium-list small">
              <li><strong>Headsets:</strong> O Lacre é o identificador único. Se já existir, os dados serão atualizados.</li>
              <li><strong>Operadores:</strong> Não é possível vincular um headset a um operador que já possui outro equipamento ativo.</li>
              <li><strong>Status:</strong> Use letras minúsculas (ex: <code>estoque</code>, <code>em_uso</code>, <code>defeito</code>).</li>
              <li><strong>Categorias:</strong> São atribuídas automaticamente pelo sistema com base no status informado.</li>
            </ul>
          </div>

          <div className="card">
            <h4 className="card-title">
              <TableIcon size={20} /> 
              Layout da Planilha (Headsets)
            </h4>
            <div className="table-container" style={{ margin: '0.5rem 0 1rem', background: 'rgba(0,0,0,0.2)', border: 'none' }}>
              <table style={{ minWidth: 'auto', fontSize: '0.75rem' }}>
                <thead>
                  <tr>
                    <th>LACRE</th>
                    <th>MATRÍCULA</th>
                    <th>MARCA</th>
                    <th>SÉRIE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono text-accent">LC-001</td>
                    <td className="muted">12345</td>
                    <td>intelbras</td>
                    <td className="mono">SN-X</td>
                    <td>em_uso</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="row gap" style={{ padding: '0.75rem', background: 'var(--accent-glow)', borderRadius: 'var(--radius-md)' }}>
              <Info size={16} className="text-accent" />
              <p className="small" style={{ margin: 0 }}>Para <strong>PCs</strong>, use as colunas: <code>PA</code>, <code>HOSTNAME</code>, <code>SERIAL_NUMBER</code> e <code>STATUS</code>.</p>
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

        .h-full { height: 100%; }
      `}</style>
    </div>
  )
}
