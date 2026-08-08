import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buscarUnidadePorId } from '../services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { formatarMoeda, formatarData } from '../../patrimonios/utils/patrimonioUtils.js'
import { listarContratosPorUnidade } from '../../contratos/services/contratoService.js'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import Tabs from '../../patrimonios/components/Tabs.jsx'

const tabItems = [
  { id: 'dados', label: 'Dados' },
  { id: 'historico', label: 'Histórico de locação' },
]

export default function UnidadeViewPage() {
  const { unidadeId } = useParams()
  const navigate = useNavigate()
  const unidade = buscarUnidadePorId(unidadeId)
  const [activeTab, setActiveTab] = useState('dados')

  // Ordenado do mais recente para o mais antigo (por data de início do
  // contrato). O histórico completo já existia nos dados (contratos
  // encerrados nunca são apagados) — faltava só aparecer nesta tela.
  const contratos = useMemo(() => {
    if (!unidadeId) return []
    return [...listarContratosPorUnidade(unidadeId)].sort((a, b) => (b.dataInicio || '').localeCompare(a.dataInicio || ''))
  }, [unidadeId])

  const contratoAtual = contratos.find((item) => item.situacao === 'Ativo') || null
  const locatarioAtual = contratoAtual ? buscarLocatarioPorId(contratoAtual.locatarioId) : null

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
          <p>
            {locatarioAtual
              ? `Inquilino atual: ${locatarioAtual.nomeCompleto}`
              : 'Sem inquilino atual.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="button button-secondary" to={`/auditoria?modulo=Unidades&registroId=${unidade.id}`}>
            Ver histórico de alterações
          </Link>
          <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>

      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'dados' && (
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
            <h2>Locatário</h2>
            {locatarioAtual ? (
              <>
                <dl>
                  <dt>Inquilino atual</dt>
                  <dd><Link to={`/locatarios/${locatarioAtual.id}`}>{locatarioAtual.nomeCompleto}</Link></dd>
                  <dt>Contrato</dt>
                  <dd><Link to={`/contratos/${contratoAtual.id}`}>{contratoAtual.codigoInterno || 'Ver contrato'}</Link></dd>
                </dl>
                <p className="page-subtitle" style={{ marginTop: 8 }}>
                  Veja o histórico completo de inquilinos na aba "Histórico de locação".
                </p>
              </>
            ) : (
              <>
                <p>Esta unidade está sem inquilino/contrato ativo no momento.</p>
                <Link className="button button-primary" to={`/contratos/novo?unidadeId=${unidade.id}`} style={{ marginTop: 8, display: 'inline-flex' }}>
                  Vincular locatário (novo contrato)
                </Link>
              </>
            )}
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
      )}

      {activeTab === 'historico' && (
        <div className="table-wrapper">
          {contratos.length === 0 ? (
            <p>Esta unidade ainda não teve nenhum contrato/inquilino registrado.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Locatário</th>
                  <th>Código do contrato</th>
                  <th>Situação</th>
                  <th>Vigência</th>
                  <th>Valor do aluguel</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((contrato) => {
                  const locatario = buscarLocatarioPorId(contrato.locatarioId)
                  return (
                    <tr key={contrato.id}>
                      <td>
                        <Link to={`/locatarios/${contrato.locatarioId}`}>
                          {locatario?.nomeCompleto || 'Locatário não encontrado'}
                        </Link>
                        {contrato.situacao === 'Ativo' ? ' (atual)' : ''}
                      </td>
                      <td>{contrato.codigoInterno || '-'}</td>
                      <td>{contrato.situacao}</td>
                      <td>{formatarData(contrato.dataInicio) || '-'} até {contrato.dataFim ? formatarData(contrato.dataFim) : 'sem fim'}</td>
                      <td>{formatarMoeda(contrato.valorAluguel)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
