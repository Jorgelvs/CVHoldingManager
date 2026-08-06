import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { buscarLancamentoPorId } from '../services/financeiroService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { buscarContaPorId } from '../services/contaService.js'
import { formatarMoeda, getStatusEfetivo, getDataConsiderada } from '../utils/financeiroUtils.js'
import { listarBaixas, estornarBaixa } from '../services/baixaService.js'
import Modal from '../../../components/Modal.jsx'

export default function LancamentoViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lancamento, setLancamento] = useState(null)
  const [baixas, setBaixas] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toEstornar, setToEstornar] = useState(null)

  useEffect(() => {
    const found = buscarLancamentoPorId(id)
    if (!found) {
      navigate('/financeiro/lancamentos', { replace: true })
      return
    }
    setLancamento(found)
  }, [id, navigate])

  useEffect(() => {
    if (!id) return
    const b = listarBaixas().filter((x) => x.lancamentoId === id)
    setBaixas(b)
  }, [id])

  if (!lancamento) {
    return <div className="page-center">Carregando...</div>
  }

  const patrimonio = buscarPatrimonioPorId(lancamento.patrimonioId)
  const unidade = buscarUnidadePorId(lancamento.unidadeId)
  const conta = buscarContaPorId(lancamento.contaFinanceiraId)

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

  const formatarData = (valor) => {
    if (!valor) return '-'
    const [ano, mes, dia] = valor.split('-')
    if (!ano || !mes || !dia) return valor
    return `${dia}/${mes}/${ano}`
  }

  const formatarCompetencia = (valor) => {
    if (!valor) return '-'
    const [ano, mes] = valor.split('-')
    if (!ano || !mes) return valor
    return `${mes}/${ano}`
  }

  const formatarStatus = (valor) => {
    if (!valor) return '-'
    return String(valor).charAt(0).toUpperCase() + String(valor).slice(1)
  }

  const formatarTipoManutencao = (valor) => {
    if (valor === 'area_comum') return 'Área comum / estrutura do patrimônio'
    if (valor === 'unidade_especifica') return 'Unidade específica'
    return '-'
  }

  return (
    <div className="page-content">
      <div className="page-header" style={{ alignItems: 'flex-end' }}>
        <div>
          <p className="page-subtitle">Detalhes do lançamento financeiro.</p>
          <h1 style={{ fontSize: 28, margin: '8px 0 0', lineHeight: 1.2 }}>Detalhes do lançamento</h1>
        </div>
        <div className="details-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="button button-secondary" to={`/auditoria?modulo=Financeiro&registroId=${lancamento.id}`}>Histórico</Link>
          <Link className="button button-secondary" to={`/financeiro/${lancamento.id}/editar`}>Editar</Link>
          <button type="button" className="button button-secondary" onClick={() => navigate(-1)}>Voltar</button>
        </div>
      </div>

      <div className="summary-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <p className="page-subtitle" style={{ marginBottom: 6 }}>Descrição</p>
            <h2 style={{ fontSize: 22, margin: 0, wordBreak: 'break-word' }}>{lancamento.descricao}</h2>
          </div>
          <div style={{ minWidth: 180, textAlign: 'right' }}>
            <p className="page-subtitle" style={{ marginBottom: 6 }}>Valor</p>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#aa3bff' }}>{formatarMoeda(lancamento.valor)}</div>
          </div>
        </div>

        <div className="summary-details" style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              ['Natureza', lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'],
              ['Categoria', lancamento.categoria],
              ['Subcategoria', lancamento.subcategoriaLabel || lancamento.subcategoria || '-'],
              ['Competência', formatarCompetencia(lancamento.dataCompetencia)],
              ['Vencimento', formatarData(lancamento.dataVencimento)],
              ['Pagamento', formatarData(lancamento.dataPagamento)],
              ['Data considerada', formatarData(getDataConsiderada(lancamento))],
              ['Status', formatarStatus(getStatusEfetivo(lancamento))],
              ['Patrimônio', patrimonio?.nome || lancamento.patrimonioLabel || 'N/A'],
              ['Tipo da manutenção', lancamento.categoria === 'Manutenção' && lancamento.tipo === 'despesa' ? formatarTipoManutencao(lancamento.tipoManutencao) : '-'],
              ['Unidade', unidade?.nome || lancamento.unidadeLabel || '-'],
              ['Conta financeira', conta?.nome || '-'],
              ['Contrato', lancamento.contratoId || '-'],
              ['Locatário', lancamento.locatarioId || '-'],
              ['Observações', lancamento.observacoes || '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '12px 14px', border: '1px solid #e5e4e7', borderRadius: 10, background: '#fbfbfd', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b6375', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, color: '#08060d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="summary-card">
        <h2>Histórico de baixas</h2>
        {baixas.length === 0 ? <p>Nenhuma baixa registrada.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 760 }}>
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
          </div>
        )}
      </div>

      <Modal open={confirmOpen} title="Confirmar estorno" onClose={() => setConfirmOpen(false)}>
        <div>
          <p>Confirma o estorno desta baixa? Isso gerará um movimento inverso no Livro Caixa e marcará a baixa como estornada.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="button button-danger" onClick={() => handleConfirmEstorno()}>Confirmar estorno</button>
            <button className="button" onClick={() => setConfirmOpen(false)}>Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
