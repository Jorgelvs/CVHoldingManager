import React from 'react'
import { formatarMoeda } from '../utils/financeiroUtils.js'

export default function ResumoFinanceiro({ totalReceitas, totalDespesas, resultado, pendencias, atrasados }) {
  return (
    <div className="summary-grid" style={{ gap: 10, marginBottom: 12 }}>
      <div className="summary-card" style={{ padding: '10px 12px', minHeight: 74 }}>
        <strong style={{ fontSize: 16 }}>{formatarMoeda(totalReceitas)}</strong>
        <span style={{ fontSize: 12, lineHeight: 1.3 }}>Receitas</span>
      </div>
      <div className="summary-card" style={{ padding: '10px 12px', minHeight: 74 }}>
        <strong style={{ fontSize: 16 }}>{formatarMoeda(totalDespesas)}</strong>
        <span style={{ fontSize: 12, lineHeight: 1.3 }}>Despesas</span>
      </div>
      <div className="summary-card" style={{ padding: '10px 12px', minHeight: 74 }}>
        <strong style={{ fontSize: 16 }}>{formatarMoeda(resultado)}</strong>
        <span style={{ fontSize: 12, lineHeight: 1.3 }}>Resultado</span>
      </div>
      <div className="summary-card" style={{ padding: '10px 12px', minHeight: 74 }}>
        <strong style={{ fontSize: 16 }}>{formatarMoeda(pendencias)}</strong>
        <span style={{ fontSize: 12, lineHeight: 1.3 }}>Pendentes</span>
      </div>
      <div className="summary-card" style={{ padding: '10px 12px', minHeight: 74 }}>
        <strong style={{ fontSize: 16 }}>{formatarMoeda(atrasados)}</strong>
        <span style={{ fontSize: 12, lineHeight: 1.3 }}>Atrasados</span>
      </div>
    </div>
  )
}
