import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  `nav-link ${isActive ? 'active' : ''}`

export function Layout() {
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
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
