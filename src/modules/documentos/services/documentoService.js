import { STORAGE_KEY_DOCUMENTOS } from '../constants/documentoConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { identificarCamposAlterados, registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'

function garantirDocumento(item) {
  const source = applyCreationTimestamps(applyDomainSchema('documento', item), {
    legacyCreatedFields: ['criadoEm', 'dataCriacao'],
    legacyUpdatedFields: ['atualizadoEm', 'dataAtualizacao'],
  })

  return {
    id: source.id || gerarId(),
    nome: source.nome || '',
    categoria: source.categoria || 'Outros',
    descricao: source.descricao || '',
    data: source.data || new Date().toISOString().slice(0, 10),
    observacoes: source.observacoes || '',
    arquivo: source.arquivo || null,
    tamanho: source.tamanho || 0,
    tipo: source.tipo || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    criadoEm: source.criadoEm,
    atualizadoEm: source.atualizadoEm,
    patrimonioId: source.patrimonioId || '',
    unidadeId: source.unidadeId || '',
    contratoId: source.contratoId || '',
    lancamentoId: source.lancamentoId || '',
    excluido: source.excluido || false,
    historico: Array.isArray(source.historico) ? source.historico : (source.historico ? [source.historico] : []),
  }
}

function carregarDocumentos() {
  const dados = localGet(STORAGE_KEY_DOCUMENTOS, [])
  const parsed = Array.isArray(dados) ? dados : []
  return parsed.map(garantirDocumento)
}

function salvarDocumentos(lista) {
  localSet(STORAGE_KEY_DOCUMENTOS, lista.map(garantirDocumento))
}

export function listarDocumentos(includeDeleted = false) {
  const documentos = carregarDocumentos()
  return includeDeleted ? documentos : documentos.filter((item) => !item.excluido)
}

export function buscarDocumentoPorId(id, includeDeleted = false) {
  return listarDocumentos(includeDeleted).find((item) => item.id === id) || null
}

export function criarDocumento(dados) {
  const documento = garantirDocumento({
    ...dados,
    id: gerarId(),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  })

  const documentos = listarDocumentos()
  documentos.push(documento)
  salvarDocumentos(documentos)

  registrarEventoAuditoria({
    modulo: 'Documentos',
    acao: 'DOCUMENTO_UPLOAD',
    registroId: documento.id,
    registro: documento.nome || documento.id,
    descricao: `Upload do documento ${documento.nome || documento.id}`,
    valorAnterior: null,
    novoValor: documento,
    camposAlterados: Object.keys(documento),
  })

  return documento
}

export function atualizarDocumento(id, dados, opcoes = {}) {
  const documentos = listarDocumentos(true)
  const index = documentos.findIndex((item) => item.id === id)
  if (index === -1) return null
  const anterior = documentos[index]

  documentos[index] = garantirDocumento({
    ...touchUpdatedAt({ ...anterior, ...dados }, { legacyUpdatedFields: ['atualizadoEm'] }),
  })

  salvarDocumentos(documentos)

  const atualizado = documentos[index]
  if (!opcoes.skipAudit) {
    const camposAlterados = identificarCamposAlterados(anterior, atualizado, ['atualizadoEm', 'updatedAt'])
    if (camposAlterados.length > 0) {
      const acao = camposAlterados.includes('arquivo') ? 'DOCUMENTO_SUBSTITUICAO' : 'ALTERACAO'
      registrarEventoAuditoria({
        modulo: 'Documentos',
        acao,
        registroId: atualizado.id,
        registro: atualizado.nome || atualizado.id,
        descricao: acao === 'DOCUMENTO_SUBSTITUICAO'
          ? `Substituição do arquivo do documento ${atualizado.nome || atualizado.id}`
          : `Alteração do documento ${atualizado.nome || atualizado.id}`,
        valorAnterior: anterior,
        novoValor: atualizado,
        camposAlterados,
      })
    }
  }

  return documentos[index]
}

