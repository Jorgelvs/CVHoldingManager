import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PatrimonioForm from '../components/PatrimonioForm.jsx'
import {
  criarPatrimonio,
  atualizarPatrimonio,
  buscarPatrimonioPorId,
} from '../services/patrimonioService.js'
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
  opcoesManutencao,
  opcoesRegraRateio,
} from '../constants/patrimonioConstants.js'

export default function PatrimonioFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patrimonio, setPatrimonio] = useState(null)

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

  const handleSave = (data) => {
    if (id) {
      const updated = atualizarPatrimonio(id, data)
      if (updated) {
        navigate(`/patrimonios/${id}`)
      }
      return
    }
    const created = criarPatrimonio(data)
    navigate(`/patrimonios/${created.id}`)
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
          manutencao: opcoesManutencao,
          regraRateio: opcoesRegraRateio,
        }}
      />
    </div>
  )
}
