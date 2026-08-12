import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ContratoForm from '../components/ContratoForm.jsx'
import { criarContrato, atualizarContrato, buscarContratoPorId } from '../services/contratoService.js'
import { criarDocumento, atualizarDocumento, buscarDocumentosFiltrados } from '../../documentos/services/documentoService.js'

// O upload do arquivo do contrato agora acontece direto na tela de
// cadastro/edição de Contrato (pedido do usuário: "upload de contrato na
// página onde registro o contrato, pasta Documentos fica para outros
// documentos"). Isto cria/atualiza um registro em Documentos (categoria
// fixa "Contratos", vinculado ao contratoId) sem exigir uma segunda etapa
// na tela de Documentos.
function salvarDocumentoDoContrato(contrato, documentoArquivo) {
  if (!contrato || !documentoArquivo) return

  const dadosDocumento = {
    nome: `Contrato ${contrato.codigoInterno}`,
    categoria: 'Contratos',
    data: new Date().toISOString().slice(0, 10),
    patrimonioId: contrato.patrimonioId,
    unidadeId: contrato.unidadeId,
    contratoId: contrato.id,
    arquivo: { url: documentoArquivo.url, filename: documentoArquivo.filename },
    tipo: documentoArquivo.tipo,
    tamanho: documentoArquivo.tamanho,
  }

  const existente = buscarDocumentosFiltrados({ contratoId: contrato.id, categoria: 'Contratos' })[0]
  if (existente) {
    atualizarDocumento(existente.id, dadosDocumento)
  } else {
    criarDocumento(dadosDocumento)
  }
}

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
    // documentoArquivo não é um campo do contrato — vem do novo bloco de
    // upload em ContratoForm.jsx e é tratado separadamente abaixo.
    const { documentoArquivo, ...contratoData } = data

    if (id) {
      const updated = atualizarContrato(id, contratoData)
      if (updated?.error) {
        return updated
      }
      if (updated) {
        salvarDocumentoDoContrato(updated, documentoArquivo)
        navigate(`/contratos/${id}`)
      }
      return updated
    }

    const created = criarContrato(contratoData)
    if (created?.error) {
      return created
    }
    salvarDocumentoDoContrato(created, documentoArquivo)
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
