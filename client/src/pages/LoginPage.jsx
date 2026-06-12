import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, User, LogIn, AlertCircle } from 'lucide-react'
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

        <form className="login-form" onSubmit={handleSubmit} style={{ gap: 0 }}>
          <div className="login-field" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email" style={{ marginBottom: '4px' }}>Usuário ou E-mail</label>
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

          <div className="login-field" style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="password" style={{ marginBottom: '4px' }}>Senha de Acesso</label>
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

          <div className={`login-feedback-area ${message ? 'has-error' : ''}`}>
            <div className="alert-premium-danger">
              {message && (
                <>
                  <div className="alert-icon-box">
                    <AlertCircle size={18} />
                  </div>
                  <div className="alert-content">
                    <strong>Atenção</strong>
                    <span>{message}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" style={{ marginTop: '0.75rem' }} disabled={loading}>
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

      <style>{`
        .login-feedback-area {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s ease-out, margin 0.3s ease;
          overflow: hidden;
          margin-bottom: 0;
        }
        .login-feedback-area.has-error {
          grid-template-rows: 1fr;
          margin-bottom: 1.5rem;
          margin-top: 0.5rem;
        }
        .alert-premium-danger {
          min-height: 0;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.05) 100%);
          border: 1px solid rgba(239, 68, 68, 0.25);
          borderRadius: 14px;
          color: #ef4444;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .alert-icon-box {
          background: #ef4444;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }
        .alert-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          line-height: 1.4;
        }
        .alert-content strong {
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #b91c1c;
        }
        .alert-content span {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .has-error .alert-premium-danger {
          opacity: 1;
          transform: translateY(0);
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  )
}
