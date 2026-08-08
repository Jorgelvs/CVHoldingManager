import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ContratoForm from '../components/ContratoForm.jsx'
import { criarContrato, atualizarContrato, buscarContratoPorId } from '../services/contratoService.js'

export default function ContratoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetUnidadeId = searchParams.get('unidadeId') || ''
  const [contrato, setContrato] = useState(null)

  useEffect(() => {
    if (id) {
      const found = buscarContratoPorId(id)
      if (!found) {
        navigate('/contratos', { replace: true })
        return
      }
      setContrato(found)
    }
  }, [id, navigate])

  const handleSave = (data) => {
    if (id) {
      const updated = atualizarContrato(id, data)
      if (updated?.error) {
        return updated
      }
      if (updated) {
        navigate(`/contratos/${id}`)
      }
      return updated
    }

    const created = criarContrato(data)
    if (created?.error) {
      return created
    }
    navigate(`/contratos/${created.id}`)
    return created
  }

  return (
    <div className="page-content">
      <ContratoForm
        initialData={contrato}
        headerLabel={id ? 'Editar contrato' : 'Novo contrato'}
        onSave={handleSave}
        presetUnidadeId={presetUnidadeId}
      />
    </div>
  )
}
