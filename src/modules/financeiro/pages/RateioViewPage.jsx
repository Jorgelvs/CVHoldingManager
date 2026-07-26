import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { buscarRateioPorId } from '../services/rateioService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidadesPorPatrimonio } from '../../unidades/services/unidadeService.js'
import { formatarMoeda } from '../utils/financeiroUtils.js'

export default function RateioViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rateio, setRateio] = useState(null)

  useEffect(() => {
    const found = buscarRateioPorId(id)
    if (!found) {
      navigate('/financeiro/rateios', { replace: true })
      return
    }
    setRateio(found)
  }, [id, navigate])

  const patrimonio = useMemo(() => listarPatrimonios().find((item) => item.id === rateio?.patrimonioId), [rateio])
  const unidades = useMemo(() => (rateio ? listarUnidadesPorPatrimonio(rateio.patrimonioId) : []), [rateio])

  if (!rateio) {
    return <div className="page-center">Carregando...</div>
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Detalhes do rateio gerado.</p>
          <h1>{rateio.descricao}</h1>
        </div>
        <div className="details-actions">
          <Link className="button button-secondary" to="/financeiro/rateios">Voltar</Link>
          <Link className="button button-secondary" to={`/financeiro/rateios/${rateio.id}/editar`}>Editar</Link>
        </div>
      </div>

      <div className="summary-details">
        <dl>
          <dt>Patrimônio</dt>
          <dd>{patrimonio?.nome || 'N/A'}</dd>
          <dt>Competência</dt>
          <dd>{rateio.competencia}</dd>
          <dt>Categoria</dt>
          <dd>{rateio.categoria}</dd>
          <dt>Subcategoria</dt>
          <dd>{rateio.subcategoria || '-'}</dd>
          <dt>Valor total</dt>
          <dd>{formatarMoeda(rateio.valorTotal)}</dd>
          <dt>Método de rateio</dt>
          <dd>{rateio.metodoRateio}</dd>
          <dt>Critério de elegibilidade</dt>
          <dd>{rateio.criterioElegibilidade}</dd>
          <dt>Status</dt>
          <dd>{rateio.status}</dd>
          <dt>Unidades elegíveis</dt>
          <dd>{rateio.quantidadeUnidades}</dd>
          <dt>Valor base por unidade</dt>
          <dd>{formatarMoeda(rateio.valorBasePorUnidade)}</dd>
          <dt>Diferença de arredondamento</dt>
          <dd>{formatarMoeda(rateio.diferencaArredondamento)}</dd>
          <dt>Observações</dt>
          <dd>{rateio.observacoes || '-'}</dd>
          <dt>Criado em</dt>
          <dd>{rateio.criadoEm}</dd>
          <dt>Atualizado em</dt>
          <dd>{rateio.atualizadoEm}</dd>
          <dt>Processado em</dt>
          <dd>{rateio.processadoEm || '-'}</dd>
          <dt>Cancelado em</dt>
          <dd>{rateio.canceladoEm || '-'}</dd>
        </dl>
      </div>
    </div>
  )
}
