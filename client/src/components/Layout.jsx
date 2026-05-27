import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { 
  LayoutDashboard, 
  Headphones, 
  Monitor, 
  Users,
  ArrowDownToLine, 
  ArrowUpFromLine, 
  LogOut, 
  Moon, 
  Sun,
  Menu,
  X,
  Home,
  ChevronRight,
  User as UserIcon,
  Shield,
  Key,
  History
} from 'lucide-react'
import { clearUserSession, getStoredUser, isAdmin, saveUserSession } from '../lib/auth'
import stationcoreLogo from '../assets/stationcore_icone.png'
import { Modal } from './Modal'
import { useToast } from './Toast'
import { atualizarUsuario } from '../services/usuariosApi'

/**
 * Componente de Navegação Principal (Sidebar)
 * Gerencia a navegação entre as páginas do sistema.
 */
function Sidebar({ isOpen, toggleMobileMenu }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/headsets', label: 'Headsets', icon: Headphones },
    { to: '/computadores', label: 'Computadores', icon: Monitor },
    { to: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
    { to: '/auditoria', label: 'Auditoria', icon: History },
    { to: '/importar', label: 'Importar', icon: ArrowDownToLine },
    { to: '/exportar', label: 'Exportar', icon: ArrowUpFromLine },
  ]

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src={stationcoreLogo} alt="StationCore" className="sidebar-logo" />
        <div className="sidebar-brand">
          <h1>StationCore</h1>
        </div>
        {/* Botão de fechar visível apenas no mobile */}
        <button type="button" className="btn-mobile-close" onClick={toggleMobileMenu}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin()) return null
          return (
            <NavLink 
              key={item.to} 
              to={item.to} 
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => isOpen && toggleMobileMenu()}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <p className="small muted">v1.2.5 Premium</p>
      </div>
    </aside>
  )
}

/**
 * Layout Principal do Sistema
 * Estrutura a Sidebar e a área de conteúdo principal.
 */
export function Layout() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [user, setUser] = useState(getStoredUser())
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ nome: '', senha: '', confirmarSenha: '' })
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Sincroniza o tema selecionado com o atributo data-theme no HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function handleLogout() {
    clearUserSession()
    navigate('/login', { replace: true })
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  const openProfile = () => {
    setProfileForm({ nome: user?.nome || '', senha: '', confirmarSenha: '' })
    setIsProfileModalOpen(true)
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    if (profileForm.senha && profileForm.senha !== profileForm.confirmarSenha) {
      return addToast('As senhas não coincidem.', 'warning')
    }

    setIsSavingProfile(true)
    try {
      const body = { nome: profileForm.nome }
      if (profileForm.senha) body.senha = profileForm.senha
      
      const updatedUser = await atualizarUsuario(user.id, body)
      
      // Atualiza estado local e storage
      const session = JSON.parse(localStorage.getItem('stationcore.auth.session'))
      session.usuario = updatedUser
      saveUserSession(session)
      
      setUser(updatedUser)
      setIsProfileModalOpen(false)
      addToast('Perfil atualizado com sucesso!')
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar perfil', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="app-shell">
      {/* Sidebar de Navegação */}
      <Sidebar isOpen={isMobileMenuOpen} toggleMobileMenu={toggleMobileMenu} />

      {/* Área de Conteúdo Principal */}
      <div className="main-wrapper">
        <header className="top-bar">
          {/* Botão Hambúrguer para Mobile */}
          <button className="btn-mobile-menu" onClick={toggleMobileMenu}>
            <Menu size={24} />
          </button>

          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="user-profile">
              <div 
                className="user-info-clickable" 
                onClick={openProfile}
                title="Ver meu perfil"
              >
                <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <UserIcon size={16} />
                </div>
                <div className="user-text">
                  <span className="user-name">Olá, <strong>{user?.nome?.split(' ')[0] ?? 'Usuário'}</strong></span>
                  <span className="user-role small muted">{user?.role === 'admin' ? 'Administrador' : 'Operador'}</span>
                </div>
              </div>
              
              <button 
                type="button" 
                className="btn btn-secondary btn-icon logout" 
                onClick={handleLogout}
                title="Sair do sistema"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Modal: Meu Perfil */}
      {isProfileModalOpen && (
        <Modal
          title="Configurações de Perfil"
          onClose={() => !isSavingProfile && setIsProfileModalOpen(false)}
          size="sm"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsProfileModalOpen(false)} disabled={isSavingProfile}>Cancelar</button>
              <button type="submit" form="f-profile" className="btn btn-primary" disabled={isSavingProfile}>
                {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          }
        >
          <form id="f-profile" onSubmit={handleUpdateProfile}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ 
                  width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1rem', 
                  background: 'var(--accent-glow)', border: '2px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)'
                }}>
                  <UserIcon size={32} />
                </div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{user?.nome}</h3>
                <p className="small muted">{user?.email}</p>
                <div style={{ marginTop: '0.75rem' }}>
                  <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                    <Shield size={12} style={{ marginRight: 6 }} />
                    {user?.role === 'admin' ? 'Administrador' : 'Operador'}
                  </span>
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label>Nome de Exibição
                  <input 
                    className="input" 
                    value={profileForm.nome} 
                    onChange={e => setProfileForm(p => ({...p, nome: e.target.value}))} 
                    required 
                    placeholder="Seu nome completo"
                  />
                </label>
              </div>

              <div style={{ padding: '1.25rem', background: 'rgba(var(--bg-rgb), 0.3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h5 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                  <Key size={16} className="text-accent" /> Alterar Senha
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label>Nova Senha
                    <input 
                      type="password" 
                      className="input" 
                      value={profileForm.senha} 
                      onChange={e => setProfileForm(p => ({...p, senha: e.target.value}))} 
                      placeholder="Mínimo 6 caracteres"
                    />
                  </label>
                  <label>Confirmar Senha
                    <input 
                      type="password" 
                      className="input" 
                      value={profileForm.confirmarSenha} 
                      onChange={e => setProfileForm(p => ({...p, confirmarSenha: e.target.value}))} 
                    />
                  </label>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .user-info-clickable {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background 0.2s;
        }
        .user-info-clickable:hover {
          background: var(--bg-secondary);
        }
        .user-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .user-role {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}
