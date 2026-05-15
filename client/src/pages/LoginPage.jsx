import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, User, LogIn } from 'lucide-react'
import { login, saveUserSession } from '../lib/auth'
import stationcoreLogo from '../assets/stationcore_icone.png'
import './LoginPage.css'

/**
 * Página de Autenticação Premium
 * Responsável pelo controle de acesso com interface moderna.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Redireciona para a página de origem ou dashboard
  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      // Executa a autenticação via serviço de auth
      const { usuario, token } = await login(email.trim(), senha)
      saveUserSession({ user: usuario, token })
      navigate(from, { replace: true })
    } catch (error) {
      setMessage(error.message || 'Credenciais inválidas ou erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <header className="login-header">
          <img src={stationcoreLogo} alt="StationCore" className="login-logo" />
          <h2>Bem-vindo</h2>
          <p>Acesse o painel administrativo StationCore</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Usuário ou E-mail</label>
            <div className="input-with-icon">
              <User size={18} className="icon" />
              <input
                id="email"
                type="email"
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: admin@stationcore.com"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Senha de Acesso</label>
            <div className="input-with-icon">
              <Lock size={18} className="icon" />
              <input
                id="password"
                type="password"
                className="input w-full"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {message && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', justifyContent: 'center' }}>
              {message}
            </div>
          )}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Autenticando...' : (
              <>
                <LogIn size={18} />
                Entrar no Sistema
              </>
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p>© 2026 StationCore v1.2.0 • Premium Access</p>
        </footer>
      </div>
    </div>
  )
}
