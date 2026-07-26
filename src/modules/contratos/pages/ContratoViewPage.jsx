import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buscarContratoPorId } from '../services/contratoService.js'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { formatarMoeda } from '../../patrimonios/utils/patrimonioUtils.js'

export default function ContratoViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contrato = buscarContratoPorId(id)

  if (!contrato) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Contrato não encontrado</h1>
        </div>
        <p>O contrato solicitado não foi localizado.</p>
      </div>
    )
  }

  const locatario = buscarLocatarioPorId(contrato.locatarioId)
  const unidade = buscarUnidadePorId(contrato.unidadeId)
  const patrimonio = buscarPatrimonioPorId(contrato.patrimonioId)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Detalhes do contrato.</p>
          <h1>{contrato.codigoInterno}</h1>
          <p>{contrato.situacao}</p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>

      <div className="summary-details">
        <div className="summary-card">
          <h2>Identificação</h2>
          <dl>
            <dt>Código interno</dt><dd>{contrato.codigoInterno}</dd>
            <dt>Situação</dt><dd>{contrato.situacao}</dd>
            <dt>Criado em</dt><dd>{contrato.createdAt}</dd>
            <dt>Atualizado em</dt><dd>{contrato.updatedAt}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Partes</h2>
          <dl>
            <dt>Locatário</dt><dd>{locatario?.nomeCompleto || 'Não informado'}</dd>
            <dt>Unidade</dt><dd>{unidade?.nome || 'Não informado'}</dd>
            <dt>Patrimônio</dt><dd>{patrimonio?.nome || 'Não informado'}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Vigência</h2>
          <dl>
            <dt>Data de início</dt><dd>{contrato.dataInicio || 'Não informado'}</dd>
            <dt>Data de fim</dt><dd>{contrato.dataFim || 'Não informado'}</dd>
            <dt>Dia de vencimento</dt><dd>{contrato.diaVencimento || 'Não informado'}</dd>
            <dt>Prazo (meses)</dt><dd>{contrato.prazoMeses || 'Não informado'}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Valores</h2>
          <dl>
            <dt>Aluguel</dt><dd>{formatarMoeda(contrato.valorAluguel || 0)}</dd>
            <dt>Condomínio</dt><dd>{formatarMoeda(contrato.valorCondominio || 0)}</dd>
            <dt>Caução</dt><dd>{formatarMoeda(contrato.valorCaucao || 0)}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Reajuste</h2>
          <dl>
            <dt>Tipo</dt><dd>{contrato.reajusteTipo}</dd>
            <dt>Índice</dt><dd>{contrato.indiceReajuste}</dd>
            <dt>Data base</dt><dd>{contrato.dataBaseReajuste || 'Não informado'}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Observações</h2>
          <p>{contrato.observacoes || 'Sem observações.'}</p>
        </div>
      </div>
    </div>
  )
}
