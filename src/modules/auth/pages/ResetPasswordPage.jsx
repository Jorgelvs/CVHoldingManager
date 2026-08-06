import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const PASSWORD_MIN_LENGTH = 8

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const {
    authBusy,
    recoveryRequired,
    saveNewPassword,
    logout,
    error,
    clearError,
    supabaseConfigured,
  } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [validationError, setValidationError] = useState('')

  const formError = useMemo(() => validationError || error || '', [validationError, error])

  const handleCancel = async () => {
    clearError()
    setValidationError('')
    setSuccessMessage('')
    await logout()
    navigate('/login', { replace: true })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearError()
    setValidationError('')
    setSuccessMessage('')

    if (!password || !confirmPassword) {
      setValidationError('Informe e confirme a nova senha.')
      return
    }

    if (password !== confirmPassword) {
      setValidationError('A confirmacao da senha deve ser igual a nova senha.')
      return
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setValidationError(`A senha deve ter no minimo ${PASSWORD_MIN_LENGTH} caracteres.`)
      return
    }

    const result = await saveNewPassword(password)
    if (!result.ok) {
      return
    }

    setPassword('')
    setConfirmPassword('')
    setSuccessMessage('Senha alterada com sucesso. Entre novamente.')

    navigate('/login', {
      replace: true,
      state: { message: 'Senha alterada com sucesso. Entre novamente.' },
    })
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-live="polite">
        <h1>Redefinir senha</h1>
        <p className="login-subtitle">Crie uma nova senha para continuar usando o sistema.</p>

        {!supabaseConfigured ? (
          <div className="alert-box alert-error" role="alert" style={{ marginBottom: 12 }}>
            Supabase indisponivel. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
          </div>
        ) : null}

        {!recoveryRequired ? (
          <div className="alert-box alert-error" role="alert" style={{ marginBottom: 12 }}>
            Link de recuperacao invalido ou expirado. Solicite um novo link para redefinir sua senha.
          </div>
        ) : null}

        {formError ? (
          <div className="alert-box alert-error" role="alert" style={{ marginBottom: 12 }}>
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="alert-box alert-success" role="status" style={{ marginBottom: 12 }}>
            {successMessage}
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="reset-password">Nova senha</label>
          <div className="password-input-row">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={authBusy || !recoveryRequired || !supabaseConfigured}
              required
            />
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setShowPassword((current) => !current)}
              disabled={authBusy}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <label htmlFor="reset-password-confirm">Confirmar nova senha</label>
          <input
            id="reset-password-confirm"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            disabled={authBusy || !recoveryRequired || !supabaseConfigured}
            required
          />

          <div className="login-actions-row">
            <button
              className="button-primary"
              type="submit"
              disabled={authBusy || !recoveryRequired || !supabaseConfigured}
            >
              {authBusy ? 'Salvando...' : 'Salvar nova senha'}
            </button>
            <button type="button" className="button button-secondary" onClick={handleCancel} disabled={authBusy}>
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
