import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listarUnidades, alterarSituacaoUnidade, listarUnidadesPorPatrimonio } from '../services/unidadeService.js'
import { tiposUnidade, finalidadesUnidade, situacoesUnidade } from '../constants/unidadeConstants.js'
import EmptyState from '../../patrimonios/components/EmptyState.jsx'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'
import ExportButtons from '../../reports/components/ExportButtons.jsx'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { contratoAtivoPorUnidade } from '../../contratos/services/contratoService.js'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'

export default function UnidadeListPage() {
  const { patrimonioId } = useParams()
  const [unidades, setUnidades] = useState([])
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [finalidadeFiltro, setFinalidadeFiltro] = useState('')
  const [situacaoFiltro, setSituacaoFiltro] = useState('')
  const [confirmSituacao, setConfirmSituacao] = useState(null)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    if (patrimonioId) {
      setUnidades(listarUnidadesPorPatrimonio(patrimonioId))
    } else {
      setUnidades(listarUnidades())
    }
  }, [patrimonioId])

  const atualizarLista = () => {
    if (patrimonioId) {
      setUnidades(listarUnidadesPorPatrimonio(patrimonioId))
    } else {
      setUnidades(listarUnidades())
    }
  }

  // Antes: buscarPatrimonioPorId era chamado dentro do .map() de cada linha
  // (e de novo no export), e cada chamada renormalizava a lista inteira de
  // patrimônios. Agora monta o mapa uma única vez por render da lista.
  const patrimoniosPorId = useMemo(() => {
    const mapa = new Map()
    listarPatrimonios().forEach((item) => mapa.set(item.id, item))
    return mapa
  }, [unidades])

  const inquilinoAtualDaUnidade = (unidadeId) => {
    const contrato = contratoAtivoPorUnidade(unidadeId)
    if (!contrato) return null
    return buscarLocatarioPorId(contrato.locatarioId)
  }

  const filtrados = useMemo(() => {
    return unidades.filter((item) => {
      const termo = search.trim().toLowerCase()
      const matchesSearch = !termo || item.nome.toLowerCase().includes(termo) || item.codigoInterno.toLowerCase().includes(termo)
      const matchesTipo = !tipoFiltro || item.tipo === tipoFiltro
      const matchesFinalidade = !finalidadeFiltro || item.finalidade === finalidadeFiltro
      const matchesSituacao = !situacaoFiltro || item.situacao === situacaoFiltro
      return matchesSearch && matchesTipo && matchesFinalidade && matchesSituacao
    })
  }, [unidades, search, tipoFiltro, finalidadeFiltro, situacaoFiltro])

  const resumo = useMemo(() => {
    const totals = {
      total: filtrados.length,
      disponiveis: filtrados.filter((item) => item.situacao === 'Disponível').length,
      ocupadas: filtrados.filter((item) => item.situacao === 'Ocupada').length,
      implantacao: filtrados.filter((item) => item.situacao === 'Em implantação').length,
      manutencao: filtrados.filter((item) => item.situacao === 'Em manutenção').length,
      desativadas: filtrados.filter((item) => item.situacao === 'Desativada').length,
    }
    return totals
  }, [filtrados])

  const handleAlterarSituacao = (unidade, situacao) => {
    setConfirmSituacao({ unidade, situacao })
  }

  const confirmarAlteracao = () => {
    if (!confirmSituacao) return
    alterarSituacaoUnidade(confirmSituacao.unidade.id, confirmSituacao.situacao)
    atualizarLista()
    setAlert({ type: 'success', message: 'Situação da unidade alterada com sucesso.' })
    setConfirmSituacao(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Lista de unidades vinculadas ao patrimônio.</p>
          <h1>Unidades</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ExportButtons
            title="Unidades"
            filename="unidades"
            columns={[
              { key: 'nome', label: 'Nome' },
              { key: 'codigoInterno', label: 'Código' },
              { key: 'patrimonioNome', label: 'Patrimônio' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'finalidade', label: 'Finalidade' },
              { key: 'situacao', label: 'Situação' },
              { key: 'inquilinoAtual', label: 'Inquilino atual' },
            ]}
            rows={filtrados.map((item) => ({
              ...item,
              patrimonioNome: patrimoniosPorId.get(item.patrimonioId)?.nome || '-',
              inquilinoAtual: inquilinoAtualDaUnidade(item.id)?.nomeCompleto || '-',
            }))}
          />
          <Link
            to={patrimonioId ? `/patrimonios/${patrimonioId}/unidades/nova` : '/unidades/nova'}
            state={patrimonioId ? { patrimonioId } : undefined}
            className="button button-primary"
          >
            Nova unidade
          </Link>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Buscar por nome ou código</label>
          <input type="search" value={search} placeholder="Digite nome ou código" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="filter-group">
          <label>Tipo</label>
          <select value={tipoFiltro} onChange={(event) => setTipoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {tiposUnidade.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Finalidade</label>
          <select value={finalidadeFiltro} onChange={(event) => setFinalidadeFiltro(event.target.value)}>
            <option value="">Todos</option>
            {finalidadesUnidade.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Situação</label>
          <select value={situacaoFiltro} onChange={(event) => setSituacaoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {situacoesUnidade.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="page-header">
        <div className="dashboard-grid">
          <div className="summary-card">
            <strong>{resumo.total}</strong>
            <span>Total</span>
          </div>
          <div className="summary-card">
            <strong>{resumo.disponiveis}</strong>
            <span>Disponíveis</span>
          </div>
          <div className="summary-card">
            <strong>{resumo.ocupadas}</strong>
            <span>Ocupadas</span>
          </div>
          <div className="summary-card">
            <strong>{resumo.implantacao}</strong>
            <span>Em implantação</span>
          </div>
          <div className="summary-card">
            <strong>{resumo.manutencao}</strong>
            <span>Em manutenção</span>
          </div>
          <div className="summary-card">
            <strong>{resumo.desativadas}</strong>
            <span>Desativadas</span>
          </div>
        </div>
      </div>

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhuma unidade encontrada"
          description="Ajuste os filtros ou cadastre uma nova unidade para começar a gestão."
          actionLabel="Cadastrar unidade"
          actionLink={patrimonioId ? `/patrimonios/${patrimonioId}/unidades/nova` : '/unidades/nova'}
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Patrimônio</th>
                <th>Tipo</th>
                <th>Finalidade</th>
                <th>Situação</th>
                <th>Inquilino atual</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.codigoInterno}</td>
                  <td>{patrimoniosPorId.get(item.patrimonioId)?.nome || '-'}</td>
                  <td>{item.tipo}</td>
                  <td>{item.finalidade}</td>
                  <td>{item.situacao}</td>
                  <td>{inquilinoAtualDaUnidade(item.id)?.nomeCompleto || '—'}</td>
                  <td className="table-actions">
                    <Link
                      className="button button-secondary"
                      to={`/unidades/${item.id}`}
                      state={patrimonioId ? { patrimonioId } : undefined}
                    >
                      Visualizar
                    </Link>
                    <Link
                      className="button button-secondary"
                      to={`/unidades/${item.id}/editar`}
                      state={patrimonioId ? { patrimonioId } : undefined}
                    >
                      Editar
                    </Link>
                    <select
                      value=""
                      onChange={(event) => {
                        const nextSituacao = event.target.value
                        if (['Desativada', 'Em manutenção', 'Em implantação'].includes(nextSituacao)) {
                          handleAlterarSituacao(item, nextSituacao)
                        } else {
                          alterarSituacaoUnidade(item.id, nextSituacao)
                          atualizarLista()
                          setAlert({ type: 'success', message: 'Situação da unidade alterada com sucesso.' })
                        }
                        event.target.value = ''
                      }}
                    >
                      <option value="">Alterar situação</option>
                      {situacoesUnidade.map((situacao) => (
                        <option key={situacao} value={situacao}>
                          {situacao}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmSituacao)}
        title="Confirmar alteração"
        message={`Confirma alterar a situação da unidade para ${confirmSituacao?.situacao}?`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={confirmarAlteracao}
        onCancel={() => setConfirmSituacao(null)}
      />
    </div>
  )
}
