import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearUserSession, getStoredUser } from '../lib/auth'
import stationcoreLogo from '../assets/stationcore_icone.png'

const linkClass = ({ isActive }) =>
  `nav-link ${isActive ? 'active' : ''}`

export function Layout() {
  const navigate = useNavigate()
  const user = getStoredUser()

  function handleLogout() {
    // Limpa sessão local e evita voltar para área privada no botão "voltar".
    clearUserSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand">
            <img src={stationcoreLogo} alt="StationCore Logo" className="brand-mark" />
            <div>
              <h1>StationCore</h1>
              <p className="brand-sub">Headsets e computadores por PA</p>
            </div>
          </div>
        </div>
        {/* Menu principal horizontal; no mobile rola lateralmente via CSS. */}
        <nav className="header-nav" aria-label="Principal">
          <NavLink to="/" end className={linkClass}>
            Início
          </NavLink>
          <NavLink to="/headsets" className={linkClass}>
            Headsets
          </NavLink>
          <NavLink to="/computadores" className={linkClass}>
            Computadores
          </NavLink>
          <NavLink to="/importar" className={linkClass}>
            Importar
          </NavLink>
           <NavLink to="/exportar" className={linkClass}>
            Exportar
          </NavLink>
        </nav>
        <div className="header-auth">
          <span className="small muted">Olá, {user?.nome ?? user?.email ?? 'Usuário'}</span>
          <button type="button" className="btn small" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
