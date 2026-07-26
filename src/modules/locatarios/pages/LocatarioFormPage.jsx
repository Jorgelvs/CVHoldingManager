import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import LocatarioForm from '../components/LocatarioForm.jsx'
import { criarLocatario, atualizarLocatario, buscarLocatarioPorId } from '../services/locatarioService.js'

export default function LocatarioFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [locatario, setLocatario] = useState(null)

  useEffect(() => {
    if (id) {
      const found = buscarLocatarioPorId(id)
      if (!found) {
        navigate('/locatarios', { replace: true })
        return
      }
      setLocatario(found)
    }
  }, [id, navigate])

  const handleSave = (data) => {
    if (id) {
      const updated = atualizarLocatario(id, data)
      if (updated) {
        navigate(`/locatarios/${id}`)
      }
      return
    }

    const created = criarLocatario(data)
    navigate(`/locatarios/${created.id}`)
  }

  return (
    <div className="page-content">
      <LocatarioForm
        initialData={locatario}
        headerLabel={id ? 'Editar locatário' : 'Novo locatário'}
        onSave={handleSave}
      />
    </div>
  )
}