export function adicionarHistoricoDocumento(id, historicoItem) {
  const documento = buscarDocumentoPorId(id, true)
  if (!documento) return null
  documento.historico = [...(documento.historico || []), historicoItem]
  return atualizarDocumento(id, documento, { skipAudit: true })
}

export function excluirDocumento(id) {
  const documentos = listarDocumentos(true)
  const index = documentos.findIndex((item) => item.id === id)
  if (index === -1) return false

  const documento = documentos[index]
  const vinculoAtivo = Boolean(documento.patrimonioId || documento.unidadeId || documento.contratoId || documento.lancamentoId)
  let novoValor = null
  let acao = 'EXCLUSAO'
  if (vinculoAtivo) {
    documentos[index] = garantirDocumento({
      ...touchUpdatedAt(documento, { legacyUpdatedFields: ['atualizadoEm'] }),
      excluido: true,
    })
    novoValor = documentos[index]
    acao = 'EXCLUSAO_LOGICA'
  } else {
    documentos.splice(index, 1)
  }

  salvarDocumentos(documentos)

  registrarEventoAuditoria({
    modulo: 'Documentos',
    acao,
    registroId: documento.id,
    registro: documento.nome || documento.id,
    descricao: acao === 'EXCLUSAO_LOGICA'
      ? `Exclusão lógica do documento ${documento.nome || documento.id}`
      : `Exclusão do documento ${documento.nome || documento.id}`,
    valorAnterior: documento,
    novoValor,
    camposAlterados: acao === 'EXCLUSAO_LOGICA' ? ['excluido'] : ['id'],
  })

  return true
}

export function existeDocumentoDuplicado(nome, tipo, tamanho, id = null) {
  const documentos = listarDocumentos()
  return documentos.some((item) => item.id !== id && item.nome === nome && item.tipo === tipo && item.tamanho === tamanho)
}

export function buscarDocumentosFiltrados({ search = '', categoria = '', patrimonioId = '', unidadeId = '', contratoId = '', periodoInicio = '', periodoFim = '' } = {}) {
  const documentos = listarDocumentos()
  const termo = (search || '').trim().toLowerCase()
  return documentos.filter((item) => {
    const matchesSearch = !termo || item.nome.toLowerCase().includes(termo) || item.descricao.toLowerCase().includes(termo) || (item.observacoes || '').toLowerCase().includes(termo)
    const matchesCategoria = !categoria || item.categoria === categoria
    const matchesPatrimonio = !patrimonioId || item.patrimonioId === patrimonioId
    const matchesUnidade = !unidadeId || item.unidadeId === unidadeId
    const matchesContrato = !contratoId || item.contratoId === contratoId
    const matchesPeriodo = (() => {
      if (!periodoInicio && !periodoFim) return true
      const dataDocumento = item.data || ''
      if (periodoInicio && dataDocumento < periodoInicio) return false
      if (periodoFim && dataDocumento > periodoFim) return false
      return true
    })()
    return matchesSearch && matchesCategoria && matchesPatrimonio && matchesUnidade && matchesContrato && matchesPeriodo
  })
}

export function listarDocumentosVencendoPrazo({ dias = 90, categorias = ['Seguro', 'IPTU', 'Condomínio', 'Outros'] } = {}) {
  const documentos = listarDocumentos()
  const hoje = new Date().toISOString().slice(0, 10)
  const limite = new Date()
  limite.setDate(limite.getDate() + dias)
  const limiteString = limite.toISOString().slice(0, 10)

  return documentos
    .filter((item) => categorias.includes(item.categoria) && item.data)
    .map((item) => ({
      ...item,
      diasRestantes: diffDays(hoje, item.data),
    }))
    .filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= dias)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
}

function diffDays(dataInicio, dataFim) {
  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)
  const diff = fim.getTime() - inicio.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
