import React from 'react'
import { formatarMoeda } from '../utils/financeiroUtils.js'

export default function ResumoFinanceiro({ totalReceitas, totalDespesas, resultado, pendencias, atrasados }) {
  return (
    <div className="summary-grid">
      <div className="summary-card">
        <strong>{formatarMoeda(totalReceitas)}</strong>
        <span>Total de receitas</span>
      </div>
      <div className="summary-card">
        <strong>{formatarMoeda(totalDespesas)}</strong>
        <span>Total de despesas</span>
      </div>
      <div className="summary-card">
        <strong>{formatarMoeda(resultado)}</strong>
        <span>Resultado</span>
      </div>
      <div className="summary-card">
        <strong>{formatarMoeda(pendencias)}</strong>
        <span>Receitas/Despesas pendentes</span>
      </div>
      <div className="summary-card">
        <strong>{formatarMoeda(atrasados)}</strong>
        <span>Valores atrasados</span>
      </div>
    </div>
  )
}
