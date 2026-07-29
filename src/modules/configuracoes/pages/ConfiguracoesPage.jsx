import React, { useEffect, useMemo, useState } from 'react'
import {
  obterConfiguracoes,
  obterDefaultsConfiguracoes,
  resetarConfiguracoes,
  salvarConfiguracoes,
} from '../services/configuracaoService.js'
import { listarContas } from '../../financeiro/services/contaService.js'
import { PRIORIDADE_NOTIFICACAO, TIPOS_NOTIFICACAO } from '../../notificacoes/constants/notificacaoConstants.js'

function listToText(lista) {
  if (typeof lista === 'string') return lista
  if (!Array.isArray(lista)) return ''
  return lista.join('\n')
}

function textToList(texto) {
  if (Array.isArray(texto)) {
    return texto.map((item) => String(item || '').trim()).filter(Boolean)
  }
  return String(texto || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function labelTipoNotificacao(tipo) {
  return String(tipo)
    .split('_')
    .map((parte) => parte.charAt(0) + parte.slice(1).toLowerCase())
    .join(' ')
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState(null)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const contas = useMemo(() => listarContas().filter((item) => item.ativa), [])

  useEffect(() => {
    setConfig(obterConfiguracoes())
  }, [])

  if (!config) {
    return <div className="page-center">Carregando configuracoes...</div>
  }

  const defaults = obterDefaultsConfiguracoes()

  const setValue = (secao, campo, valor) => {
    setConfig((atual) => ({
      ...atual,
      [secao]: {
        ...atual[secao],
        [campo]: valor,
      },
    }))
  }

  const setNestedValue = (secao, campo, subcampo, valor) => {
    setConfig((atual) => ({
      ...atual,
      [secao]: {
        ...atual[secao],
        [campo]: {
          ...atual[secao][campo],
          [subcampo]: valor,
        },
      },
    }))
  }

  const salvar = () => {
    setErro('')
    setSucesso('')

    const payload = {
      ...config,
      financeiro: {
        ...config.financeiro,
        categoriasReceitas: textToList(config.financeiro.categoriasReceitas),
        categoriasDespesas: textToList(config.financeiro.categoriasDespesas),
        statusFinanceiros: textToList(config.financeiro.statusFinanceiros),
      },
      contratos: {
        ...config.contratos,
        indicesReajustePermitidos: textToList(config.contratos.indicesReajustePermitidos),
        prazoAlertaVencimentoDias: textToList(config.contratos.prazoAlertaVencimentoDias),
      },
      documentos: {
        ...config.documentos,
        categoriasPermitidas: textToList(config.documentos.categoriasPermitidas),
        tiposArquivoPermitidos: textToList(config.documentos.tiposArquivoPermitidos),
      },
      notificacoes: {
        ...config.notificacoes,
        prazosAntecedencia: {
          ...config.notificacoes.prazosAntecedencia,
          contratoVencendoDias: textToList(config.notificacoes.prazosAntecedencia.contratoVencendoDias),
        },
      },
    }

    const resultado = salvarConfiguracoes(payload)
    if (resultado?.error) {
      setErro(resultado.error)
      return
    }

    setConfig(obterConfiguracoes())
    setSucesso(resultado?.semAlteracoes ? 'Nenhuma alteracao para salvar.' : 'Configuracoes salvas com sucesso.')
  }

  const redefinir = () => {
    setErro('')
    setSucesso('')
    const novo = resetarConfiguracoes()
    setConfig(novo)
    setSucesso('Configuracoes redefinidas para os valores padrao.')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Parametros e preferencias gerais do CVHolding Manager.</p>
          <h1>Configuracoes</h1>
        </div>
        <div className="details-actions">
          <button type="button" className="button button-secondary" onClick={redefinir}>Restaurar padrao</button>
          <button type="button" className="button button-primary" onClick={salvar}>Salvar configuracoes</button>
        </div>
      </div>

      {sucesso ? <div className="alert-box alert-success">{sucesso}</div> : null}
      {erro ? <div className="alert-box alert-error">{erro}</div> : null}

      <div className="summary-card">
        <h2>Dados da holding</h2>
        <div className="form-grid">
          <label className="form-field"><span>Razao social</span><input value={config.holding.razaoSocial || ''} onChange={(e) => setValue('holding', 'razaoSocial', e.target.value)} /></label>
          <label className="form-field"><span>Nome fantasia</span><input value={config.holding.nomeFantasia || ''} onChange={(e) => setValue('holding', 'nomeFantasia', e.target.value)} /></label>
          <label className="form-field"><span>CNPJ</span><input value={config.holding.cnpj || ''} onChange={(e) => setValue('holding', 'cnpj', e.target.value)} /></label>
          <label className="form-field"><span>Endereco</span><input value={config.holding.endereco || ''} onChange={(e) => setValue('holding', 'endereco', e.target.value)} /></label>
          <label className="form-field"><span>Telefone</span><input value={config.holding.telefone || ''} onChange={(e) => setValue('holding', 'telefone', e.target.value)} /></label>
          <label className="form-field"><span>E-mail</span><input value={config.holding.email || ''} onChange={(e) => setValue('holding', 'email', e.target.value)} /></label>
          <label className="form-field form-field-full"><span>Logo (URL/base64)</span><input value={config.holding.logo || ''} onChange={(e) => setValue('holding', 'logo', e.target.value)} placeholder="Logo preparado para integracao" /></label>
          <label className="form-field form-field-full"><span>Dados bancarios principais</span><textarea value={config.holding.dadosBancariosPrincipais || ''} onChange={(e) => setValue('holding', 'dadosBancariosPrincipais', e.target.value)} /></label>
        </div>
      </div>

      <div className="summary-card">
        <h2>Parametros financeiros</h2>
        <div className="form-grid">
          <label className="form-field"><span>Dia padrao de vencimento</span><input type="number" min="1" max="31" value={config.financeiro.diaPadraoVencimento ?? defaults.financeiro.diaPadraoVencimento} onChange={(e) => setValue('financeiro', 'diaPadraoVencimento', e.target.value)} /></label>
          <label className="form-field"><span>Conta financeira padrao</span>
            <select value={config.financeiro.contaFinanceiraPadraoId || ''} onChange={(e) => setValue('financeiro', 'contaFinanceiraPadraoId', e.target.value)}>
              <option value="">Nenhuma</option>
              {contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Moeda padrao</span><input value="BRL" disabled /></label>
          <label className="form-field form-field-full"><span>Categorias de receitas (uma por linha)</span><textarea value={listToText(config.financeiro.categoriasReceitas)} onChange={(e) => setValue('financeiro', 'categoriasReceitas', e.target.value)} /></label>
          <label className="form-field form-field-full"><span>Categorias de despesas (uma por linha)</span><textarea value={listToText(config.financeiro.categoriasDespesas)} onChange={(e) => setValue('financeiro', 'categoriasDespesas', e.target.value)} /></label>
          <label className="form-field form-field-full"><span>Status financeiros (uma por linha)</span><textarea value={listToText(config.financeiro.statusFinanceiros)} onChange={(e) => setValue('financeiro', 'statusFinanceiros', e.target.value)} /></label>
        </div>
      </div>

      <div className="summary-card">
        <h2>Parametros de contratos</h2>
        <div className="form-grid">
          <label className="form-field form-field-full"><span>Indices de reajuste permitidos (uma por linha)</span><textarea value={listToText(config.contratos.indicesReajustePermitidos)} onChange={(e) => setValue('contratos', 'indicesReajustePermitidos', e.target.value)} /></label>
          <label className="form-field"><span>Periodicidade padrao</span><input value={config.contratos.periodicidadePadrao || ''} onChange={(e) => setValue('contratos', 'periodicidadePadrao', e.target.value)} /></label>
          <label className="form-field"><span>Prazo alerta de vencimento (dias, uma por linha)</span><textarea value={listToText(config.contratos.prazoAlertaVencimentoDias)} onChange={(e) => setValue('contratos', 'prazoAlertaVencimentoDias', e.target.value)} /></label>
          <label className="form-field"><span>Prazo alerta reajuste (dias)</span><input type="number" min="1" value={config.contratos.prazoAlertaReajusteDias ?? defaults.contratos.prazoAlertaReajusteDias} onChange={(e) => setValue('contratos', 'prazoAlertaReajusteDias', e.target.value)} /></label>
          <label className="form-field form-field-full"><span>Texto padrao de observacoes</span><textarea value={config.contratos.textoPadraoObservacoes || ''} onChange={(e) => setValue('contratos', 'textoPadraoObservacoes', e.target.value)} /></label>
        </div>
      </div>

      <div className="summary-card">
        <h2>Parametros de documentos</h2>
        <div className="form-grid">
          <label className="form-field form-field-full"><span>Categorias permitidas (uma por linha)</span><textarea value={listToText(config.documentos.categoriasPermitidas)} onChange={(e) => setValue('documentos', 'categoriasPermitidas', e.target.value)} /></label>
          <label className="form-field form-field-full"><span>Tipos de arquivo permitidos (MIME, um por linha)</span><textarea value={listToText(config.documentos.tiposArquivoPermitidos)} onChange={(e) => setValue('documentos', 'tiposArquivoPermitidos', e.target.value)} /></label>
          <label className="form-field"><span>Tamanho maximo (bytes)</span><input type="number" min="1024" value={config.documentos.tamanhoMaximoBytes ?? defaults.documentos.tamanhoMaximoBytes} onChange={(e) => setValue('documentos', 'tamanhoMaximoBytes', e.target.value)} /></label>
          <label className="form-field"><span>Prazo alerta vencimento (dias)</span><input type="number" min="1" value={config.documentos.prazoPadraoAlertaVencimentoDias ?? defaults.documentos.prazoPadraoAlertaVencimentoDias} onChange={(e) => setValue('documentos', 'prazoPadraoAlertaVencimentoDias', e.target.value)} /></label>
        </div>
      </div>

      <div className="summary-card">
        <h2>Parametros de notificacoes</h2>
        <div className="form-grid">
          <label className="form-field"><span>Conta vencendo (dias)</span><input type="number" min="1" value={config.notificacoes.prazosAntecedencia.contaVencendoDias ?? defaults.notificacoes.prazosAntecedencia.contaVencendoDias} onChange={(e) => setNestedValue('notificacoes', 'prazosAntecedencia', 'contaVencendoDias', e.target.value)} /></label>
          <label className="form-field"><span>Contrato vencendo (dias, uma por linha)</span><textarea value={listToText(config.notificacoes.prazosAntecedencia.contratoVencendoDias)} onChange={(e) => setNestedValue('notificacoes', 'prazosAntecedencia', 'contratoVencendoDias', e.target.value)} /></label>
          <label className="form-field"><span>Reajuste pendente (dias)</span><input type="number" min="1" value={config.notificacoes.prazosAntecedencia.reajusteDias ?? defaults.notificacoes.prazosAntecedencia.reajusteDias} onChange={(e) => setNestedValue('notificacoes', 'prazosAntecedencia', 'reajusteDias', e.target.value)} /></label>
          <label className="form-field"><span>Documento vencendo (dias)</span><input type="number" min="1" value={config.notificacoes.prazosAntecedencia.documentoDias ?? defaults.notificacoes.prazosAntecedencia.documentoDias} onChange={(e) => setNestedValue('notificacoes', 'prazosAntecedencia', 'documentoDias', e.target.value)} /></label>
        </div>

        <div className="table-wrapper" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Ativo</th>
                <th>Prioridade padrao</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(TIPOS_NOTIFICACAO)
                .filter((tipo) => tipo !== 'TAREFA_MANUAL')
                .map((tipo) => (
                  <tr key={tipo}>
                    <td>{labelTipoNotificacao(tipo)}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(config.notificacoes.tiposAtivos[tipo])}
                        onChange={(e) => setNestedValue('notificacoes', 'tiposAtivos', tipo, e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        value={config.notificacoes.prioridadesPadrao[tipo] || PRIORIDADE_NOTIFICACAO.MEDIA}
                        onChange={(e) => setNestedValue('notificacoes', 'prioridadesPadrao', tipo, e.target.value)}
                      >
                        {Object.values(PRIORIDADE_NOTIFICACAO).map((prioridade) => (
                          <option key={prioridade} value={prioridade}>{labelTipoNotificacao(prioridade)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="summary-card">
        <h2>Preferencias da interface</h2>
        <div className="form-grid">
          <label className="form-field"><span>Tema</span>
            <select value={config.interface.tema || 'auto'} onChange={(e) => setValue('interface', 'tema', e.target.value)}>
              <option value="auto">Auto</option>
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
            </select>
          </label>
          <label className="form-field"><span>Itens por pagina</span><input type="number" min="5" value={config.interface.itensPorPagina ?? defaults.interface.itensPorPagina} onChange={(e) => setValue('interface', 'itensPorPagina', e.target.value)} /></label>
          <label className="form-field"><span>Formato de data</span><input value={config.interface.formatoData || defaults.interface.formatoData} onChange={(e) => setValue('interface', 'formatoData', e.target.value)} /></label>
          <label className="form-field"><span>Exibicao de valores</span><input value={config.interface.exibicaoValores || defaults.interface.exibicaoValores} onChange={(e) => setValue('interface', 'exibicaoValores', e.target.value)} /></label>
          <label className="form-field">
            <span>Manter logo da C&V preparada</span>
            <input type="checkbox" checked={Boolean(config.interface.manterLogoPreparada)} onChange={(e) => setValue('interface', 'manterLogoPreparada', e.target.checked)} />
          </label>
        </div>
      </div>
    </div>
  )
}
