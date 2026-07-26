import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import UnidadeForm from '../components/UnidadeForm.jsx'
import {
  criarUnidade,
  atualizarUnidade,
  buscarUnidadePorId,
} from '../services/unidadeService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { tiposUnidade, finalidadesUnidade, situacoesUnidade } from '../constants/unidadeConstants.js'

export default function UnidadeFormPage() {
  const { id, patrimonioId } = useParams()
  const navigate = useNavigate()
  const [unidade, setUnidade] = useState(null)
  const [patrimonios, setPatrimonios] = useState([])
  const [initialData, setInitialData] = useState(null)

  useEffect(() => {
    const patrimoniosList = listarPatrimonios()
    setPatrimonios(patrimoniosList)

    if (id) {
      const found = buscarUnidadePorId(id)
      if (!found) {
        navigate('/patrimonios', { replace: true })
        return
      }
      setUnidade(found)
      setInitialData(null)
      return
    }

    if (patrimonioId) {
      setInitialData({ patrimonioId })
    } else {
      setInitialData(null)
    }
  }, [id, patrimonioId, navigate])

  const handleSave = (data) => {
    if (id) {
      const updated = atualizarUnidade(id, data)
      if (updated) {
        navigate(`/unidades/${id}`)
      }
      return
    }
    const created = criarUnidade(data)
    navigate(`/unidades/${created.id}`)
  }

  return (
    <div className="page-content">
      <UnidadeForm
        initialData={unidade || initialData}
        patrimonios={patrimonios}
        headerLabel={id ? 'Editar unidade' : 'Nova unidade'}
        onSave={handleSave}
        options={{
          tipos: tiposUnidade,
          finalidades: finalidadesUnidade,
          situacoes: situacoesUnidade,
        }}
      />
    </div>
  )
}
