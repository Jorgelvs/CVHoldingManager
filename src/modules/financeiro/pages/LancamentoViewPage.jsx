import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { buscarLancamentoPorId } from '../services/financeiroService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { formatarMoeda, getStatusEfetivo } from '../utils/financeiroUtils.js'

export default function LancamentoViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lancamento, setLancamento] = useState(null)

  useEffect(() => {
    const found = buscarLancamentoPorId(id)
    if (!found) {
      navigate('/financeiro/lancamentos', { replace: true })
      return
    }
    setLancamento(found)
  }, [id, navigate])

  if (!lancamento) {
    return <div className="page-center">Carregando...</div>
  }

  const patrimonio = buscarPatrimonioPorId(lancamento.patrimonioId)
  const unidade = buscarUnidadePorId(lancamento.unidadeId)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Detalhes do lançamento financeiro.</p>
          <h1>{lancamento.descricao}</h1>
        </div>
        <div className="details-actions">
          <Link className="button button-secondary" to={`/financeiro/${lancamento.id}/editar`}>Editar</Link>
          <button type="button" className="button button-secondary" onClick={() => navigate(-1)}>Voltar</button>
        </div>
      </div>
      <div className="summary-details">
        <dl>
          <dt>Natureza</dt>
          <dd>{lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}</dd>
          <dt>Categoria</dt>
          <dd>{lancamento.categoria}</dd>
          <dt>Subcategoria</dt>
          <dd>{lancamento.subcategoria || '-'}</dd>
          <dt>Valor</dt>
          <dd>{formatarMoeda(lancamento.valor)}</dd>
          <dt>Competência</dt>
          <dd>{lancamento.dataCompetencia}</dd>
          <dt>Vencimento</dt>
          <dd>{lancamento.dataVencimento || '-'}</dd>
          <dt>Pagamento</dt>
          <dd>{lancamento.dataPagamento || '-'}</dd>
          <dt>Status</dt>
          <dd>{getStatusEfetivo(lancamento)}</dd>
          <dt>Patrimônio</dt>
          <dd>{patrimonio?.nome || 'N/A'}</dd>
          <dt>Unidade</dt>
          <dd>{unidade?.nome || '-'}</dd>
          <dt>Contrato</dt>
          <dd>{lancamento.contratoId || '-'}</dd>
          <dt>Locatário</dt>
          <dd>{lancamento.locatarioId || '-'}</dd>
          <dt>Observações</dt>
          <dd>{lancamento.observacoes || '-'}</dd>
          <dt>Criado em</dt>
          <dd>{lancamento.criadoEm}</dd>
          <dt>Atualizado em</dt>
          <dd>{lancamento.atualizadoEm}</dd>
        </dl>
      </div>
    </div>
  )
}
