import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarContratos } from '../../contratos/services/contratoService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import {
  arquivarNotificacao,
  concluirTarefaManual,
  criarTarefaManual,
  listarCentralNotificacoesETarefas,
  listarResumoFiltrosNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  resolverNotificacao,
} from '../services/notificacaoService.js'
import { PRIORIDADE_NOTIFICACAO } from '../constants/notificacaoConstants.js'

const filtrosPadrao = {
  status: '',
  tipo: '',
  prioridade: '',
  periodoInicio: '',
  periodoFim: '',
  modulo: '',
  termo: '',
}

const tarefaPadrao = {
  titulo: '',
  descricao: '',
  prioridade: PRIORIDADE_NOTIFICACAO.MEDIA,
  dataVencimento: '',
  patrimonioId: '',
  unidadeId: '',
  contratoId: '',
}

function formatarDataHora(valor) {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR')
}

function formatarData(valor) {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleDateString('pt-BR')
}

function formatarLabel(valor) {
  if (!valor) return '-'
  return String(valor)
    .split('_')
    .map((parte) => parte.charAt(0) + parte.slice(1).toLowerCase())
    .join(' ')
}

function statusClassName(valor) {
  return `status-badge status-notif-${String(valor || '').toLowerCase().replaceAll('_', '-')}`
}

function prioridadeClassName(valor) {
  return `status-badge prioridade-${String(valor || '').toLowerCase()}`
}

