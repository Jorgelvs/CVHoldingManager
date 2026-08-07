import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, CheckCircle2, Ban, Trash2 } from 'lucide-react'
import StatusFinanceiroBadge from './StatusFinanceiroBadge.jsx'
import { formatarMoeda, getDataConsiderada } from '../utils/financeiroUtils.js'

export default function LancamentoCard({ lancamento, patrimonio, unidade, locatario, conta, onMarcarPago, onCancelar, onExcluir }) {
  return (
    <tr className="lancamento-row">
      <td>
        <div className="table-cell-title">
          {lancamento.descricao}
        </div>
      </td>
      <td className="table-cell-ellipsis">{lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
      <td className="table-cell-ellipsis">{lancamento.categoria}</td>
      <td className="table-cell-ellipsis">{patrimonio?.nome || 'N/A'}</td>
      <td>
        <div className="table-cell-ellipsis">{unidade?.nome || '-'}</div>
        {locatario ? <div className="table-cell-subtitle">{locatario.nomeCompleto}</div> : null}
      </td>
      <td className="table-cell-ellipsis"><strong>{formatarMoeda(lancamento.valor)}</strong></td>
      <td className="table-cell-ellipsis">{conta?.nome || '-'}</td>
      <td className="table-cell-ellipsis">{getDataConsiderada(lancamento) || '-'}</td>
      <td><StatusFinanceiroBadge lancamento={lancamento} /></td>
      <td className="table-actions">
        <Link className="button button-secondary icon-action-button" to={`/financeiro/${lancamento.id}`} title="Visualizar" aria-label="Visualizar lançamento">
          <Eye size={14} />
        </Link>
        <Link className="button button-secondary icon-action-button" to={`/financeiro/${lancamento.id}/editar`} title="Editar" aria-label="Editar lançamento">
          <Pencil size={14} />
        </Link>
        {lancamento.status !== 'pago' && lancamento.status !== 'cancelado' ? (
          <button className="button button-primary icon-action-button" type="button" onClick={() => onMarcarPago(lancamento)} title="Marcar como pago" aria-label="Marcar como pago">
            <CheckCircle2 size={14} />
          </button>
        ) : null}
        {lancamento.status !== 'cancelado' ? (
          <button className="button button-danger icon-action-button" type="button" onClick={() => onCancelar(lancamento)} title="Cancelar" aria-label="Cancelar lançamento">
            <Ban size={14} />
          </button>
        ) : null}
        <button className="button button-secondary icon-action-button" type="button" onClick={() => onExcluir(lancamento)} title="Excluir" aria-label="Excluir lançamento">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}
