import React from 'react'
import { getStatusEfetivo } from '../utils/financeiroUtils.js'

const statusLabels = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

export default function StatusFinanceiroBadge({ lancamento }) {
  const status = getStatusEfetivo(lancamento)
  return (
    <span className={`status-badge status-${status}`}>{statusLabels[status] || status}</span>
  )
}
