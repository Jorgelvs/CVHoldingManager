import React from 'react'
import { formatarValor } from '../services/dashboardService.js'

export default function ChartFinanceiro({ data, title = 'Últimos 6 meses', subtitle = 'Receitas, despesas e resultado', style = {} }) {
  if (!data || data.length === 0) return <div className="empty-state"><h2>Nenhum dado disponível para o gráfico.</h2></div>

  const maxValue = Math.max(...data.map((item) => Math.max(item.receitas, item.despesas, item.resultado, 1)))
  const chartHeight = 180

  return (
    <div className="summary-card" style={{ padding: 16, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <strong>{title}</strong>
        <span style={{ color: 'var(--text)', fontSize: 13 }}>{subtitle}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: chartHeight, overflowX: 'auto' }}>
        {data.map((item) => {
          const receitasHeight = maxValue > 0 ? (item.receitas / maxValue) * 100 : 0
          const despesasHeight = maxValue > 0 ? (item.despesas / maxValue) * 100 : 0
          const resultadoHeight = maxValue > 0 ? (Math.abs(item.resultado) / maxValue) * 100 : 0
          return (
            <div key={item.key} style={{ flex: '1 0 110px', minWidth: 70, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, height: chartHeight, alignItems: 'flex-end' }}>
                <div title={`Receitas ${formatarValor(item.receitas)}`} style={{ flex: 1, background: 'rgba(34,197,94,0.25)', height: `${Math.max(receitasHeight, 8)}%`, borderRadius: 6 }} />
                <div title={`Despesas ${formatarValor(item.despesas)}`} style={{ flex: 1, background: 'rgba(248,113,113,0.25)', height: `${Math.max(despesasHeight, 8)}%`, borderRadius: 6 }} />
                <div title={`Resultado ${formatarValor(item.resultado)}`} style={{ flex: 1, background: 'rgba(170,59,255,0.25)', height: `${Math.max(resultadoHeight, 8)}%`, borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', textAlign: 'center' }}>{item.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
