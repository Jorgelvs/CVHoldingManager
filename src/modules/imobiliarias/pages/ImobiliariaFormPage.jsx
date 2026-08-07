import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ImobiliariaForm from '../components/ImobiliariaForm.jsx'
import { criarImobiliaria, atualizarImobiliaria, buscarImobiliariaPorId } from '../services/imobiliariaService.js'

export default function ImobiliariaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [imobiliaria, setImobiliaria] = useState(null)

  useEffect(() => {
    if (id) {
      const found = buscarImobiliariaPorId(id)
      if (!found) {
        navigate('/financeiro/imobiliarias', { replace: true })
        return
      }
      setImobiliaria(found)
    }
  }, [id, navigate])

  const handleSave = (data) => {
    if (id) {
      const updated = atualizarImobiliaria(id, data)
      if (updated?.error) return updated
      if (updated) navigate('/financeiro/imobiliarias')
      return updated
    }

    const created = criarImobiliaria(data)
    if (created?.error) return created
    navigate('/financeiro/imobiliarias')
    return created
  }

  return (
    <div className="page-content">
      <ImobiliariaForm
        initialData={imobiliaria}
        headerLabel={id ? 'Editar imobiliária' : 'Nova imobiliária'}
        onSave={handleSave}
      />
    </div>
  )
}
