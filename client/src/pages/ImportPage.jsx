import React, { useState } from 'react'
import { ImportUploadItem } from '../components/ImportUploadItem'
import { baixarTemplate } from '../services/importacaoApi'
import { useToast } from '../components/ToastContext'
import { Table as TableIcon, Download, Loader2, PanelsTopLeft, Zap, ArrowRight, Headphones, ShieldCheck } from 'lucide-react'

// ---------- Dados e Configuração ----------
const LAYOUT_HEADSETS = [
  { col: 'LACRE', obrigatorio: true, desc: 'Identificador único do equipamento' },
  { col: 'MATRICULA', obrigatorio: false, desc: 'Matrícula do operador (se em uso)' },
  { col: 'NOME_OPERADOR', obrigatorio: false, desc: 'Nome do operador responsável' },
  { col: 'MARCA', obrigatorio: false, desc: 'intelbras ou plantronics' },
  { col: 'NUMERO_SERIE', obrigatorio: false, desc: 'Número de série do fabricante' },
  { col: 'STATUS', obrigatorio: false, desc: 'em_uso, estoque, defeito, manutencao, extravio...' },
  { col: 'OBSERVACOES', obrigatorio: false, desc: 'Notas adicionais' },
];

const LAYOUT_COMPUTADORES = [
  { col: 'PA', obrigatorio: false, desc: 'Posto de atendimento' },
  { col: 'HOSTNAME', obrigatorio: true, desc: 'Nome da máquina na rede' },
  { col: 'SERIAL_NUMBER', obrigatorio: false, desc: 'Número de série / service tag' },
  { col: 'STATUS', obrigatorio: false, desc: 'em_uso, estoque, manutencao...' },
  { col: 'OBSERVACOES', obrigatorio: false, desc: 'Notas adicionais' },
];

const STEPS = [
  { num: 1, title: "Preparação", desc: "Organize sua planilha seguindo as colunas do template oficial." },
  { num: 2, title: "Análise", desc: "O sistema valida lacres duplicados e vínculos de operadores ativos." },
  { num: 3, title: "Efetivação", desc: "Após a confirmação, o banco é atualizado e o histórico é gerado." },
];

function DownloadButton({ tipo, label, onDownload, loading }) {
  return (
    <button
      className="btn-link"
      onClick={() => onDownload(tipo)}
      disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)' }}
    >
      {loading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
      {label}
    </button>
  )
}

