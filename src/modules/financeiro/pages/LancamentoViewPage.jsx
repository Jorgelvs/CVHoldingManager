import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { buscarLancamentoPorId } from '../services/financeiroService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { formatarMoeda, getStatusEfetivo } from '../utils/financeiroUtils.js'
import { listarBaixas, estornarBaixa } from '../services/baixaService.js'
import Modal from '../../../components/Modal.jsx'

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
  const [baixas, setBaixas] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toEstornar, setToEstornar] = useState(null)

  useEffect(() => {
    const b = listarBaixas().filter(x => x.lancamentoId === id)
    setBaixas(b)
  }, [id])

  function refreshBaixas() {
    setBaixas(listarBaixas().filter(x => x.lancamentoId === id))
  }

  function handleConfirmEstorno() {
    if (!toEstornar) return
    const res = estornarBaixa(toEstornar.id, 'Estorno via interface')
    if (res && res.error) {
      alert(res.error)
    } else {
      refreshBaixas()
      // refresh lancamento data
      const updated = buscarLancamentoPorId(id)
      setLancamento(updated)
      setConfirmOpen(false)
    }
  }

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

        <div className="summary-card">
          <h2>Histórico de baixas</h2>
          {baixas.length === 0 ? <p>Nenhuma baixa registrada.</p> : (
            <table className="data-table">
              <thead>
                <tr><th>Data</th><th>Valor</th><th>Juros</th><th>Desconto</th><th>Movimentado</th><th>Conta</th><th>Situação</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {baixas.map(b => (
                  <tr key={b.id} style={{ opacity: b.estornado ? 0.6 : 1 }}>
                    <td>{b.data}</td>
                    <td>{formatarMoeda(b.valorPrincipal)}</td>
                    <td>{formatarMoeda(b.juros)}</td>
                    <td>{formatarMoeda(b.desconto)}</td>
                    <td>{formatarMoeda(b.valorMovimentado)}</td>
                    <td>{b.contaFinanceiraId}</td>
                    <td>{b.estornado ? 'Estornada' : 'Ativa'}</td>
                    <td>
                      {!b.estornado && <button className="button button-danger" onClick={() => { setToEstornar(b); setConfirmOpen(true) }}>Estornar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal open={confirmOpen} title="Confirmar estorno" onClose={() => setConfirmOpen(false)}>
          <div>
            <p>Confirma o estorno desta baixa? Isso gerará um movimento inverso no Livro Caixa e marcará a baixa como estornada.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button button-danger" onClick={() => handleConfirmEstorno()}>Confirmar estorno</button>
              <button className="button" onClick={() => setConfirmOpen(false)}>Cancelar</button>
            </div>
          </div>
        </Modal>
    </div>
  )
}
