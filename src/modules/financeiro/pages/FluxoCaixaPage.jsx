import React, { useMemo } from 'react'
import { listarContas, calcularSaldoGeralContas, calcularSaldo } from '../services/contaService.js'
import { listarLancamentos } from '../services/financeiroService.js'
import { formatarMoeda } from '../utils/financeiroUtils.js'
import ExportButtons from '../../reports/components/ExportButtons.jsx'

export default function FluxoCaixaPage() {
  const contas = useMemo(() => listarContas(), [])
  const lancamentos = useMemo(() => listarLancamentos(), [])

  const entradas = useMemo(() => lancamentos.filter((item) => item.tipo === 'receita' && item.status !== 'cancelado').reduce((s, item) => s + Number(item.valor || 0), 0), [lancamentos])
  const saidas = useMemo(() => lancamentos.filter((item) => item.tipo === 'despesa' && item.status !== 'cancelado').reduce((s, item) => s + Number(item.valor || 0), 0), [lancamentos])
  const saldoInicial = useMemo(() => contas.reduce((s, conta) => s + Number(conta.saldoInicial || 0), 0), [contas])
  const saldoAtual = useMemo(() => calcularSaldoGeralContas(), [contas])
  const saldoProjetado = saldoInicial + entradas - saidas

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Resumo financeiro consolidado.</p>
          <h1>Fluxo de Caixa</h1>
        </div>
        <ExportButtons
          title="Fluxo de Caixa"
          filename="fluxo-caixa"
          columns={[
            { key: 'nome', label: 'Conta' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'situacao', label: 'Situação' },
            { key: 'saldo', label: 'Saldo', type: 'currency' },
          ]}
          rows={contas.map((conta) => ({
            ...conta,
            saldo: calcularSaldo(conta.id),
            situacao: conta.ativa ? 'Ativa' : 'Inativa',
          }))}
        />
      </div>

      <div className="summary-card" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div><strong>Entradas</strong><div>{formatarMoeda(entradas)}</div></div>
        <div><strong>Saídas</strong><div>{formatarMoeda(saidas)}</div></div>
        <div><strong>Saldo inicial</strong><div>{formatarMoeda(saldoInicial)}</div></div>
        <div><strong>Saldo atual</strong><div>{formatarMoeda(saldoAtual)}</div></div>
        <div><strong>Saldo projetado</strong><div>{formatarMoeda(saldoProjetado)}</div></div>
      </div>

      <div className="summary-card">
        <h2>Contas</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 680 }}>
            <thead>
              <tr><th>Conta</th><th>Tipo</th><th>Situação</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {contas.map((conta) => (
                <tr key={conta.id}>
                  <td>{conta.nome}</td>
                  <td>{conta.tipo}</td>
                  <td>{conta.ativa ? 'Ativa' : 'Inativa'}</td>
                  <td>{formatarMoeda(calcularSaldo(conta.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
