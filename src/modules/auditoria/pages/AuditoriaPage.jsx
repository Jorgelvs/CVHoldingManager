import React, { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listarEventosAuditoria, listarResumoFiltrosAuditoria } from '../services/auditoriaService.js'

const filtrosPadrao = {
  periodoInicio: '',
  periodoFim: '',
  modulo: '',
  acao: '',
  usuario: '',
  termo: '',
  registroId: '',
}

function formatarDataHora(valor) {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR')
}

function formatarValor(valor) {
  if (valor === null || valor === undefined) return '-'
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor)
  }

  try {
    return JSON.stringify(valor, null, 2)
  } catch {
    return '-'
  }
}

export default function AuditoriaPage() {
  const location = useLocation()
  const [filtros, setFiltros] = useState(filtrosPadrao)

  React.useEffect(() => {
    const params = new URLSearchParams(location.search)
    setFiltros({
      periodoInicio: params.get('periodoInicio') || '',
      periodoFim: params.get('periodoFim') || '',
      modulo: params.get('modulo') || '',
      acao: params.get('acao') || '',
      usuario: params.get('usuario') || '',
      termo: params.get('termo') || '',
      registroId: params.get('registroId') || '',
    })
  }, [location.search])

  const resumo = listarResumoFiltrosAuditoria()
  const eventos = useMemo(() => listarEventosAuditoria(filtros), [filtros])

  const handleChange = (campo, valor) => {
    setFiltros((current) => ({ ...current, [campo]: valor }))
  }

  const limpar = () => setFiltros(filtrosPadrao)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Rastreabilidade de alterações do sistema.</p>
          <h1>Auditoria</h1>
        </div>
      </div>

      <div className="filters-panel audit-filters">
        <div className="filter-group">
          <label>Período início</label>
          <input type="date" value={filtros.periodoInicio} onChange={(event) => handleChange('periodoInicio', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Período fim</label>
          <input type="date" value={filtros.periodoFim} onChange={(event) => handleChange('periodoFim', event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Módulo</label>
          <select value={filtros.modulo} onChange={(event) => handleChange('modulo', event.target.value)}>
            <option value="">Todos</option>
            {resumo.modulos.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Ação</label>
          <select value={filtros.acao} onChange={(event) => handleChange('acao', event.target.value)}>
            <option value="">Todas</option>
            {resumo.acoes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Usuário</label>
          <select value={filtros.usuario} onChange={(event) => handleChange('usuario', event.target.value)}>
            <option value="">Todos</option>
            {resumo.usuarios.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Registro (ID)</label>
          <input type="text" value={filtros.registroId} onChange={(event) => handleChange('registroId', event.target.value)} placeholder="Ex: c-123" />
        </div>
        <div className="filter-group">
          <label>Pesquisa</label>
          <input type="search" value={filtros.termo} onChange={(event) => handleChange('termo', event.target.value)} placeholder="Descrição ou registro" />
        </div>
        <div className="audit-reset-wrap">
          <button type="button" className="button button-secondary" onClick={limpar}>Limpar filtros</button>
        </div>
      </div>

      {eventos.length === 0 ? (
        <div className="empty-state">
          <div>
            <h2>Sem registros de auditoria</h2>
            <p>Nenhum evento foi encontrado para os filtros informados.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Módulo</th>
                <th>Ação</th>
                <th>Registro</th>
                <th>Descrição</th>
                <th>Campos alterados</th>
                <th>Valor anterior</th>
                <th>Novo valor</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td>{formatarDataHora(evento.dataHora)}</td>
                  <td>{evento.usuario || '-'}</td>
                  <td>{evento.modulo || '-'}</td>
                  <td>{evento.acao || '-'}</td>
                  <td>
                    <div>{evento.registro || '-'}</div>
                    <small className="muted-small">{evento.registroId || '-'}</small>
                  </td>
                  <td>{evento.descricao || '-'}</td>
                  <td>{Array.isArray(evento.camposAlterados) && evento.camposAlterados.length > 0 ? evento.camposAlterados.join(', ') : '-'}</td>
                  <td>
                    <pre className="audit-json">{formatarValor(evento.valorAnterior)}</pre>
                  </td>
                  <td>
                    <pre className="audit-json">{formatarValor(evento.novoValor)}</pre>
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
