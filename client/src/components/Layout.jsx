import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearUserSession, getStoredUser } from '../lib/auth'

const linkClass = ({ isActive }) =>
  `nav-link ${isActive ? 'active' : ''}`

export function Layout() {
  const navigate = useNavigate()
  const user = getStoredUser()

  function handleLogout() {
    clearUserSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>StationCore</h1>
            <p className="brand-sub">Headsets e computadores por PA</p>
          </div>
        </div>
        <nav className="app-nav" aria-label="Principal">
          <NavLink to="/" end className={linkClass}>
            Início
          </NavLink>
          <NavLink to="/headsets" className={linkClass}>
            Headsets
          </NavLink>
          <NavLink to="/computadores" className={linkClass}>
            Computadores
          </NavLink>
        </nav>
        <div className="auth-actions">
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
