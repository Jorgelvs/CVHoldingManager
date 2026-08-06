import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buscarUnidadePorId } from '../services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { formatarMoeda, formatarData } from '../../patrimonios/utils/patrimonioUtils.js'

export default function UnidadeViewPage() {
  const { unidadeId } = useParams()
  const navigate = useNavigate()
  const unidade = buscarUnidadePorId(unidadeId)

  if (!unidade) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Unidade não encontrada</h1>
        </div>
        <p>A unidade solicitada não foi localizada.</p>
      </div>
    )
  }

  const patrimonio = buscarPatrimonioPorId(unidade.patrimonioId)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Detalhes da unidade cadastrada</p>
          <h1>{unidade.nome}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="button button-secondary" to={`/auditoria?modulo=Unidades&registroId=${unidade.id}`}>
            Ver histórico
          </Link>
          <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>

      <div className="summary-details">
        <div className="summary-card">
          <h2>Dados principais</h2>
          <dl>
            <dt>Nome</dt><dd>{unidade.nome || 'Não informado'}</dd>
            <dt>Código interno</dt><dd>{unidade.codigoInterno || 'Não informado'}</dd>
            <dt>Patrimônio</dt><dd>{patrimonio?.nome || 'Não informado'}</dd>
            <dt>Tipo</dt><dd>{unidade.tipo || 'Não informado'}</dd>
            <dt>Finalidade</dt><dd>{unidade.finalidade || 'Não informado'}</dd>
            <dt>Situação</dt><dd>{unidade.situacao || 'Não informado'}</dd>
          </dl>
        </div>
        <div className="summary-card">
          <h2>Medidas</h2>
          <dl>
            <dt>Área útil</dt><dd>{unidade.areaUtil !== '' ? `${unidade.areaUtil} m²` : 'Não informado'}</dd>
            <dt>Área total</dt><dd>{unidade.areaTotal !== '' ? `${unidade.areaTotal} m²` : 'Não informado'}</dd>
          </dl>
        </div>
        <div className="summary-card">
          <h2>Observações</h2>
          <p>{unidade.observacoes || 'Não informado'}</p>
        </div>
      </div>
    </div>
  )
}
