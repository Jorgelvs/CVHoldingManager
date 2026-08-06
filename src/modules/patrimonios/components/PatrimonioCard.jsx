import React from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge.jsx'
import { calcularResumoUnidadesPatrimonio, enderecoResumo } from '../utils/patrimonioUtils.js'

export default function PatrimonioCard({ patrimonio, unidadesVinculadas = [], onToggleSituacao, onExcluir }) {
  const resumoUnidades = calcularResumoUnidadesPatrimonio(patrimonio, unidadesVinculadas)
  const endereco = enderecoResumo(patrimonio.endereco)
  const situacao = patrimonio.situacao || 'N/A'

  return (
    <article className="patrimonio-card">
      <div className="card-header">
        <div>
          <h3>{patrimonio.nome}</h3>
          <small>{patrimonio.codigo}</small>
        </div>
        <StatusBadge status={situacao} />
      </div>
      <div className="card-meta">
        <span>{patrimonio.tipo}</span>
        <span>{patrimonio.grupoPatrimonial}</span>
        <span>{endereco}</span>
      </div>
      <div className="card-stats">
        <div>
          <strong>{resumoUnidades.totalPrevisto}</strong>
          <span>Total de unidades</span>
        </div>
        <div>
          <strong>{resumoUnidades.cadastradas}</strong>
          <span>Cadastradas</span>
        </div>
        <div>
          <strong>{resumoUnidades.ocupadas}</strong>
          <span>Ocupadas</span>
        </div>
        <div>
          <strong>{resumoUnidades.vagas}</strong>
          <span>Vagas</span>
        </div>
        <div>
          <strong>{resumoUnidades.taxaOcupacao}%</strong>
          <span>Ocupação</span>
        </div>
      </div>
      <div className="card-actions">
        <Link className="button button-secondary" to={`/patrimonios/${patrimonio.id}`}>
          Visualizar
        </Link>
        <Link className="button button-secondary" to={`/patrimonios/${patrimonio.id}/editar`}>
          Editar
        </Link>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onToggleSituacao(patrimonio)}
        >
          {situacao === 'Inativo' ? 'Reativar' : 'Inativar'}
        </button>
        {onExcluir ? (
          <button type="button" className="button button-danger" onClick={() => onExcluir(patrimonio)}>
            Excluir
          </button>
        ) : null}
      </div>
    </article>
  )
}
