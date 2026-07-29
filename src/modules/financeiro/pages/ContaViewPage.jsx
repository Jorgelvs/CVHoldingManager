import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buscarContaPorId, calcularSaldo, listarExtratoConta, formatarTipoConta } from '../services/contaService.js'
import { formatarMoeda } from '../utils/financeiroUtils.js'

export default function ContaViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [conta, setConta] = useState(null)

  useEffect(() => {
    const found = buscarContaPorId(id)
    if (!found) {
      navigate('/financeiro/contas', { replace: true })
      return
    }
    setConta(found)
  }, [id, navigate])

  const extrato = useMemo(() => (conta ? listarExtratoConta(conta.id) : []), [conta])

  if (!conta) return <div className="page-center">Carregando...</div>

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Detalhes da conta financeira.</p>
          <h1>{conta.nome}</h1>
        </div>
        <div className="details-actions">
          <Link className="button button-secondary" to={`/financeiro/contas/${conta.id}/editar`}>Editar</Link>
          <button type="button" className="button button-secondary" onClick={() => navigate('/financeiro/contas')}>Voltar</button>
        </div>
      </div>

      <div className="summary-card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div><strong>Tipo</strong><div>{formatarTipoConta(conta.tipo)}</div></div>
          <div><strong>Banco</strong><div>{conta.banco || '-'}</div></div>
          <div><strong>Agência</strong><div>{conta.agencia || '-'}</div></div>
          <div><strong>Número da conta</strong><div>{conta.numeroConta || '-'}</div></div>
          <div><strong>Situação</strong><div>{conta.ativa ? 'Ativa' : 'Inativa'}</div></div>
          <div><strong>Saldo inicial</strong><div>{formatarMoeda(conta.saldoInicial || 0)}</div></div>
          <div><strong>Saldo atual</strong><div>{formatarMoeda(calcularSaldo(conta.id))}</div></div>
          <div><strong>Observações</strong><div>{conta.observacoes || '-'}</div></div>
        </div>
      </div>

      <div className="summary-card">
        <h2>Extrato da conta</h2>
        {extrato.length === 0 ? <p>Nenhum movimento registrado.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Natureza</th>
                  <th>Valor</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {extrato.map((item) => (
                  <tr key={item.id}>
                    <td>{item.data}</td>
                    <td>{item.descricao}</td>
                    <td>{item.tipo === 'movimento' ? (item.natureza === 'entrada' ? 'Entrada' : 'Saída') : 'Saldo inicial'}</td>
                    <td>{formatarMoeda(item.tipo === 'movimento' ? item.valor : item.valor)}</td>
                    <td>{formatarMoeda(item.saldoAtual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
