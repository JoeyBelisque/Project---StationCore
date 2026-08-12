import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { HeadsetsPage } from './pages/HeadsetsPage'
import { ComputadoresPage } from './pages/ComputadoresPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ImportPage } from './pages/ImportPage'
import { ExportarPage } from './pages/ExportarPage'
import { AuditoriaPage } from './pages/AuditoriaPage'
import { LoginPage } from './pages/LoginPage'
import { AchadosPerdidosPage } from './pages/AchadosPerdidosPage'
import { getStoredUser } from './lib/auth'
import { ToastProvider } from './components/Toast'

function RequireAuth({ children }) {
  const location = useLocation()
  const user = getStoredUser()

  // Preserva a rota de origem para redirecionar o usuário após login.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        {/* Rotas públicas e privadas centralizadas em um único ponto. */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="headsets" element={<HeadsetsPage />} />
            <Route path="computadores" element={<ComputadoresPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="auditoria" element={<AuditoriaPage />} />
            <Route path="importar" element={<ImportPage />} />
            <Route path="exportar" element={<ExportarPage />} />
            <Route path="achados-perdidos" element={<AchadosPerdidosPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