export default function NotificacoesPage() {
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState(filtrosPadrao)
  const [refreshKey, setRefreshKey] = useState(0)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [tarefa, setTarefa] = useState(tarefaPadrao)

  const patrimonios = useMemo(() => listarPatrimonios(), [])
  const unidades = useMemo(() => listarUnidades(), [])
  const contratos = useMemo(() => listarContratos(), [])

  useEffect(() => {
    const onUpdate = () => setRefreshKey((valor) => valor + 1)
    window.addEventListener('cvholding_notificacoes_updated', onUpdate)
    return () => window.removeEventListener('cvholding_notificacoes_updated', onUpdate)
  }, [])

  const resumo = useMemo(() => listarResumoFiltrosNotificacoes(), [refreshKey])
  const itens = useMemo(() => listarCentralNotificacoesETarefas(filtros), [filtros, refreshKey])

  const atualizar = () => setRefreshKey((valor) => valor + 1)

  const handleFiltro = (campo, valor) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor }))
  }

  const limparFiltros = () => setFiltros(filtrosPadrao)

  const handleCriarTarefa = (event) => {
    event.preventDefault()
    setErro('')
    setAviso('')

    const resultado = criarTarefaManual(tarefa)
    if (resultado?.error) {
      setErro(resultado.error)
      return
    }

    setTarefa(tarefaPadrao)
    setAviso('Tarefa manual criada com sucesso.')
    atualizar()
  }

  const handleMarcarLida = (id) => {
    marcarNotificacaoComoLida(id)
    atualizar()
  }

  const handleResolver = (id) => {
    resolverNotificacao(id)
    atualizar()
  }

  const handleArquivar = (id) => {
    arquivarNotificacao(id)
    atualizar()
  }

  const handleMarcarTodas = () => {
    const qtd = marcarTodasNotificacoesComoLidas()
    setAviso(qtd > 0 ? `${qtd} notificacao(oes) marcada(s) como lida(s).` : 'Nao ha notificacoes nao lidas.')
    atualizar()
  }

  const handleConcluirTarefa = (id) => {
    concluirTarefaManual(id)
    atualizar()
  }

  const abrirRelacionamento = (item) => {
    if (!item?.link) return
    navigate(item.link)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Central unica para alertas, pendencias e tarefas operacionais.</p>
          <h1>Notificacoes e Tarefas</h1>
        </div>
        <div className="details-actions">
          <button type="button" className="button button-secondary" onClick={handleMarcarTodas}>Marcar todas como lidas</button>
        </div>
      </div>

      {aviso ? <div className="alert-box alert-success">{aviso}</div> : null}
      {erro ? <div className="alert-box alert-error">{erro}</div> : null}

      <div className="filters-panel" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="filter-group">
          <label>Status</label>
          <select value={filtros.status} onChange={(event) => handleFiltro('status', event.target.value)}>
            <option value="">Todos</option>
            {resumo.status.map((item) => (
              <option key={item} value={item}>{formatarLabel(item)}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Tipo</label>
          <select value={filtros.tipo} onChange={(event) => handleFiltro('tipo', event.target.value)}>
            <option value="">Todos</option>
            {resumo.tipos.map((item) => (
              <option key={item} value={item}>{formatarLabel(item)}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Prioridade</label>
          <select value={filtros.prioridade} onChange={(event) => handleFiltro('prioridade', event.target.value)}>
            <option value="">Todas</option>
            {resumo.prioridades.map((item) => (
              <option key={item} value={item}>{formatarLabel(item)}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Modulo</label>
          <select value={filtros.modulo} onChange={(event) => handleFiltro('modulo', event.target.value)}>
            <option value="">Todos</option>
            {resumo.modulos.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Periodo inicio</label>
          <input type="date" value={filtros.periodoInicio} onChange={(event) => handleFiltro('periodoInicio', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Periodo fim</label>
          <input type="date" value={filtros.periodoFim} onChange={(event) => handleFiltro('periodoFim', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Pesquisa</label>
          <input type="search" value={filtros.termo} onChange={(event) => handleFiltro('termo', event.target.value)} placeholder="Titulo ou descricao" />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="button" className="button button-secondary" onClick={limparFiltros}>Limpar filtros</button>
        </div>
      </div>

      <div className="summary-card">
        <h2>Criar tarefa manual</h2>
        <form className="form-grid" onSubmit={handleCriarTarefa}>
          <label className="form-field">
            <span>Titulo</span>
            <input type="text" value={tarefa.titulo} onChange={(event) => setTarefa((atual) => ({ ...atual, titulo: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>Prioridade</span>
            <select value={tarefa.prioridade} onChange={(event) => setTarefa((atual) => ({ ...atual, prioridade: event.target.value }))}>
              {Object.values(PRIORIDADE_NOTIFICACAO).map((item) => (
                <option key={item} value={item}>{formatarLabel(item)}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Data de vencimento</span>
            <input type="date" value={tarefa.dataVencimento} onChange={(event) => setTarefa((atual) => ({ ...atual, dataVencimento: event.target.value }))} />
          </label>
          <label className="form-field form-field-full">
            <span>Descricao</span>
            <input type="text" value={tarefa.descricao} onChange={(event) => setTarefa((atual) => ({ ...atual, descricao: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>Patrimonio relacionado</span>
            <select value={tarefa.patrimonioId} onChange={(event) => setTarefa((atual) => ({ ...atual, patrimonioId: event.target.value, unidadeId: '', contratoId: '' }))}>
              <option value="">Nenhum</option>
              {patrimonios.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Unidade relacionada</span>
            <select value={tarefa.unidadeId} onChange={(event) => setTarefa((atual) => ({ ...atual, unidadeId: event.target.value, patrimonioId: '', contratoId: '' }))}>
              <option value="">Nenhuma</option>
              {unidades.map((item) => (
                <option key={item.id} value={item.id}>{item.nome || item.codigoInterno}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Contrato relacionado</span>
            <select value={tarefa.contratoId} onChange={(event) => setTarefa((atual) => ({ ...atual, contratoId: event.target.value, patrimonioId: '', unidadeId: '' }))}>
              <option value="">Nenhum</option>
              {contratos.map((item) => (
                <option key={item.id} value={item.id}>{item.codigoInterno || item.id}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="button button-primary">Criar tarefa</button>
          </div>
        </form>
      </div>

      {itens.length === 0 ? (
        <div className="empty-state">
          <h2>Sem notificacoes no momento</h2>
          <p>Nao ha alertas ou tarefas para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Descricao</th>
                <th>Tipo</th>
                <th>Prioridade</th>
                <th>Data geracao</th>
                <th>Status</th>
                <th>Modulo</th>
                <th>Registro relacionado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.titulo || '-'}</td>
                  <td>{item.descricao || '-'}</td>
                  <td>{formatarLabel(item.tipo)}</td>
                  <td><span className={prioridadeClassName(item.prioridade)}>{formatarLabel(item.prioridade)}</span></td>
                  <td>
                    <div>{formatarDataHora(item.dataGeracao)}</div>
                    {item.isTarefa ? <small>Vence: {formatarData(item.dataVencimento)}</small> : null}
                  </td>
                  <td><span className={statusClassName(item.status)}>{formatarLabel(item.status)}</span></td>
                  <td>{item.modulo || '-'}</td>
                  <td>
                    <div>{item.registro || '-'}</div>
                    <small style={{ opacity: 0.8 }}>{item.registroId || '-'}</small>
                  </td>
                  <td>
                    <div className="table-actions">
                      {item.link ? (
                        <button type="button" className="button button-secondary" onClick={() => abrirRelacionamento(item)}>
                          Abrir
                        </button>
                      ) : null}

                      {!item.isTarefa && item.status === 'NAO_LIDA' ? (
                        <button type="button" className="button button-secondary" onClick={() => handleMarcarLida(item.id)}>
                          Marcar lida
                        </button>
                      ) : null}

                      {!item.isTarefa && item.status !== 'RESOLVIDA' && item.status !== 'ARQUIVADA' ? (
                        <button type="button" className="button button-secondary" onClick={() => handleResolver(item.id)}>
                          Resolver
                        </button>
                      ) : null}

                      {!item.isTarefa && item.status !== 'ARQUIVADA' ? (
                        <button type="button" className="button button-secondary" onClick={() => handleArquivar(item.id)}>
                          Arquivar
                        </button>
                      ) : null}

                      {item.isTarefa && item.status === 'PENDENTE' ? (
                        <button type="button" className="button button-primary" onClick={() => handleConcluirTarefa(item.id)}>
                          Concluir
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
