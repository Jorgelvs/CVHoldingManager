import React from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge.jsx'
import { calcularTaxaOcupacao, enderecoResumo } from '../utils/patrimonioUtils.js'

export default function PatrimonioCard({ patrimonio, onToggleSituacao, onExcluir }) {
  const ocupadas = patrimonio.indicadores?.unidadesOcupadas || 0
  const vagas = patrimonio.indicadores?.unidadesVagas || 0
  const cadastradas = patrimonio.indicadores?.unidadesCadastradas || 0
  const taxa = calcularTaxaOcupacao(patrimonio)
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
        <span>{patrimonio.grupoPatrimonial}</span>
        <span>{patrimonio.tipo}</span>
        <span>{endereco}</span>
      </div>
      <div className="card-stats">
        <div>
          <strong>{patrimonio.quantidadeUnidades || 0}</strong>
          <span>Total de unidades</span>
        </div>
        <div>
          <strong>{cadastradas}</strong>
          <span>Cadastradas</span>
        </div>
        <div>
          <strong>{ocupadas}</strong>
          <span>Ocupadas</span>
        </div>
        <div>
          <strong>{vagas}</strong>
          <span>Vagas</span>
        </div>
        <div>
          <strong>{taxa}%</strong>
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
