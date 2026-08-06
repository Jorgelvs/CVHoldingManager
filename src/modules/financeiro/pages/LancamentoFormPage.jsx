import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LancamentoForm from '../components/LancamentoForm.jsx'
import { buscarLancamentoPorId, criarLancamento, atualizarLancamento } from '../services/financeiroService.js'

export default function LancamentoFormPage() {
  const { id, tipo } = useParams()
  const location = useLocation()
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

  const universalState = location.state?.universalEntry

  const initialData = useMemo(() => {
    if (lancamento) return lancamento
    if (universalState) {
      return {
        tipo: universalState.tipo || 'receita',
        categoria: universalState.categoria || '',
        subcategoria: universalState.subcategoria || null,
        subcategoriaId: universalState.subcategoriaId || '',
        subcategoriaLabel: universalState.subcategoriaLabel || universalState.subcategoria || '',
        descricao: universalState.descricao || '',
        valor: universalState.valor || '',
        dataCompetencia: universalState.dataCompetencia || '',
        dataVencimento: '',
        dataPagamento: universalState.dataPagamento || '',
        status: universalState.status || 'pendente',
        patrimonioId: universalState.patrimonioId || '',
        unidadeId: universalState.unidadeId || '',
        patrimonioLabel: universalState.patrimonioLabel || '',
        unidadeLabel: universalState.unidadeLabel || '',
        contratoId: null,
        locatarioId: null,
        contaFinanceiraId: universalState.contaId || '',
        observacoes: universalState.observacoes || '',
      }
    }
    return tipo ? { ...dadosBase(tipo) } : null
  }, [lancamento, universalState, tipo])

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
        contaFinanceiraId: '',
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
