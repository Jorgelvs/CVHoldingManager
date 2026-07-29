import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function DashboardCard({ title, value, subtitle, footer, to = null, onClick = null, children = null, accent = false, className = '', style = {} }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) onClick()
    else if (to) navigate(to)
  }

  return (
    <button
      type="button"
      className={`summary-card ${accent ? 'accent-card' : ''} ${className}`}
      onClick={handleClick}
      style={{ textAlign: 'left', cursor: 'pointer', ...style }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 15 }}>{title}</strong>
        {children ? <span style={{ color: 'var(--accent)' }}>{children}</span> : null}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>{value}</div>
      {subtitle ? <span style={{ color: 'var(--text)', fontSize: 13 }}>{subtitle}</span> : null}
      {footer ? <span style={{ color: 'var(--accent)', fontSize: 12, marginTop: 4 }}>{footer}</span> : null}
    </button>
  )
}
