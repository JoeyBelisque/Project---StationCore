import { useCallback, useEffect, useState } from 'react'
import { 
  Plus, 
  Search, 
  RefreshCcw, 
  User, 
  Mail, 
  Shield, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  removerUsuario
} from '../services/usuariosApi'
import { isAdmin } from '../lib/auth'

const emptyForm = () => ({
  id: null,
  nome: '',
  email: '',
  senha: '',
  role: 'operador',
  ativo: true
})

export function UsuariosPage() {
  const { addToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listarUsuarios()
      setRows(data)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(u => 
    u.nome.toLowerCase().includes(q.toLowerCase()) || 
    u.email.toLowerCase().includes(q.toLowerCase())
  )

  const openNew = () => setModal({ mode: 'edit', form: emptyForm() })
  const openEdit = (u) => setModal({ mode: 'edit', form: { ...u, senha: '' } })

  async function handleSubmit(e) {
    e.preventDefault()
    const f = modal.form
    try {
      if (f.id) {
        await atualizarUsuario(f.id, f)
        addToast('Usuário atualizado!')
      } else {
        await criarUsuario(f)
        addToast('Usuário criado com sucesso!')
      }
      setModal(null)
      load()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este usuário permanentemente?')) return
    try {
      await removerUsuario(id)
      addToast('Usuário removido.')
      load()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  return (
    <div className="page-fade-in">
      <header className="page-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">Gestão de Usuários</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Controle de acesso e níveis de permissão do sistema.</p>
        </div>
        <div className="row gap">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {isAdmin() && (
            <button className="btn btn-primary" onClick={openNew}>
              <Plus size={16} /> Novo Usuário
            </button>
          )}
        </div>
      </header>

      <div className="card toolbar-premium">
        <div className="input-with-icon">
          <Search size={18} className="icon" />
          <input 
            type="search" 
            className="input w-full" 
            placeholder="Buscar por nome ou e-mail..." 
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container shadow-lg">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Nível</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 muted">Carregando usuários...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 muted">Nenhum usuário encontrado.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row gap">
                      <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: '50%' }}>
                        <User size={16} />
                      </div>
                      <strong>{u.nome}</strong>
                    </div>
                  </td>
                  <td><span className="muted">{u.email}</span></td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                      <Shield size={12} style={{ marginRight: 4 }} />
                      {u.role === 'admin' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td>
                    {u.ativo ? (
                      <span className="badge badge-success"><CheckCircle size={12} style={{ marginRight: 4 }} /> Ativo</span>
                    ) : (
                      <span className="badge badge-warning"><XCircle size={12} style={{ marginRight: 4 }} /> Inativo</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row gap" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-icon" onClick={() => openEdit(u)}><Edit3 size={16} /></button>
                      <button className="btn btn-secondary btn-icon text-danger" onClick={() => handleDelete(u.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal?.mode === 'edit' && (
        <Modal
          title={modal.form.id ? 'Editar Usuário' : 'Novo Usuário'}
          onClose={() => setModal(null)}
          icon={modal.form.id ? Edit3 : Plus}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button type="submit" form="f-user" className="btn btn-primary">Salvar</button></>}
        >
          <form id="f-user" className="form-grid" onSubmit={handleSubmit}>
            <label className="full">Nome Completo<input className="input" value={modal.form.nome} onChange={e => setModal(m => ({...m, form: {...m.form, nome: e.target.value}}))} required /></label>
            <label>E-mail<input type="email" className="input" value={modal.form.email} onChange={e => setModal(m => ({...m, form: {...m.form, email: e.target.value}}))} required /></label>
            <label>Senha {modal.form.id && <span className="small muted">(deixe em branco para manter)</span>}
              <input type="password" className="input" value={modal.form.senha} onChange={e => setModal(m => ({...m, form: {...m.form, senha: e.target.value}}))} required={!modal.form.id} />
            </label>
            <label>Nível de Acesso
              <select className="input" value={modal.form.role} onChange={e => setModal(m => ({...m, form: {...m.form, role: e.target.value}}))}>
                <option value="operador">Operador (Leitura/Escrita)</option>
                <option value="admin">Administrador (Total)</option>
              </select>
            </label>
            <label>Status
              <select className="input" value={modal.form.ativo} onChange={e => setModal(m => ({...m, form: {...m.form, ativo: e.target.value === 'true'}}))}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </form>
        </Modal>
      )}
    </div>
  )
}
