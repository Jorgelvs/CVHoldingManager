import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listarContas, atualizarConta, excluirConta, inicializarContas, calcularSaldo, formatarTipoConta } from '../services/contaService.js'
import { formatarMoeda } from '../utils/financeiroUtils.js'
import ExportButtons from '../../reports/components/ExportButtons.jsx'
import { obterPreferenciasInterface } from '../../configuracoes/services/configuracaoService.js'

export default function ContaListPage() {
  const navigate = useNavigate()
  const [contas, setContas] = useState([])
  const itensPorPagina = Number(obterPreferenciasInterface()?.itensPorPagina || 20)

  useEffect(() => {
    inicializarContas()
    setContas(listarContas())
  }, [])

  const refresh = () => setContas(listarContas())
  const contasPaginadas = contas.slice(0, itensPorPagina)

  const handleToggle = (conta) => {
    atualizarConta(conta.id, { ativa: !conta.ativa })
    refresh()
  }

  const handleExcluir = (conta) => {
    if (!confirm(`Confirma excluir a conta "${conta.nome}"? Isso não é reversível.`)) return
    const ok = excluirConta(conta.id)
    if (!ok) return alert('Não é possível excluir conta que possui movimentos no Livro Caixa.')
    refresh()
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Gerencie as contas financeiras.</p>
          <h1>Contas Financeiras</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ExportButtons
            title="Contas Financeiras"
            filename="contas-financeiras"
            columns={[
              { key: 'nome', label: 'Nome' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'banco', label: 'Banco' },
              { key: 'saldo', label: 'Saldo', type: 'currency' },
              { key: 'situacao', label: 'Situação' },
            ]}
            rows={contas.map((conta) => ({
              ...conta,
              tipo: formatarTipoConta(conta.tipo),
              saldo: calcularSaldo(conta.id),
              situacao: conta.ativa ? 'Ativa' : 'Inativa',
            }))}
          />
          <button className="button button-primary" type="button" onClick={() => navigate('/financeiro/contas/novo')}>Nova conta</button>
        </div>
      </div>

      {contas.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhuma conta financeira cadastrada.</h2>
          <p>Cadastre a primeira conta para iniciar o controle de saldo e fluxo de caixa.</p>
          <button className="button button-primary" type="button" onClick={() => navigate('/financeiro/contas/novo')}>Cadastrar conta</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Banco</th>
                <th>Saldo</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contasPaginadas.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{formatarTipoConta(c.tipo)}</td>
                  <td>{c.banco || '-'}</td>
                  <td>{formatarMoeda(calcularSaldo(c.id))}</td>
                  <td>{c.ativa ? 'Ativa' : 'Inativa'}</td>
                  <td className="table-actions">
                    <Link className="button button-secondary" to={`/financeiro/contas/${c.id}`}>Visualizar</Link>
                    <Link className="button button-secondary" to={`/financeiro/contas/${c.id}/editar`}>Editar</Link>
                    <button className="button button-secondary" type="button" onClick={() => handleToggle(c)}>{c.ativa ? 'Desativar' : 'Ativar'}</button>
                    <button className="button button-danger" type="button" onClick={() => handleExcluir(c)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