function LotCard({ icon, title, tag, description, children }) {
  return (
    <div className="card lot-card">
      <div className="lot-head">
        <div className="lot-title-group">
          <div className="lot-icon">{icon}</div>
          <div className="lot-title">{title}</div>
        </div>
        <span className="lot-tag">{tag}</span>
      </div>
      <p className="lot-desc">{description}</p>
      {children}
    </div>
  );
}

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
    <div className="page-fade-in import-page">
      <span className="module-badge">
        <PanelsTopLeft size={14} />
        MÓDULO DE ADMINISTRAÇÃO
      </span>

      <header className="page-header-premium import-header">
        <h2 className="page-title">Sincronização de Inventário</h2>
        <p className="page-subtitle">Importe ativos de forma massiva com validação automática de integridade e histórico.</p>
      </header>

      <div className="card workflow-card">
        <div className="workflow-head">
          <Zap size={18} />
          Fluxo de Trabalho Inteligente
        </div>

        <div className="steps-row">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className="step">
                <div className="step-num">{step.num}</div>
                <div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-desc">{step.desc}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="step-arrow">
                  <ArrowRight size={16} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid">
        <LotCard
          icon={<Headphones size={19} />}
          title="Lote de Headsets"
          tag="EXCEL .XLSX"
          description="Utilize este módulo para cadastrar novos equipamentos ou realizar atualizações de status e vínculos de forma massiva."
        >
            <ImportUploadItem tipo="headsets" />
        </LotCard>
        <LotCard
          icon={<ShieldCheck size={19} />}
          title="Lote de Computadores"
          tag="EXCEL .XLSX"
          description="Gerencie o parque de máquinas vinculando hostnames, números de série e postos de atendimento (PA)."
        >
            <ImportUploadItem tipo="computadores" />
        </LotCard>
      </div>

        <section className="card documentation-card">
          <div className="documentation-header">
            <h3 className="section-title"><TableIcon size={20} className="text-accent" /> Documentação Técnica</h3>
                <DownloadButton tipo="completo" label="Baixar Template Completo" onDownload={handleDownload} loading={downloading === 'completo'} />
            </div>
            
          <div className="documentation-grid">
                <div>
              <h4 className="documentation-label">Regras de Integridade</h4>
              <div className="integrity-list">
                        {[
                            { title: 'Unicidade', desc: 'LACRE e HOSTNAME são chaves primárias. Duplicatas atualizam o registro.' },
                            { title: 'Vínculo Automático', desc: 'Planilha com MATRICULA/OPERADOR sem status definida como em_uso.' },
                            { title: 'Status', desc: 'Aceitos: em_uso, estoque, defeito, manutencao, extravio, furtado, reserva, desligado.' },
                            { title: 'Auditoria', desc: 'Cada importação gera log rastreável de usuário.' }
                        ].map(item => (
                            <div key={item.title} className="integrity-item">
                              <strong>{item.title}</strong>
                              <p className="small">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="documentation-label">Mapeamento de Colunas</h4>
                    <div className="table-container documentation-table">
                       <table>
                        <thead>
                          <tr>
                            <th>Ativo</th>
                            <th>Colunas Chave</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Headsets</strong></td>
                                    <td className="column-list">{LAYOUT_HEADSETS.map(l => l.col).join(', ')}</td>
                                </tr>
                                <tr>
                                    <td><strong>Computadores</strong></td>
                                    <td className="column-list">{LAYOUT_COMPUTADORES.map(l => l.col).join(', ')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
      </section>

      <style>{`
        .import-page { width: 100%; margin: -0.25rem 0 0; }
        .module-badge { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--accent-light); background: var(--accent-glow); border: 1px solid var(--accent); padding: 0.3rem 0.65rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; }
        .import-header { margin-bottom: 1.25rem; }
        .import-header .page-subtitle { max-width: 620px; margin-bottom: 0; }
        .workflow-card { margin-bottom: 1.25rem; }
        .workflow-head { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; margin-bottom: 1.25rem; color: var(--accent-light); }
        .steps-row { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: flex-start; }
        .step { display: flex; gap: 0.75rem; min-width: 0; }
        .step-num { width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 700; flex-shrink: 0; color: #fff; background: var(--accent); }
        .step-title { font-size: 0.875rem; font-weight: 600; color: var(--text); margin-bottom: 0.25rem; }
        .step-desc { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }
        .step-arrow { display: flex; align-items: center; justify-content: center; padding: 0 1rem; margin-top: 0.5rem; color: var(--text-muted); flex-shrink: 0; }
        .import-page > .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        .lot-card { min-width: 0; padding: 1.25rem; }
        .lot-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
        .lot-title-group { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
        .lot-icon { width: 2.5rem; height: 2.5rem; border-radius: var(--radius-md); background: var(--accent-glow); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--accent-light); flex-shrink: 0; }
        .lot-title { font-size: 1rem; font-weight: 600; }
        .lot-tag { color: var(--accent-light); background: var(--accent-glow); border: 1px solid var(--border); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.65rem; font-weight: 700; white-space: nowrap; }
        .lot-desc { font-size: 0.8125rem; color: var(--text-muted); line-height: 1.6; margin: 0 0 1rem; }
        .documentation-card { margin-top: 1.25rem; }
        .documentation-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
        .documentation-header .section-title { margin-bottom: 0; }
        .documentation-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
        .documentation-label { color: var(--text-muted); font-size: 0.75rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .integrity-list { display: flex; flex-direction: column; gap: 1rem; }
        .integrity-item { padding-left: 0.75rem; border-left: 3px solid var(--accent); }
        .integrity-item strong { font-size: 0.875rem; color: var(--text); }
        .integrity-item p { font-size: 0.8rem; margin: 0.25rem 0 0; color: var(--text-muted); line-height: 1.4; }
        .documentation-table { border-radius: var(--radius-md); }
        .documentation-table table { min-width: 520px; font-size: 0.8rem; }
        .documentation-table th { background: var(--surface-hover); }
        .documentation-table th, .documentation-table td { padding: 0.75rem; }
        .column-list { color: var(--accent-light); font-family: var(--font-mono, monospace); word-break: break-word; }
        .btn-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--accent-light); font-size: 0.875rem; font-weight: 600; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 980px) { .steps-row, .documentation-grid { grid-template-columns: 1fr; gap: 1rem; } .step-arrow { display: none; } }
        @media (max-width: 720px) { .import-page > .grid { grid-template-columns: 1fr; } .documentation-header { align-items: flex-start; flex-direction: column; } .documentation-table { overflow-x: auto; } }
      `}</style>
    </div>
  )
}
