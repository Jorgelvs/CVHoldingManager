import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LancamentoForm from '../components/LancamentoForm.jsx'
import { buscarLancamentoPorId, criarLancamento, atualizarLancamento } from '../services/financeiroService.js'
import { waitForRepositoryFlush, getRepositoryRuntimeState, clearRepositoryErrorFlag } from '../../../utils/localRepository.js'

// A gravação real no Supabase acontece em segundo plano (fire-and-forget);
// sem esperar e checar o resultado aqui, a tela navegava como se tivesse
// salvo mesmo quando a gravação falhava (ex.: CONFLICT_DETECTED por causa
// de outra aba/sessão aberta), dando a impressão de "não está salvando"
// sem nenhum aviso — e em alguns casos, dependendo da tela seguinte, com
// uma renderização quebrada logo em seguida.
//
// clearRepositoryErrorFlag() é chamado antes de gravar porque o
// sinalizador de erro é global: sem limpar antes, um conflito antigo de
// QUALQUER gravação anterior na sessão continuava sendo reportado como
// falha em salvamentos novos que, na prática, deram certo.
async function confirmarGravacao() {
  await waitForRepositoryFlush()
  const state = getRepositoryRuntimeState()
  if (state.mode === 'supabase' && state.error) {
    return `Falha ao confirmar a gravação (${state.error}). Clique em "Tentar novamente" no aviso do topo da página e salve de novo.`
  }
  return null
}

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

  const handleSave = async (dados) => {
    clearRepositoryErrorFlag()

    if (id) {
      atualizarLancamento(id, dados)
      const erro = await confirmarGravacao()
      if (erro) return { error: erro }
      navigate(`/financeiro/${id}`)
      return null
    }

    const created = criarLancamento(dados)
    const erro = await confirmarGravacao()
    if (erro) return { error: erro }
    // Sinaliza que a tela de resumo foi aberta logo apos um cadastro novo
    // (mesmo padrao aplicado em Contratos): o botao "Voltar" nessa tela
    // usava o historico do navegador e caia de volta no formulario recem-
    // preenchido, exigindo dois cliques para chegar a um lancamento novo.
    navigate(`/financeiro/${created.id}`, { state: { justCreated: true } })
    return null
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
