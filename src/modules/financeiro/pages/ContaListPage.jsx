import React, { useEffect, useState } from 'react'
import Modal from '../../../components/Modal.jsx'
import { listarContas, criarConta, atualizarConta, excluirConta, inicializarContas, calcularSaldo } from '../services/contaService.js'

export default function ContaListPage() {
  const [contas, setContas] = useState([])
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('conta_corrente')

  useEffect(() => {
    inicializarContas()
    setContas(listarContas())
  }, [])

  const handleCriar = () => {
    if (!nome.trim()) return
    criarConta({ nome, tipo })
    setContas(listarContas())
    setNome('')
  }

  const handleToggle = (conta) => {
    atualizarConta(conta.id, { ativa: !conta.ativa })
    setContas(listarContas())
  }

  const handleEditar = (conta) => {
    setEditAccount(conta)
    setEditName(conta.nome)
    setEditOpen(true)
  }

  const [editOpen, setEditOpen] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [editName, setEditName] = useState('')

  function handleSaveEdit() {
    if (!editName || !editAccount) return
    atualizarConta(editAccount.id, { nome: editName })
    setContas(listarContas())
    setEditOpen(false)
    setEditAccount(null)
    setEditName('')
  }

  const handleExcluir = (conta) => {
    if (!confirm(`Confirma excluir a conta "${conta.nome}"? Isso não é reversível.`)) return
    const ok = excluirConta(conta.id)
    if (!ok) return alert('Não é possível excluir conta que possui movimentos no Livro Caixa.')
    setContas(listarContas())
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Gerencie as contas financeiras.</p>
          <h1>Contas Financeiras</h1>
        </div>
      </div>

      <div className="form-section">
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da conta" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="conta_corrente">Conta Corrente</option>
            <option value="investimento">Investimento</option>
            <option value="caucao">Caução</option>
            <option value="caixa">Caixa</option>
          </select>
          <button className="button button-primary" type="button" onClick={handleCriar}>Criar conta</button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Ativa</th>
              <th>Saldo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.tipo}</td>
                <td>{c.ativa ? 'Sim' : 'Não'}</td>
                <td>{formatarSaldo(c.id)}</td>
                <td className="table-actions">
                  <button className="button button-secondary" onClick={() => handleEditar(c)}>Editar</button>
                  <button className="button button-secondary" onClick={() => handleToggle(c)}>{c.ativa ? 'Desativar' : 'Ativar'}</button>
                  <button className="button button-danger" onClick={() => handleExcluir(c)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editOpen && (
        <Modal open={editOpen} title={`Editar conta ${editAccount?.nome || ''}`} onClose={() => setEditOpen(false)}>
          <div>
            <label>Novo nome</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="button button-primary" onClick={() => handleSaveEdit()}>Salvar</button>
              <button className="button" onClick={() => setEditOpen(false)}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )

  function formatarSaldo(id) {
    try {
      const s = calcularSaldo(id)
      return s.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    } catch {
      return 'R$ 0,00'
    }
  }
}
