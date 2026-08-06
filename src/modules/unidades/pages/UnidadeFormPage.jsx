import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import UnidadeForm from '../components/UnidadeForm.jsx'
import {
  criarUnidade,
  atualizarUnidade,
  buscarUnidadePorId,
} from '../services/unidadeService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { tiposUnidade, finalidadesUnidade, situacoesUnidade } from '../constants/unidadeConstants.js'
import { waitForRepositoryFlush } from '../../../utils/localRepository.js'

export default function UnidadeFormPage() {
  const { unidadeId, patrimonioId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [unidade, setUnidade] = useState(null)
  const [patrimonios, setPatrimonios] = useState([])
  const [initialData, setInitialData] = useState(null)
  const [originPatrimonioId, setOriginPatrimonioId] = useState('')
  const [assistMode, setAssistMode] = useState(Boolean(location.state?.assistFirstUnit))
  const [lockPatrimonio, setLockPatrimonio] = useState(Boolean(location.state?.lockPatrimonio || location.state?.assistFirstUnit))
  const [simplified, setSimplified] = useState(Boolean(location.state?.simplified || location.state?.assistFirstUnit))

  useEffect(() => {
    const patrimoniosList = listarPatrimonios()
    setPatrimonios(patrimoniosList)

    if (unidadeId) {
      const found = buscarUnidadePorId(unidadeId)
      if (!found) {
        navigate('/patrimonios', { replace: true })
        return
      }
      setUnidade(found)
      setInitialData(null)
      setAssistMode(false)
      setLockPatrimonio(false)
      setSimplified(false)
      setOriginPatrimonioId(location.state?.patrimonioId || location.state?.returnToPatrimonioId || '')
      return
    }

    const patrimonioIdContexto = patrimonioId || location.state?.patrimonioId || ''
    const assistido = Boolean(location.state?.assistFirstUnit)
    const sugestoes = location.state?.suggestedUnidade || {}
    const bloquearPatrimonio = Boolean(location.state?.lockPatrimonio || assistido)
    const simplificado = Boolean(location.state?.simplified || assistido)

    setAssistMode(assistido)
    setLockPatrimonio(bloquearPatrimonio)
    setSimplified(simplificado)

    if (patrimonioIdContexto) {
      setInitialData({
        patrimonioId: patrimonioIdContexto,
        ...sugestoes,
      })
      setOriginPatrimonioId(location.state?.returnToPatrimonioId || patrimonioIdContexto)
    } else {
      setInitialData(null)
      setOriginPatrimonioId('')
    }
  }, [unidadeId, patrimonioId, location.state, navigate])

  const getReturnPath = () => {
    if (originPatrimonioId) {
      if (assistMode) {
        return `/patrimonios/${originPatrimonioId}`
      }
      return `/patrimonios/${originPatrimonioId}/unidades`
    }
    return '/unidades'
  }

  const handleSave = async (data) => {
    if (unidadeId) {
      const updated = atualizarUnidade(unidadeId, data)
      if (updated) {
        await waitForRepositoryFlush()
        navigate(getReturnPath(), { replace: true })
      }
      return
    }
    const created = criarUnidade(data)
    if (created) {
      await waitForRepositoryFlush()
      const returnPath = getReturnPath()
      if (assistMode && originPatrimonioId) {
        navigate(returnPath, {
          replace: true,
          state: { message: 'Primeira unidade criada com sucesso.' },
        })
        return
      }
      navigate(returnPath, { replace: true })
    }
  }

  const handleCancel = () => {
    navigate(getReturnPath(), { replace: true })
  }

  return (
    <div className="page-content">
      <UnidadeForm
        initialData={unidade || initialData}
        patrimonios={patrimonios}
        headerLabel={unidadeId ? 'Editar unidade' : (assistMode ? 'Criar primeira unidade' : 'Nova unidade')}
        submitLabel={unidadeId ? 'Salvar alterações' : 'Salvar unidade'}
        onSave={handleSave}
        onCancel={assistMode ? handleCancel : undefined}
        lockPatrimonio={lockPatrimonio}
        simplified={simplified}
        options={{
          tipos: tiposUnidade,
          finalidades: finalidadesUnidade,
          situacoes: situacoesUnidade,
        }}
      />
    </div>
  )
}
