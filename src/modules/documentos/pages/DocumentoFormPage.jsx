import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { criarDocumento, atualizarDocumento, buscarDocumentoPorId, existeDocumentoDuplicado } from '../services/documentoService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { listarContratos } from '../../contratos/services/contratoService.js'
import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { obterParametrosDocumentos, formatarDataConfigurada } from '../../configuracoes/services/configuracaoService.js'

const validarArquivo = (file, parametrosDocumentos) => {
  const tiposPermitidos = parametrosDocumentos?.tiposArquivoPermitidos || []
  const tamanhoMaximo = Number(parametrosDocumentos?.tamanhoMaximoBytes || 0)

  if (!file) return 'Arquivo obrigatório.'
  if (!tiposPermitidos.includes(file.type)) {
    return 'Tipo de arquivo não permitido.'
  }
  if (tamanhoMaximo > 0 && file.size > tamanhoMaximo) {
    return `Tamanho máximo permitido é ${Math.round(tamanhoMaximo / 1024 / 1024)} MB.`
  }
  return ''
}

export default function DocumentoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [documento, setDocumento] = useState(null)
  const parametrosDocumentos = useMemo(() => obterParametrosDocumentos(), [])
  const categoriasPermitidas = useMemo(() => parametrosDocumentos?.categoriasPermitidas || [], [parametrosDocumentos])
  const tiposPermitidos = useMemo(() => parametrosDocumentos?.tiposArquivoPermitidos || [], [parametrosDocumentos])

  const dataPadraoAlerta = useMemo(() => {
    const dias = Number(parametrosDocumentos?.prazoPadraoAlertaVencimentoDias || 0)
    const base = new Date()
    base.setDate(base.getDate() + (Number.isFinite(dias) ? dias : 0))
    return base.toISOString().slice(0, 10)
  }, [parametrosDocumentos])

  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    descricao: '',
    data: '',
    observacoes: '',
    patrimonioId: '',
    unidadeId: '',
    contratoId: '',
    lancamentoId: '',
    arquivo: null,
    tipo: '',
    tamanho: 0,
    historico: [],
  })
  const [errors, setErrors] = useState({})
  const [info, setInfo] = useState('')

  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const unidades = useMemo(() => listarUnidades(), [])
  const contratos = useMemo(() => listarContratos(), [])
  const lancamentos = useMemo(() => listarLancamentos(), [])

  useEffect(() => {
    if (id) return
    setForm((current) => ({
      ...current,
      categoria: current.categoria || categoriasPermitidas[0] || '',
      data: current.data || dataPadraoAlerta,
    }))
  }, [id, categoriasPermitidas, dataPadraoAlerta])

  useEffect(() => {
    if (!id) return
    const existing = buscarDocumentoPorId(id)
    if (!existing) {
      navigate('/documentos', { replace: true })
      return
    }
    setDocumento(existing)
    setForm({
      ...existing,
      arquivo: existing.arquivo,
      tamanho: existing.tamanho,
      tipo: existing.tipo,
    })
  }, [id, navigate])

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleArquivoChange = async (event) => {
    const file = event.target.files?.[0]
    const erro = validarArquivo(file, parametrosDocumentos)
    if (erro) {
      setErrors((current) => ({ ...current, arquivo: erro }))
      return
    }
    const blob = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
      reader.readAsDataURL(file)
    })
    setForm((current) => ({
      ...current,
      arquivo: { url: blob, filename: file.name },
      tamanho: file.size,
      tipo: file.type,
    }))
    setErrors((current) => ({ ...current, arquivo: '' }))
  }

  const validarFormulario = () => {
    const novoErrors = {}
    if (!form.nome.trim()) novoErrors.nome = 'Nome do documento obrigatório.'
    if (!form.categoria) novoErrors.categoria = 'Categoria obrigatória.'
    if (!form.data) novoErrors.data = 'Data obrigatória.'
    if (!form.arquivo || !form.arquivo.url) {
      novoErrors.arquivo = 'Arquivo obrigatório.'
    }
    if (form.arquivo?.filename && form.tamanho && form.tipo) {
      const arquivoVirtual = { type: form.tipo, size: form.tamanho }
      const erroArquivo = validarArquivo(arquivoVirtual, parametrosDocumentos)
      if (erroArquivo) novoErrors.arquivo = erroArquivo
    }
    if (existeDocumentoDuplicado(form.nome, form.tipo, form.tamanho, id)) {
      novoErrors.nome = 'Documento duplicado detectado. Verifique o nome e o arquivo.'
    }
    return novoErrors
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const validationErrors = validarFormulario()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const documentoSalvo = {
      nome: form.nome,
      categoria: form.categoria,
      descricao: form.descricao,
      data: form.data,
      observacoes: form.observacoes,
      patrimonioId: form.patrimonioId,
      unidadeId: form.unidadeId,
      contratoId: form.contratoId,
      lancamentoId: form.lancamentoId,
      arquivo: form.arquivo,
      tipo: form.tipo,
      tamanho: form.tamanho,
      historico: [...(documento?.historico || form.historico || [])],
    }

    if (id) {
      const isFileReplaced = documento?.arquivo?.url && form.arquivo?.url && form.arquivo.url !== documento.arquivo.url
      if (isFileReplaced) {
        documentoSalvo.historico = [
          ...(documento?.historico || []),
          {
            filename: documento.arquivo?.filename,
            url: documento.arquivo?.url,
            tipo: documento.tipo,
            tamanho: documento.tamanho,
            data: new Date().toISOString(),
          },
        ]
      }

      atualizarDocumento(id, documentoSalvo)
      setInfo('Documento atualizado com sucesso.')
      navigate('/documentos')
      return
    }

    criarDocumento(documentoSalvo)
    setInfo('Documento criado com sucesso.')
    navigate('/documentos')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Cadastre e vincule documentos aos ativos e operações.</p>
          <h1>{id ? 'Editar documento' : 'Novo documento'}</h1>
        </div>
      </div>

      {info ? <div className="alert-box alert-success">{info}</div> : null}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Nome do documento</label>
            <input type="text" value={form.nome} onChange={(event) => handleChange('nome', event.target.value)} />
            {errors.nome ? <span className="field-error">{errors.nome}</span> : null}
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <select value={form.categoria} onChange={(event) => handleChange('categoria', event.target.value)}>
              {categoriasPermitidas.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
            {errors.categoria ? <span className="field-error">{errors.categoria}</span> : null}
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <textarea value={form.descricao} onChange={(event) => handleChange('descricao', event.target.value)} rows={3} />
          </div>
          <div className="form-group">
            <label>Data</label>
            <input type="date" value={form.data} onChange={(event) => handleChange('data', event.target.value)} />
            {errors.data ? <span className="field-error">{errors.data}</span> : null}
          </div>
          <div className="form-group">
            <label>Observações</label>
            <textarea value={form.observacoes} onChange={(event) => handleChange('observacoes', event.target.value)} rows={3} />
          </div>
          <div className="form-group">
            <label>Patrimônio</label>
            <select value={form.patrimonioId} onChange={(event) => handleChange('patrimonioId', event.target.value)}>
              <option value="">Nenhum</option>
              {patrimonios.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Unidade</label>
            <select value={form.unidadeId} onChange={(event) => handleChange('unidadeId', event.target.value)}>
              <option value="">Nenhuma</option>
              {unidades.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Contrato</label>
            <select value={form.contratoId} onChange={(event) => handleChange('contratoId', event.target.value)}>
              <option value="">Nenhum</option>
              {contratos.map((item) => (
                <option key={item.id} value={item.id}>{item.codigoInterno}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Lançamento</label>
            <select value={form.lancamentoId} onChange={(event) => handleChange('lancamentoId', event.target.value)}>
              <option value="">Nenhum</option>
              {lancamentos.map((item) => (
                <option key={item.id} value={item.id}>{item.descricao || item.id}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Arquivo</label>
            <input type="file" accept={tiposPermitidos.join(',')} onChange={handleArquivoChange} />
            {form.arquivo?.filename ? <div className="file-info">Arquivo selecionado: {form.arquivo.filename} ({Math.round(form.tamanho / 1024)} KB)</div> : null}
            {errors.arquivo ? <span className="field-error">{errors.arquivo}</span> : null}
          </div>
          {id && documento?.historico?.length > 0 ? (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Histórico de substituições</label>
              <div className="document-history">
                {documento.historico.map((item, index) => (
                  <div key={index} className="history-item">
                    <strong>{item.filename}</strong> ({formatarDataConfigurada(item.data)})
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="button button-primary">Salvar documento</button>
          <button type="button" className="button button-secondary" onClick={() => navigate('/documentos')}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
