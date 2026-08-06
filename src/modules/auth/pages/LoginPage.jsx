import React, { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    authRequired,
    loadingSession,
    authBusy,
    isAuthenticated,
    login,
    sendPasswordRecovery,
    recoveryRequired,
    error,
    clearError,
    supabaseConfigured,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')

  const targetAfterLogin = useMemo(() => {
    const from = location.state?.from
    return typeof from === 'string' && from.trim() ? from : '/'
  }, [location.state])

  const resetSuccessMessage = useMemo(() => {
    const message = location.state?.message
    return typeof message === 'string' && message.trim() ? message : ''
  }, [location.state])

  if (!authRequired) {
    return <Navigate to="/" replace />
  }

  if (loadingSession) {
    return (
      <main className="login-page" aria-busy="true">
        <section className="login-card">
          <h1>Entrar</h1>
          <p className="login-subtitle">Recuperando sessao...</p>
        </section>
      </main>
    )
  }

  if (recoveryRequired) {
    return <Navigate to="/redefinir-senha" replace />
  }

  if (isAuthenticated) {
    return <Navigate to={targetAfterLogin} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearError()

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      return
    }

    const result = await login({ email: trimmedEmail, password })
    if (result.ok) {
      setPassword('')
      navigate(targetAfterLogin, { replace: true })
    }
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    clearError()
    setForgotPasswordMessage('')

    const targetEmail = forgotPasswordEmail.trim() || email.trim()
    if (!targetEmail) {
      setForgotPasswordMessage('Informe o e-mail para recuperar a senha.')
      return
    }

    const result = await sendPasswordRecovery(targetEmail)
    if (!result.ok) return

    setForgotPasswordMessage('Se o e-mail estiver cadastrado, voce recebera um link para redefinir sua senha.')
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-live="polite">
        <h1>Entrar</h1>
        <p className="login-subtitle">Autentique-se para acessar o ambiente Supabase de producao.</p>

        {!supabaseConfigured ? (
          <div className="alert-box alert-error" role="alert" style={{ marginBottom: 12 }}>
            Supabase indisponivel. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
          </div>
        ) : null}

        {error ? (
          <div className="alert-box alert-error" role="alert" style={{ marginBottom: 12 }}>
            {error}
          </div>
        ) : null}

        {resetSuccessMessage ? (
          <div className="alert-box alert-success" role="status" style={{ marginBottom: 12 }}>
            {resetSuccessMessage}
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={authBusy}
            required
          />

          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={authBusy}
            required
          />

          <button className="button-primary" type="submit" disabled={authBusy || !supabaseConfigured}>
            {authBusy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          className="button button-link"
          onClick={() => {
            clearError()
            setForgotPasswordMessage('')
            setForgotPasswordOpen((current) => !current)
          }}
          disabled={authBusy || !supabaseConfigured}
          style={{ marginTop: 10 }}
        >
          Esqueci minha senha
        </button>

        {forgotPasswordOpen ? (
          <form className="login-form" onSubmit={handleForgotPassword} style={{ marginTop: 10 }}>
            <label htmlFor="forgot-password-email">E-mail para recuperacao</label>
            <input
              id="forgot-password-email"
              type="email"
              value={forgotPasswordEmail}
              onChange={(event) => setForgotPasswordEmail(event.target.value)}
              autoComplete="email"
              disabled={authBusy || !supabaseConfigured}
              required
            />
            <button className="button button-secondary" type="submit" disabled={authBusy || !supabaseConfigured}>
              {authBusy ? 'Enviando...' : 'Enviar link de recuperacao'}
            </button>
            {forgotPasswordMessage ? (
              <div className="alert-box alert-success" role="status" style={{ marginBottom: 0 }}>
                {forgotPasswordMessage}
              </div>
            ) : null}
          </form>
        ) : null}
      </section>
    </main>
  )
}
