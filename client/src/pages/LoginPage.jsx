import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login, saveUserSession } from '../lib/auth'
import './LoginPage.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const { usuario, token } = await login(email.trim(), senha)
      saveUserSession({ user: usuario, token })
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (error) {
      setMessage(error.message || 'Erro ao realizar login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-screen login-theme">
      <div className="login-card glass">
        <div className="login-avatar" aria-hidden>
          <span>👤</span>
        </div>
        <h2 className="login-title">LOGIN</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-line-field">
            <span className="field-icon" aria-hidden>
              ✉
            </span>
            <input
              className="input login-line-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email ID"
              required
            />
          </label>

          <label className="login-line-field">
            <span className="field-icon" aria-hidden>
              🔒
            </span>
            <input
              className="input login-line-input"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Password"
              required
            />
          </label>

          <div className="login-row-links">
            <label className="login-remember">
              <input type="checkbox" />
              Remember me
            </label>
            <button type="button" className="link-button">
              Forgot Password?
            </button>
          </div>

          {message ? <p className="banner error">{message}</p> : null}

          <button className="btn primary login-btn login-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Login'}
          </button>
        </form>

        {/*<p className="small muted login-hint">
          Teste: <code>admin@stationcore.local</code> / <code>123456</code>
        </p>*/}
      </div>
    </section>
  )
}
