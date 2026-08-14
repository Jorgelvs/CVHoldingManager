import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Modal from '../../../components/Modal.jsx'
import {
  listarDocumentos,
  excluirDocumento,
  buscarDocumentosFiltrados,
  listarDocumentosVencendoPrazo,
} from '../services/documentoService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { listarContratos } from '../../contratos/services/contratoService.js'
import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { CATEGORIAS_DOCUMENTOS } from '../constants/documentoConstants.js'
import { formatarDataConfigurada, obterParametrosDocumentos, obterPreferenciasInterface } from '../../configuracoes/services/configuracaoService.js'

const filtroPadrao = {
  search: '',
  categoria: '',
  patrimonioId: '',
  unidadeId: '',
  contratoId: '',
  periodoInicio: '',
  periodoFim: '',
}

// Documentos da categoria "Contratos" (o arquivo anexado direto no cadastro
// do contrato, ver ContratoForm.jsx) ficam agrupados por situação do
// contrato vinculado — "Vigente" (Ativo) ou "Cancelados" — pra funcionar como
// um repositório de consulta rápida por pasta, como pedido pelo usuário.
function pastaContrato(contrato) {
  if (!contrato) return ''
  if (contrato.situacao === 'Ativo') return 'vigente'
  if (contrato.situacao === 'Cancelado') return 'cancelados'
  return 'outras'
}

function labelPastaContrato(contrato) {
  const pasta = pastaContrato(contrato)
  if (pasta === 'vigente') return 'Vigente'
  if (pasta === 'cancelados') return 'Cancelados'
  if (pasta === 'outras') return contrato.situacao
  return '-'
}

