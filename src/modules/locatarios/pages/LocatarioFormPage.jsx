import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import LocatarioForm from '../components/LocatarioForm.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'
import { criarLocatario, atualizarLocatario, buscarLocatarioPorId } from '../services/locatarioService.js'

export default function LocatarioFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [locatario, setLocatario] = useState(null)
  // Igual ao fluxo de "cadastrar outra unidade": depois de salvar um novo
  // locatário, pergunta se o usuário quer cadastrar mais um em seguida, em
  // vez de mandá-lo de volta pra lista toda vez.
  const [confirmarProximoLocatario, setConfirmarProximoLocatario] = useState(false)
  const [ultimoLocatarioCriado, setUltimoLocatarioCriado] = useState(null)
  const [formKey, setFormKey] = useState(0)

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
    setUltimoLocatarioCriado(created)
    setConfirmarProximoLocatario(true)
  }

  const handleCadastrarProximoLocatario = () => {
    setConfirmarProximoLocatario(false)
    setUltimoLocatarioCriado(null)
    setFormKey((current) => current + 1)
  }

  const handleFinalizarCadastroLocatarios = () => {
    setConfirmarProximoLocatario(false)
    if (ultimoLocatarioCriado) {
      navigate(`/locatarios/${ultimoLocatarioCriado.id}`)
    }
  }

  return (
    <div className="page-content">
      <LocatarioForm
        key={formKey}
        initialData={locatario}
        headerLabel={id ? 'Editar locatário' : 'Novo locatário'}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={confirmarProximoLocatario}
        title="Cadastrar outro locatário"
        message="Locatário cadastrado com sucesso. Deseja cadastrar outro locatário agora?"
        confirmLabel="Sim, cadastrar outro"
        cancelLabel="Não, finalizar"
        onConfirm={handleCadastrarProximoLocatario}
        onCancel={handleFinalizarCadastroLocatarios}
      />
    </div>
  )
}
