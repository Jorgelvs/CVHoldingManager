import React from 'react'
import { Link } from 'react-router-dom'
import StatusFinanceiroBadge from './StatusFinanceiroBadge.jsx'
import { formatarMoeda } from '../utils/financeiroUtils.js'

export default function LancamentoCard({ lancamento, patrimonio, unidade, onMarcarPago, onCancelar, onExcluir }) {
  return (
    <tr>
      <td>{lancamento.descricao}</td>
      <td>{lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
      <td>{lancamento.categoria}</td>
      <td>{lancamento.subcategoria || '-'}</td>
      <td>{patrimonio?.nome || 'N/A'}</td>
      <td>{unidade?.nome || '-'}</td>
      <td>{lancamento.dataCompetencia}</td>
      <td>{lancamento.dataVencimento || '-'}</td>
      <td><StatusFinanceiroBadge lancamento={lancamento} /></td>
      <td>{formatarMoeda(lancamento.valor)}</td>
      <td className="table-actions">
        <Link className="button button-secondary" to={`/financeiro/${lancamento.id}`}>
          Visualizar
        </Link>
        <Link className="button button-secondary" to={`/financeiro/${lancamento.id}/editar`}>
          Editar
        </Link>
        {lancamento.status !== 'pago' && lancamento.status !== 'cancelado' ? (
          <button className="button button-primary" type="button" onClick={() => onMarcarPago(lancamento)}>
            Marcar pago
          </button>
        ) : null}
        {lancamento.status !== 'cancelado' ? (
          <button className="button button-danger" type="button" onClick={() => onCancelar(lancamento)}>
            Cancelar
          </button>
        ) : null}
        <button className="button button-secondary" type="button" onClick={() => onExcluir(lancamento)}>
          Excluir
        </button>
      </td>
    </tr>
  )
}
