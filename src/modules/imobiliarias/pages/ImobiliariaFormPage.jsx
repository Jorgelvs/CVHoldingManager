import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ImobiliariaForm from '../components/ImobiliariaForm.jsx'
import { criarImobiliaria, atualizarImobiliaria, buscarImobiliariaPorId } from '../services/imobiliariaService.js'
import { waitForRepositoryFlush, getRepositoryRuntimeState } from '../../../utils/localRepository.js'

// A gravação real no Supabase acontece em segundo plano (fire-and-forget);
// sem esperar e checar o resultado aqui, a tela navegava para a lista como
// se tivesse salvo mesmo quando a gravação falhava (ex.: CONFLICT_DETECTED
// por causa de outra aba/sessão aberta) — daí a sensação de "não está
// salvando" sem nenhum aviso.
async function confirmarGravacao() {
  await waitForRepositoryFlush()
  const state = getRepositoryRuntimeState()
  if (state.mode === 'supabase' && state.error) {
    return { error: `Falha ao confirmar a gravação (${state.error}). Clique em "Tentar novamente" no aviso do topo da página e salve de novo.` }
  }
  return null
}

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

  const handleSave = async (data) => {
    if (id) {
      const updated = atualizarImobiliaria(id, data)
      if (updated?.error) return updated
      const falha = await confirmarGravacao()
      if (falha) return falha
      if (updated) navigate('/financeiro/imobiliarias')
      return updated
    }

    const created = criarImobiliaria(data)
    if (created?.error) return created
    const falha = await confirmarGravacao()
    if (falha) return falha
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
