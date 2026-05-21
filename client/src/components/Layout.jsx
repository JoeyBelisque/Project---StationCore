import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
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
  ChevronRight
} from 'lucide-react'
import { clearUserSession, getStoredUser } from '../lib/auth'
import stationcoreLogo from '../assets/stationcore_icone.png'

/**
 * Componente de Navegação Principal (Sidebar)
 * Gerencia a navegação entre as páginas do sistema.
 */
function Sidebar({ isOpen, toggleMobileMenu }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/headsets', label: 'Headsets', icon: Headphones },
    { to: '/computadores', label: 'Computadores', icon: Monitor },
    { to: '/usuarios', label: 'Usuários', icon: Users },
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
        {navItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => isOpen && toggleMobileMenu()} // Fecha o menu ao clicar em links no mobile
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="small muted">v1.2.0 Premium</p>
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
  const user = getStoredUser()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Sincroniza o tema selecionado com o atributo data-theme no HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function handleLogout() {
    // Finaliza a sessão do usuário e redireciona para o login
    clearUserSession()
    navigate('/login', { replace: true })
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

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
              <span className="user-name">Olá, <strong>{user?.nome ?? user?.email ?? 'Usuário'}</strong></span>
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
    </div>
  )
}
