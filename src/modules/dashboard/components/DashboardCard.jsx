import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function DashboardCard({ title, value, rows = null, subtitle, footer, to = null, onClick = null, children = null, accent = false, className = '', style = {} }) {
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
      {rows ? (
        // Duas informações lado a lado (ex.: mês vigente + acumulado no ano)
        // em vez de um único valor grande — usado quando o card precisa
        // deixar claro que não é só "um período genérico".
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{row.label}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>{value}</div>
      )}
      {subtitle ? <span style={{ color: 'var(--text)', fontSize: 13 }}>{subtitle}</span> : null}
      {footer ? <span style={{ color: 'var(--accent)', fontSize: 12, marginTop: 4 }}>{footer}</span> : null}
    </button>
  )
}
