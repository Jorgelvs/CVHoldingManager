import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthGuard({ children }) {
  const location = useLocation()
  const { authRequired, loadingSession, isAuthenticated } = useAuth()

  if (!authRequired) {
    return children
  }

  if (loadingSession) {
    return (
      <div className="page-center" role="status" aria-live="polite">
        Validando sessao...
      </div>
    )
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return children
}
