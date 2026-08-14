import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { listarContratos, alterarSituacaoContrato, excluirContrato } from '../services/contratoService.js'
import { situacoesContrato } from '../constants/contratoConstants.js'
import EmptyState from '../../patrimonios/components/EmptyState.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import ExportButtons from '../../reports/components/ExportButtons.jsx'
import { listarContratosVencendoPrazo, listarReajustesPendentes } from '../services/reajusteService.js'
import { obterPreferenciasInterface } from '../../configuracoes/services/configuracaoService.js'

// Usado para casar com as variantes de cor já existentes em .status-badge-*
// (ex.: "Ativo" -> "ativo", "Cancelado" -> "cancelado").
function situacaoClasse(situacao) {
  return (situacao || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
}

export default function ContratoListPage() {
  const location = useLocation()
  const [contratos, setContratos] = useState([])
  const [search, setSearch] = useState('')
  const [situacaoFiltro, setSituacaoFiltro] = useState('')
  const [patrimonioFiltro, setPatrimonioFiltro] = useState('')
  const [alertaFiltro, setAlertaFiltro] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [alert, setAlert] = useState(null)
  const itensPorPagina = Number(obterPreferenciasInterface()?.itensPorPagina || 20)

  useEffect(() => {
    setContratos(listarContratos())
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('termo') || '')
    setSituacaoFiltro(params.get('situacao') || '')
    setPatrimonioFiltro(params.get('patrimonioId') || '')
    setAlertaFiltro(params.get('alerta') || '')
  }, [location.search])

  const atualizarLista = () => setContratos(listarContratos())

  const contratosFiltradosPorAlerta = useMemo(() => {
    if (!alertaFiltro) return null

    if (alertaFiltro === 'vencendo') {
      const ids = new Set(
        listarContratosVencendoPrazo()
          .filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 30)
          .map((item) => item.contrato.id),
      )
      return ids
    }

    if (alertaFiltro === 'vencidos') {
      const ids = new Set(
        listarContratosVencendoPrazo()
          .filter((item) => item.diasRestantes < 0)
          .map((item) => item.contrato.id),
      )
      return ids
    }

    if (alertaFiltro === 'reajustes-pendentes') {
      const ids = new Set(listarReajustesPendentes().map((item) => item.contrato.id))
      return ids
    }

    return null
  }, [alertaFiltro, contratos])

  const filtrados = useMemo(() => {
    return contratos
      .filter((item) => {
        const termo = search.trim().toLowerCase()
        const locatario = buscarLocatarioPorId(item.locatarioId)
        const unidade = buscarUnidadePorId(item.unidadeId)
        const patrimonio = buscarPatrimonioPorId(item.patrimonioId)
        const matchesSearch =
          !termo ||
          item.codigoInterno.toLowerCase().includes(termo) ||
          locatario?.nomeCompleto.toLowerCase().includes(termo) ||
          unidade?.nome.toLowerCase().includes(termo) ||
          patrimonio?.nome.toLowerCase().includes(termo)
        const matchesSituacao = !situacaoFiltro || item.situacao === situacaoFiltro
        const matchesPatrimonio = !patrimonioFiltro || item.patrimonioId === patrimonioFiltro
        const matchesAlerta = !contratosFiltradosPorAlerta || contratosFiltradosPorAlerta.has(item.id)
        return matchesSearch && matchesSituacao && matchesPatrimonio && matchesAlerta
      })
      // Ordem crescente por nome da unidade (antes vinha na ordem de
      // cadastro). "numeric: true" faz "Kit 2" vir antes de "Kit 12" em vez
      // de comparar caractere a caractere.
      .sort((a, b) => {
        const unidadeA = buscarUnidadePorId(a.unidadeId)?.nome || ''
        const unidadeB = buscarUnidadePorId(b.unidadeId)?.nome || ''
        return unidadeA.localeCompare(unidadeB, 'pt-BR', { numeric: true, sensitivity: 'base' })
      })
  }, [contratos, search, situacaoFiltro, patrimonioFiltro, contratosFiltradosPorAlerta])

  const paginados = useMemo(() => filtrados.slice(0, itensPorPagina), [filtrados, itensPorPagina])

  const handleAction = (contrato, action) => {
    setConfirm({ contrato, action })
  }

  const confirmarAcao = () => {
    if (!confirm) return
    const { contrato, action } = confirm
    if (action === 'excluir') {
      const ok = excluirContrato(contrato.id)
      if (ok) {
        setAlert({ type: 'success', message: 'Contrato excluído com sucesso.' })
      } else {
        setAlert({ type: 'error', message: 'Não é possível excluir um contrato ativo.' })
      }
    } else {
      const result = alterarSituacaoContrato(contrato.id, action)
      if (result?.error) {
        setAlert({ type: 'error', message: result.error })
      } else {
        setAlert({ type: 'success', message: `Contrato ${action.toLowerCase()} com sucesso.` })
      }
    }
    atualizarLista()
    setConfirm(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Gestão de contratos vinculados a patrimônios e unidades.</p>
          <h1>Contratos</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ExportButtons
            title="Contratos"
            filename="contratos"
            columns={[
              { key: 'codigoInterno', label: 'Código' },
              { key: 'locatario', label: 'Locatário' },
              { key: 'unidade', label: 'Unidade' },
              { key: 'patrimonio', label: 'Patrimônio' },
              { key: 'situacao', label: 'Situação' },
            ]}
            rows={filtrados.map((item) => {
              const locatario = buscarLocatarioPorId(item.locatarioId)
              const unidade = buscarUnidadePorId(item.unidadeId)
              const patrimonio = buscarPatrimonioPorId(item.patrimonioId)
              return {
                ...item,
                locatario: locatario?.nomeCompleto || 'N/A',
                unidade: unidade?.nome || 'N/A',
                patrimonio: patrimonio?.nome || 'N/A',
              }
            })}
          />
          <Link to="/contratos/novo" className="button button-primary">
            Novo contrato
          </Link>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Buscar por código, locatário, unidade ou patrimônio</label>
          <input type="search" value={search} placeholder="Digite código, locatário, unidade ou patrimônio" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Situação</label>
          <select value={situacaoFiltro} onChange={(event) => setSituacaoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {situacoesContrato.map((situacao) => (
              <option key={situacao} value={situacao}>
                {situacao}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Patrimônio</label>
          <select value={patrimonioFiltro} onChange={(event) => setPatrimonioFiltro(event.target.value)}>
            <option value="">Todos</option>
            {Array.from(new Set(contratos.map((item) => buscarPatrimonioPorId(item.patrimonioId)?.id).filter(Boolean))).map((patrimonioId) => {
              const patrimonio = buscarPatrimonioPorId(patrimonioId)
              return patrimonio ? (
                <option key={patrimonio.id} value={patrimonio.id}>
                  {patrimonio.nome}
                </option>
              ) : null
            })}
          </select>
        </div>
      </div>

      <div className="page-header">
        <div className="dashboard-grid">
          <div className="summary-card">
            <strong>{filtrados.length}</strong>
            <span>Total de contratos</span>
          </div>
        </div>
      </div>

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum contrato encontrado"
          description="Cadastre um contrato para começar a gestão de locações."
          actionLabel="Cadastrar contrato"
          actionLink="/contratos/novo"
        />
      ) : (
        <div className="collapsible-list">
          {paginados.map((item) => {
            const locatario = buscarLocatarioPorId(item.locatarioId)
            const unidade = buscarUnidadePorId(item.unidadeId)
            const patrimonio = buscarPatrimonioPorId(item.patrimonioId)
            return (
              <details className="collapsible-card" key={item.id}>
                <summary>
                  <span className="collapsible-card-title">
                    <span className="name">{item.codigoInterno}</span>
                    <span className="meta">{locatario?.nomeCompleto || 'N/A'}</span>
                    <span className={`status-badge status-badge-${situacaoClasse(item.situacao)}`}>{item.situacao}</span>
                  </span>
                  <span className="collapsible-card-chevron"><ChevronDown size={18} /></span>
                </summary>
                <div className="collapsible-card-body">
                  <dl className="collapsible-card-fields">
                    <div>
                      <dt>Unidade</dt>
                      <dd>{unidade?.nome || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt>Patrimônio</dt>
                      <dd>{patrimonio?.nome || 'N/A'}</dd>
                    </div>
                  </dl>
                  <div className="collapsible-card-actions">
                    <Link className="button button-secondary" to={`/contratos/${item.id}`}>
                      Visualizar
                    </Link>
                    <Link className="button button-secondary" to={`/contratos/${item.id}/editar`}>
                      Editar
                    </Link>
                    {item.situacao === 'Rascunho' ? (
                      <button className="button button-primary" type="button" onClick={() => handleAction(item, 'Ativo')}>
                        Ativar
                      </button>
                    ) : null}
                    {item.situacao === 'Ativo' ? (
                      <button className="button button-secondary" type="button" onClick={() => handleAction(item, 'Encerrado')}>
                        Encerrar
                      </button>
                    ) : null}
                    {['Rascunho', 'Ativo'].includes(item.situacao) ? (
                      <button className="button button-danger" type="button" onClick={() => handleAction(item, 'Cancelado')}>
                        Cancelar
                      </button>
                    ) : null}
                    {item.situacao !== 'Ativo' ? (
                      <button className="button button-danger" type="button" onClick={() => handleAction(item, 'excluir')}>
                        Excluir
                      </button>
                    ) : null}
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.action === 'excluir'
            ? 'Confirmar exclusão'
            : `Confirmar ${confirm?.action.toLowerCase()}`
        }
        message={
          confirm?.action === 'excluir'
            ? 'Tem certeza de que deseja excluir este contrato?'
            : `Tem certeza de que deseja ${confirm?.action.toLowerCase()} este contrato?`
        }
        confirmLabel={confirm?.action === 'excluir' ? 'Excluir' : confirm?.action}
        cancelLabel="Cancelar"
        onConfirm={confirmarAcao}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
