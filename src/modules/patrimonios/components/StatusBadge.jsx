import React from 'react'

const cores = {
  Ativo: 'var(--accent)',
  'Em implantação': '#f59e0b',
  Inativo: '#6b7280',
  Vendido: '#10b981',
}

export default function StatusBadge({ status }) {
  return (
    <span className="status-badge" style={{ background: cores[status] ?? '#d1d5db', color: '#fff' }}>
      {status || 'Sem status'}
    </span>
  )
}
