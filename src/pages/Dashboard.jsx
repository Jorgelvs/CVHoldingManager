import React, { useEffect, useMemo, useState } from 'react'
import { listarPatrimonios } from '../modules/patrimonios/services/patrimonioService.js'

export default function Dashboard() {
  const [patrimonios, setPatrimonios] = useState([])

  useEffect(() => {
    setPatrimonios(listarPatrimonios())
  }, [])

  const estatisticas = useMemo(() => {
    const total = patrimonios.length
    const ativos = patrimonios.filter((item) => item.situacao === 'Ativo').length
    const implantacao = patrimonios.filter((item) => item.situacao === 'Em implantação').length
    const planejado = patrimonios.reduce((sum, item) => sum + (Number(item.quantidadeUnidades) || 0), 0)
    return { total, ativos, implantacao, planejado }
  }, [patrimonios])

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Visão geral dos patrimônios da C&V Holding.</p>
          <h1>Dashboard</h1>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="summary-card">
          <strong>{estatisticas.total}</strong>
          <span>Total de patrimônios</span>
        </div>
        <div className="summary-card">
          <strong>{estatisticas.ativos}</strong>
          <span>Patrimônios ativos</span>
        </div>
        <div className="summary-card">
          <strong>{estatisticas.implantacao}</strong>
          <span>Em implantação</span>
        </div>
        <div className="summary-card">
          <strong>{estatisticas.planejado}</strong>
          <span>Total planejado de unidades</span>
        </div>
      </div>
    </div>
  )
}
