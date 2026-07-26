import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import LancamentoForm from '../components/LancamentoForm.jsx'
import { buscarLancamentoPorId, criarLancamento, atualizarLancamento } from '../services/financeiroService.js'

export default function LancamentoFormPage() {
  const { id, tipo } = useParams()
  const navigate = useNavigate()
  const [lancamento, setLancamento] = useState(null)

  useEffect(() => {
    if (id) {
      const found = buscarLancamentoPorId(id)
      if (!found) {
        navigate('/financeiro/lancamentos', { replace: true })
        return
      }
      setLancamento(found)
    }
  }, [id, navigate])

  const handleSave = (dados) => {
    if (id) {
      atualizarLancamento(id, dados)
      navigate(`/financeiro/${id}`)
      return
    }

    const created = criarLancamento(dados)
    navigate(`/financeiro/${created.id}`)
  }

  const initialData = lancamento || (tipo ? { ...dadosBase(tipo) } : null)

  function dadosBase(tipo) {
    return {
      ...{
        tipo: tipo === 'despesa' ? 'despesa' : 'receita',
        categoria: '',
        subcategoria: null,
        descricao: '',
        valor: '',
        dataCompetencia: '',
        dataVencimento: '',
        dataPagamento: '',
        status: 'pendente',
        patrimonioId: '',
        unidadeId: '',
        contratoId: null,
        locatarioId: null,
        observacoes: '',
      },
    }
  }

  if (id && !lancamento) {
    return <div className="page-center">Carregando...</div>
  }

  return (
    <LancamentoForm
      initialData={initialData}
      onSave={handleSave}
      submitLabel={id ? 'Atualizar lançamento' : 'Salvar lançamento'}
    />
  )
}
