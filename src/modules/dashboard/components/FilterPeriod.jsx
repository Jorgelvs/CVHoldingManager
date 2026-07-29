import React from 'react'

export default function FilterPeriod({ periodo, onChange, className = '' }) {
  const anos = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index)
  return (
    <div className={`summary-card ${className}`} style={{ padding: 16, gap: 10 }}>
      <strong>Período</strong>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>Mês</span>
          <select value={periodo.mes || ''} onChange={(event) => onChange({ mes: event.target.value, ano: periodo.ano })}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((mes) => (
              <option key={mes} value={mes}>{String(mes).padStart(2, '0')}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>Ano</span>
          <select value={periodo.ano || ''} onChange={(event) => onChange({ mes: periodo.mes, ano: event.target.value })}>
            {anos.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
