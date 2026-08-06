import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PatrimonioForm from '../components/PatrimonioForm.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import {
  criarPatrimonio,
  atualizarPatrimonio,
  buscarPatrimonioPorId,
} from '../services/patrimonioService.js'
import { waitForRepositoryFlush } from '../../../utils/localRepository.js'
import {
  buildFirstUnitSuggestion,
  isSingleUnitAssistantEligible,
} from '../../unidades/utils/firstUnitAssistant.js'
import {
  gruposPatrimoniais,
  tiposPatrimonio,
  finalidadesPatrimonio,
  modelosReceita,
  situacoesPatrimonio,
  situacoesRegistralPatrimonio,
  opcoesAgua,
  opcoesEnergia,
  opcoesCondominio,
  opcoesIPTU,
  opcoesLimpeza,
  opcoesRegraRateio,
} from '../constants/patrimonioConstants.js'

export default function PatrimonioFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patrimonio, setPatrimonio] = useState(null)
  const [patrimonioCriado, setPatrimonioCriado] = useState(null)
  const [confirmarPrimeiraUnidade, setConfirmarPrimeiraUnidade] = useState(false)

  useEffect(() => {
    if (id) {
      const found = buscarPatrimonioPorId(id)
      if (!found) {
        navigate('/patrimonios', { replace: true })
        return
      }
      setPatrimonio(found)
    }
  }, [id, navigate])

  const handleSave = async (data) => {
    if (id) {
      const updated = atualizarPatrimonio(id, data)
      if (updated) {
        await waitForRepositoryFlush()
        navigate(`/patrimonios/${id}`)
      }
      return
    }

    const created = criarPatrimonio(data)
    await waitForRepositoryFlush()

    if (isSingleUnitAssistantEligible(created)) {
      setPatrimonioCriado(created)
      setConfirmarPrimeiraUnidade(true)
      return
    }

    navigate(`/patrimonios/${created.id}`)
  }

  const handleCriarPrimeiraUnidadeAgora = () => {
    if (!patrimonioCriado) {
      setConfirmarPrimeiraUnidade(false)
      return
    }

    const sugestoes = buildFirstUnitSuggestion(patrimonioCriado)
    setConfirmarPrimeiraUnidade(false)
    navigate('/unidades/nova', {
      state: {
        patrimonioId: patrimonioCriado.id,
        returnToPatrimonioId: patrimonioCriado.id,
        assistFirstUnit: true,
        lockPatrimonio: true,
        simplified: true,
        suggestedUnidade: sugestoes,
      },
    })
  }

  const handleCadastrarDepois = () => {
    const targetId = patrimonioCriado?.id
    setConfirmarPrimeiraUnidade(false)
    if (!targetId) {
      navigate('/patrimonios')
      return
    }
    navigate(`/patrimonios/${targetId}`)
  }

  return (
    <div className="page-content">
      <PatrimonioForm
        initialData={patrimonio}
        headerLabel={id ? 'Editar patrimônio' : 'Novo patrimônio'}
        onSave={handleSave}
        options={{
          grupos: gruposPatrimoniais,
          tipos: tiposPatrimonio,
          finalidades: finalidadesPatrimonio,
          modelos: modelosReceita,
          situacoes: situacoesPatrimonio,
        situacoesRegistral: situacoesRegistralPatrimonio,
          agua: opcoesAgua,
          energia: opcoesEnergia,
          condominio: opcoesCondominio,
          iptu: opcoesIPTU,
          limpeza: opcoesLimpeza,
          regraRateio: opcoesRegraRateio,
        }}
      />

      <ConfirmDialog
        open={confirmarPrimeiraUnidade}
        title="Primeira unidade"
        message="Este patrimônio possui apenas uma unidade?"
        confirmLabel="Sim, criar a unidade agora"
        cancelLabel="Não, cadastrar depois"
        onConfirm={handleCriarPrimeiraUnidadeAgora}
        onCancel={handleCadastrarDepois}
      />
    </div>
  )
}
