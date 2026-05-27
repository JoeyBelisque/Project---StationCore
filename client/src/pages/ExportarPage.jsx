import { useState } from 'react'
import * as XLSX from 'xlsx'
import { 
  FileDown, 
  Table as TableIcon, 
  Database, 
  Headphones, 
  Monitor, 
  Info,
  Loader2,
  Calendar,
  Settings2,
  BarChart3,
  TrendingUp,
  DollarSign,
  Wrench
} from 'lucide-react'
import { listarHeadsets } from '../services/headsetsApi'
import { listarComputadores } from '../services/computadoresApi'

const STATUS_HEADSET = [
  { value: '', label: 'Todos os status' },
  { value: 'em_uso', label: 'Em uso' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'defeito', label: 'Com defeito' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reserva', label: 'Reservados' },
]

const STATUS_PC = [
  { value: '', label: 'Todos os status' },
  { value: 'em_uso', label: 'Em uso' },
  { value: 'manutencao', label: 'Em manutenção' },
  { value: 'inutilizavel', label: 'Inutilizáveis' },
  { value: 'estoque', label: 'Estoque' },
]

const COLUNAS_HEADSET = [
  { id: 'nome', label: 'Nome/Identificador' },
  { id: 'matricula', label: 'Matrícula' },
  { id: 'lacre', label: 'Lacre' },
  { id: 'marca', label: 'Marca' },
  { id: 'numero_serie', label: 'Nº Série' },
  { id: 'status', label: 'Status' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'observacoes', label: 'Observações' },
  { id: 'updated_at', label: 'Última Atualização' },
]

const COLUNAS_PC = [
  { id: 'nome', label: 'Identificador' },
  { id: 'pa', label: 'PA' },
  { id: 'hostname', label: 'Hostname' },
  { id: 'serial_number', label: 'Nº Série' },
  { id: 'status', label: 'Status' },
  { id: 'updated_at', label: 'Última Atualização' },
]

/**
 * Utilitário para gerar arquivo Excel (.xlsx)
 */
function baixarXLSX(dados, nomeAba, nomeArquivo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(dados)
  XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}

/**
 * Utilitário para gerar arquivo CSV
 */
function baixarCSV(dados, nomeArquivo) {
  const ws = XLSX.utils.json_to_sheet(dados)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Página de Exportação de Dados
 * Permite extrair relatórios customizados em formato XLSX ou CSV com filtros avançados.
 */
export function ExportarPage() {
  const [hsStatus, setHsStatus] = useState('')
  const [pcStatus, setPcStatus] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [colsHs, setColsHs] = useState(COLUNAS_HEADSET.map(c => c.id))
  const [colsPc, setColsPc] = useState(COLUNAS_PC.map(c => c.id))
  
  const [loading, setLoading] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const hoje = () => new Date().toISOString().slice(0, 10)

  // Filtra dados por data
  const filtrarPorData = (rows) => {
    if (!dataInicio && !dataFim) return rows
    return rows.filter(r => {
      const data = new Date(r.updated_at || r.created_at)
      if (dataInicio && data < new Date(dataInicio)) return false
      if (dataFim && data > new Date(dataFim + 'T23:59:59')) return false
      return true
    })
  }

  // Mapeia colunas selecionadas
  const mapearColunas = (rows, colunasAtivas, dicionario) => {
    return rows.map(r => {
      const obj = {}
      colunasAtivas.forEach(id => {
        const label = dicionario.find(c => c.id === id)?.label || id
        let valor = r[id]
        if (id === 'updated_at' || id === 'created_at') {
          valor = valor ? new Date(valor).toLocaleString('pt-BR') : '—'
        }
        obj[label] = valor ?? '—'
      })
      return obj
    })
  }

  const toggleCol = (type, id) => {
    if (type === 'hs') {
      setColsHs(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
    } else {
      setColsPc(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
    }
  }

  // Gera Resumo Estatístico (Relatório Gerencial)
  async function exportarResumo() {
    setLoading('resumo')
    setFeedback(null)
    try {
      const [headsets, pcs] = await Promise.all([listarHeadsets(), listarComputadores()])
      
      const hsFiltrados = filtrarPorData(headsets)
      const pcFiltrados = filtrarPorData(pcs)

      // 1. Manutenções e Custos (Extraído das observações via regex para simplicidade)
      let totalCustoManutencao = 0
      let qtdManutencoes = 0
      
      hsFiltrados.forEach(h => {
        if (h.status === 'manutencao' || h.observacoes?.includes('manutenção')) {
          qtdManutencoes++
          // Busca "Custo: R$XX,XX" nas observações
          const match = h.observacoes?.match(/Custo:\s*R\$?\s*(\d+[.,]\d+)/i)
          if (match) {
            const valor = parseFloat(match[1].replace(',', '.'))
            if (!isNaN(valor)) totalCustoManutencao += valor
          }
        }
      })

      // 2. Novos Cadastros no Período
      const novosHS = hsFiltrados.filter(h => {
        const created = new Date(h.created_at)
        if (dataInicio && created < new Date(dataInicio)) return false
        if (dataFim && created > new Date(dataFim + 'T23:59:59')) return false
        return true
      }).length

      const novosPC = pcFiltrados.filter(p => {
        const created = new Date(p.created_at)
        if (dataInicio && created < new Date(dataInicio)) return false
        if (dataFim && created > new Date(dataFim + 'T23:59:59')) return false
        return true
      }).length

      // 3. Monta o Excel de Resumo
      const resumoData = [
        { INDICADOR: 'PERÍODO', VALOR: `${dataInicio || 'Início'} até ${dataFim || 'Hoje'}` },
        { INDICADOR: '', VALOR: '' },
        { INDICADOR: '--- HEADSETS ---', VALOR: '' },
        { INDICADOR: 'Novos Equipamentos Cadastrados', VALOR: novosHS },
        { INDICADOR: 'Equipamentos Enviados/Retornados Manut.', VALOR: qtdManutencoes },
        { INDICADOR: 'Investimento Total em Reparos', VALOR: `R$ ${totalCustoManutencao.toFixed(2)}` },
        { INDICADOR: '', VALOR: '' },
        { INDICADOR: '--- COMPUTADORES ---', VALOR: '' },
        { INDICADOR: 'Novos Equipamentos Cadastrados', VALOR: novosPC },
        { INDICADOR: 'Total Ativos no Período (Atualizados)', VALOR: pcFiltrados.length },
      ]

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(resumoData)
      XLSX.utils.book_append_sheet(wb, ws, 'Resumo Gerencial')
      XLSX.writeFile(wb, `resumo_estatistico_${hoje()}.xlsx`)

      setFeedback({ tipo: 'success', msg: 'Resumo gerencial gerado com sucesso.' })
    } catch (err) {
      console.error(err)
      setFeedback({ tipo: 'error', msg: 'Falha ao gerar resumo.' })
    } finally {
      setLoading(null)
    }
  }

  // Função mestre para exportação
  async function exportar(tipo, formato) {
    setLoading(`${tipo}-${formato}`)
    setFeedback(null)
    try {
      let dadosRaw = []
      let dadosFinal = []
      let nomeArquivo = ''
      let nomeAba = ''

      if (tipo === 'headsets') {
        const rows = await listarHeadsets()
        dadosRaw = hsStatus ? rows.filter((r) => r.status === hsStatus) : rows
        dadosRaw = filtrarPorData(dadosRaw)
        dadosFinal = mapearColunas(dadosRaw, colsHs, COLUNAS_HEADSET)
        nomeArquivo = `headsets${hsStatus ? '_' + hsStatus : ''}_${hoje()}`
        nomeAba = 'Headsets'
      } else if (tipo === 'computadores') {
        const rows = await listarComputadores()
        dadosRaw = pcStatus ? rows.filter((r) => r.status === pcStatus) : rows
        dadosRaw = filtrarPorData(dadosRaw)
        dadosFinal = mapearColunas(dadosRaw, colsPc, COLUNAS_PC)
        nomeArquivo = `computadores${pcStatus ? '_' + pcStatus : ''}_${hoje()}`
        nomeAba = 'Computadores'
      } else {
        const [hs, pcs] = await Promise.all([listarHeadsets(), listarComputadores()])
        if (formato === 'xlsx') {
          const wb = XLSX.utils.book_new()
          const hsFinal = mapearColunas(filtrarPorData(hs), colsHs, COLUNAS_HEADSET)
          const pcFinal = mapearColunas(filtrarPorData(pcs), colsPc, COLUNAS_PC)
          
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hsFinal), 'Headsets')
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pcFinal), 'Computadores')
          XLSX.writeFile(wb, `stationcore_completo_${hoje()}.xlsx`)
          setFeedback({ tipo: 'success', msg: `${hsFinal.length + pcFinal.length} registros exportados.` })
          return
        }
        // CSV completo junta tudo com prefixo
        const hsFinal = mapearColunas(filtrarPorData(hs), colsHs, COLUNAS_HEADSET).map(r => ({ ...r, TIPO: 'HEADSET' }))
        const pcFinal = mapearColunas(filtrarPorData(pcs), colsPc, COLUNAS_PC).map(r => ({ ...r, TIPO: 'COMPUTADOR' }))
        dadosFinal = [...hsFinal, ...pcFinal]
        nomeArquivo = `stationcore_completo_${hoje()}`
        nomeAba = 'Geral'
      }

      if (dadosFinal.length === 0) {
        return setFeedback({ tipo: 'warning', msg: 'Nenhum dado encontrado com os filtros selecionados.' })
      }

      if (formato === 'xlsx') baixarXLSX(dadosFinal, nomeAba, nomeArquivo)
      else baixarCSV(dadosFinal, nomeArquivo)

      setFeedback({ tipo: 'success', msg: `${dadosFinal.length} registros exportados com sucesso.` })
    } catch (err) {
      console.error(err)
      setFeedback({ tipo: 'error', msg: 'Falha ao processar exportação.' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="page-fade-in">
      <header className="page-header-premium">
        <h2 className="page-title">Exportar</h2>
        <p className="page-subtitle">Relatórios avançados com filtros de data e seleção de colunas.</p>
      </header>

      {feedback && (
        <div className={`badge ${feedback.tipo === 'success' ? 'badge-success' : feedback.tipo === 'warning' ? 'badge-warning' : 'badge-danger'} w-full`} style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Filtros Globais */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <h4 className="card-title"><Calendar size={18} /> Filtros de Período</h4>
        <div className="row gap wrap" style={{ marginTop: '1rem' }}>
          <div className="flex-1" style={{ minWidth: '200px' }}>
            <label className="muted small">Data Inicial</label>
            <input type="date" className="input w-full" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div className="flex-1" style={{ minWidth: '200px' }}>
            <label className="muted small">Data Final</label>
            <input type="date" className="input w-full" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <div className="row gap" style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
            <button className="btn btn-secondary" onClick={() => { setDataInicio(''); setDataFim(''); }}>Limpar Datas</button>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: '1rem' }}>
          <Info size={14} style={{ marginRight: 4 }} />
          O filtro de data considera o campo <strong>última atualização</strong> do registro.
        </p>
      </section>

      <div className="dashboard-grid">
        {/* Exportação de Headsets */}
        <section className="card">
          <h4 className="card-title"><Headphones size={18} /> Headsets</h4>
          
          <div style={{ marginTop: '1.25rem' }}>
            <label className="muted small">Status</label>
            <select className="input w-full" value={hsStatus} onChange={e => setHsStatus(e.target.value)}>
              {STATUS_HEADSET.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label className="muted small mb-2 block"><Settings2 size={14} /> Colunas</label>
            <div className="column-selector">
              {COLUNAS_HEADSET.map(c => (
                <label key={c.id} className="col-item">
                  <input type="checkbox" checked={colsHs.includes(c.id)} onChange={() => toggleCol('hs', c.id)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="row gap" style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary flex-1" disabled={!!loading} onClick={() => exportar('headsets', 'xlsx')}>
              {loading === 'headsets-xlsx' ? <Loader2 size={16} className="animate-spin" /> : <TableIcon size={16} />}
              Excel
            </button>
            <button className="btn btn-secondary flex-1" disabled={!!loading} onClick={() => exportar('headsets', 'csv')}>
              <FileDown size={16} /> CSV
            </button>
          </div>
        </section>

        {/* Exportação de Computadores */}
        <section className="card">
          <h4 className="card-title"><Monitor size={18} /> Computadores</h4>
          
          <div style={{ marginTop: '1.25rem' }}>
            <label className="muted small">Status</label>
            <select className="input w-full" value={pcStatus} onChange={e => setPcStatus(e.target.value)}>
              {STATUS_PC.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label className="muted small mb-2 block"><Settings2 size={14} /> Colunas</label>
            <div className="column-selector">
              {COLUNAS_PC.map(c => (
                <label key={c.id} className="col-item">
                  <input type="checkbox" checked={colsPc.includes(c.id)} onChange={() => toggleCol('pc', c.id)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="row gap" style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary flex-1" disabled={!!loading} onClick={() => exportar('computadores', 'xlsx')}>
              {loading === 'computadores-xlsx' ? <Loader2 size={16} className="animate-spin" /> : <TableIcon size={16} />}
              Excel
            </button>
            <button className="btn btn-secondary flex-1" disabled={!!loading} onClick={() => exportar('computadores', 'csv')}>
              <FileDown size={16} /> CSV
            </button>
          </div>
        </section>

        {/* Exportação Completa */}
        <section className="card">
          <h4 className="card-title"><Database size={18} /> Banco de Dados Completo</h4>
          <p className="muted small">Exporta todos os ativos com os filtros de data aplicados.</p>
          <div className="row gap" style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary w-full" disabled={!!loading} onClick={() => exportar('tudo', 'xlsx')}>
              {loading === 'tudo-xlsx' ? <Loader2 size={16} className="animate-spin" /> : <TableIcon size={16} />}
              Backup Full (Excel)
            </button>
          </div>
          <p className="small muted" style={{ marginTop: '1.5rem' }}>
            <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            O backup full aplicará a seleção de colunas para cada aba respectiva.
          </p>
        </section>

        {/* Novo: Resumo Gerencial */}
        <section className="card" style={{ background: 'var(--accent-glow)', borderColor: 'var(--accent)' }}>
          <h4 className="card-title" style={{ color: 'var(--accent-light)' }}><BarChart3 size={18} /> Resumo Gerencial</h4>
          <p className="muted small">Gera um relatório executivo com métricas de custo, manutenções e novos ativos no período selecionado.</p>
          
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="metric-preview">
              <div className="row gap">
                <TrendingUp size={16} className="text-success" />
                <span className="small">Indicadores de Crescimento</span>
              </div>
              <div className="row gap">
                <DollarSign size={16} className="text-accent" />
                <span className="small">Controle de Custos</span>
              </div>
              <div className="row gap">
                <Wrench size={16} className="text-warning" />
                <span className="small">Fluxo de Manutenção</span>
              </div>
            </div>

            <button className="btn btn-primary w-full" style={{ background: 'var(--accent)' }} disabled={!!loading} onClick={exportarResumo}>
              {loading === 'resumo' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              Gerar Relatório Gerencial (Excel)
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .metric-preview {
          padding: 1rem;
          background: rgba(var(--bg-rgb), 0.5);
          border-radius: var(--radius-sm);
          border: 1px dashed var(--accent);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .column-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }
        .col-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          color: var(--text-muted);
        }
        .col-item input {
          cursor: pointer;
        }
        .col-item:hover {
          color: var(--text);
        }
        .mb-2 { margin-bottom: 0.5rem; }
        .block { display: block; }
      `}</style>
    </div>
  )
}