export default function DocumentosPage() {
  const location = useLocation()
  const [documentos, setDocumentos] = useState([])
  const [filtros, setFiltros] = useState(filtroPadrao)
  const [alertaFiltro, setAlertaFiltro] = useState('')
  const [pastaContratoFiltro, setPastaContratoFiltro] = useState('')
  const [aviso, setAviso] = useState('')
  const [previewDocumento, setPreviewDocumento] = useState(null)

  useEffect(() => {
    setDocumentos(listarDocumentos())
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const nextFiltros = {
      search: params.get('search') || '',
      categoria: params.get('categoria') || '',
      patrimonioId: params.get('patrimonioId') || '',
      unidadeId: params.get('unidadeId') || '',
      contratoId: params.get('contratoId') || '',
      periodoInicio: params.get('periodoInicio') || '',
      periodoFim: params.get('periodoFim') || '',
    }
    setFiltros(nextFiltros)
    setAlertaFiltro(params.get('alerta') || '')
  }, [location.search])

  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const unidades = useMemo(() => listarUnidades(), [])
  const contratos = useMemo(() => listarContratos(), [])
  const lancamentos = useMemo(() => listarLancamentos(), [])
  const parametrosDocumentos = useMemo(() => obterParametrosDocumentos(), [])
  const preferenciasInterface = useMemo(() => obterPreferenciasInterface(), [])
  const itensPorPagina = Number(preferenciasInterface?.itensPorPagina || 20)
  const categoriasDisponiveis = useMemo(
    () => (parametrosDocumentos?.categoriasPermitidas?.length ? parametrosDocumentos.categoriasPermitidas : CATEGORIAS_DOCUMENTOS),
    [parametrosDocumentos],
  )

  const contratosPorId = useMemo(() => new Map(contratos.map((item) => [item.id, item])), [contratos])

  const filtrados = useMemo(() => {
    let base = buscarDocumentosFiltrados(filtros)
    if (alertaFiltro === 'vencendo') {
      const idsVencendo = new Set(listarDocumentosVencendoPrazo().map((item) => item.id))
      base = base.filter((item) => idsVencendo.has(item.id))
    }
    if (pastaContratoFiltro) {
      base = base.filter((item) => pastaContrato(contratosPorId.get(item.contratoId)) === pastaContratoFiltro)
    }
    return base
  }, [filtros, documentos, alertaFiltro, pastaContratoFiltro, contratosPorId])

  const paginados = useMemo(() => filtrados.slice(0, itensPorPagina), [filtrados, itensPorPagina])

  const atualizarLista = () => setDocumentos(listarDocumentos())

  const handlePreview = (documento) => {
    setPreviewDocumento(documento)
  }

  const handleExcluir = (documento) => {
    if (!window.confirm(`Confirma excluir o documento "${documento.nome}"?`)) return
    const ok = excluirDocumento(documento.id)
    if (!ok) return setAviso('Não foi possível excluir o documento.')
    setAviso('Documento excluído com sucesso.')
    atualizarLista()
  }

  const handleFilterChange = (field, value) => {
    setFiltros((current) => ({ ...current, [field]: value }))
  }

  const handleClearFilters = () => {
    setFiltros(filtroPadrao)
    setAlertaFiltro('')
    setPastaContratoFiltro('')
  }

  const getPatrimonioNome = (id) => patrimonios.find((item) => item.id === id)?.nome || '-'
  const getUnidadeNome = (id) => unidades.find((item) => item.id === id)?.nome || '-'
  const getContratoCodigo = (id) => contratos.find((item) => item.id === id)?.codigoInterno || '-'
  const getLancamentoDescricao = (id) => lancamentos.find((item) => item.id === id)?.descricao || '-'
  const formatarTamanho = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  const isPreviewSupported = (tipo) => ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(tipo)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Centralize e acesse todos os documentos da C&V Holding.</p>
          <h1>Documentos</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link to="/documentos/novo" className="button button-primary">Novo documento</Link>
        </div>
      </div>

      <div className="filters-panel" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="filter-group">
          <label>Pesquisar</label>
          <input type="search" value={filtros.search} placeholder="Nome, descrição ou observações" onChange={(event) => handleFilterChange('search', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Categoria</label>
          <select value={filtros.categoria} onChange={(event) => handleFilterChange('categoria', event.target.value)}>
            <option value="">Todos</option>
            {categoriasDisponiveis.map((categoria) => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Patrimônio</label>
          <select value={filtros.patrimonioId} onChange={(event) => handleFilterChange('patrimonioId', event.target.value)}>
            <option value="">Todos</option>
            {patrimonios.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Unidade</label>
          <select value={filtros.unidadeId} onChange={(event) => handleFilterChange('unidadeId', event.target.value)}>
            <option value="">Todas</option>
            {unidades.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Contrato</label>
          <select value={filtros.contratoId} onChange={(event) => handleFilterChange('contratoId', event.target.value)}>
            <option value="">Todos</option>
            {contratos.map((item) => (
              <option key={item.id} value={item.id}>{item.codigoInterno}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Pasta do contrato</label>
          <select value={pastaContratoFiltro} onChange={(event) => setPastaContratoFiltro(event.target.value)}>
            <option value="">Todas</option>
            <option value="vigente">Vigente</option>
            <option value="cancelados">Cancelados</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Período início</label>
          <input type="date" value={filtros.periodoInicio} onChange={(event) => handleFilterChange('periodoInicio', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Período fim</label>
          <input type="date" value={filtros.periodoFim} onChange={(event) => handleFilterChange('periodoFim', event.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button type="button" className="button button-secondary" onClick={handleClearFilters}>Limpar filtros</button>
        </div>
      </div>

      {aviso ? <div className="alert-box alert-success" style={{ marginBottom: 16 }}>{aviso}</div> : null}

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <div>
            <h2>Nenhum documento encontrado.</h2>
            <p>Cadastre documentos e use a pesquisa para localizá-los rapidamente.</p>
            <Link className="button button-primary" to="/documentos/novo">Cadastrar documento</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Tamanho</th>
                  <th>Patrimônio</th>
                  <th>Unidade</th>
                  <th>Contrato</th>
                  <th>Pasta</th>
                  <th>Lançamento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((documento) => (
                  <tr key={documento.id}>
                    <td>{documento.nome}</td>
                    <td>{documento.categoria}</td>
                    <td>{formatarDataConfigurada(documento.data)}</td>
                    <td>{documento.tipo || '-'}</td>
                    <td>{formatarTamanho(documento.tamanho)}</td>
                    <td>{getPatrimonioNome(documento.patrimonioId)}</td>
                    <td>{getUnidadeNome(documento.unidadeId)}</td>
                    <td>{getContratoCodigo(documento.contratoId)}</td>
                    <td>{documento.contratoId ? labelPastaContrato(contratosPorId.get(documento.contratoId)) : '-'}</td>
                    <td>{getLancamentoDescricao(documento.lancamentoId)}</td>
                    <td className="table-actions">
                      <button className="button button-secondary" type="button" onClick={() => handlePreview(documento)}>
                        Visualizar
                      </button>
                      <a
                        className="button button-secondary"
                        href={documento.arquivo?.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        download={documento.arquivo?.filename || documento.nome}
                      >
                        Download
                      </a>
                      <Link className="button button-secondary" to={`/documentos/${documento.id}/editar`}>Editar</Link>
                      <Link className="button button-secondary" to={`/auditoria?modulo=Documentos&registroId=${documento.id}`}>Histórico</Link>
                      <button className="button button-danger" type="button" onClick={() => handleExcluir(documento)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal open={Boolean(previewDocumento)} title={previewDocumento?.nome || 'Visualização do documento'} onClose={() => setPreviewDocumento(null)}>
            {previewDocumento ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <strong>Arquivo:</strong> {previewDocumento.arquivo?.filename || 'Indisponível'}
                </div>
                {isPreviewSupported(previewDocumento.tipo) ? (
                  previewDocumento.tipo === 'application/pdf' ? (
                    <object
                      data={previewDocumento.arquivo?.url}
                      type="application/pdf"
                      width="100%"
                      height="650"
                    >
                      <p>Não foi possível exibir o PDF. Use o botão de download abaixo.</p>
                    </object>
                  ) : (
                    <img
                      src={previewDocumento.arquivo?.url}
                      alt={previewDocumento.nome}
                      style={{ width: '100%', maxHeight: 650, objectFit: 'contain' }}
                    />
                  )
                ) : (
                  <div>
                    <p>Este tipo de arquivo não pode ser visualizado inline.</p>
                    <a href={previewDocumento.arquivo?.url || '#'} target="_blank" rel="noreferrer" className="button button-primary">Download</a>
                  </div>
                )}
              </div>
            ) : null}
          </Modal>
        </>
      )}
    </div>
  )
}
