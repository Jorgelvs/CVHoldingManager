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
    // Sinaliza que a tela de resumo foi aberta logo apos um cadastro novo
    // (nao ao visualizar um contrato ja existente vindo da lista). A tela
    // de resumo usa essa marcacao para o botao "Voltar" ir direto para um
    // novo cadastro, em vez de usar o historico do navegador (que exigia
    // dois cliques em "Voltar" para chegar la: primeiro caia de volta no
    // formulario recem-preenchido, so depois na lista).
    navigate(`/contratos/${created.id}`, { state: { justCreated: true } })
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
