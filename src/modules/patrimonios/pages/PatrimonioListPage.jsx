import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PatrimonioCard from '../components/PatrimonioCard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  listarPatrimonios,
  alterarSituacaoPatrimonio,
  excluirPatrimonio,
} from '../services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { calcularResumoUnidadesPatrimonio } from '../utils/patrimonioUtils.js'
import {
  gruposPatrimoniais,
  tiposPatrimonio,
  situacoesPatrimonio,
} from '../constants/patrimonioConstants.js'
import ExportButtons from '../../reports/components/ExportButtons.jsx'

export default function PatrimonioListPage() {
  const [patrimonios, setPatrimonios] = useState([])
  const [unidades, setUnidades] = useState([])
  const [search, setSearch] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [situacaoFiltro, setSituacaoFiltro] = useState('')
  const [confirmExcluir, setConfirmExcluir] = useState(null)
  const [alert, setAlert] = useState(null)

  const atualizarLista = () => {
    setPatrimonios(listarPatrimonios())
    setUnidades(listarUnidades())
  }

  useEffect(() => {
    atualizarLista()

    const handleUnidadesUpdate = () => setUnidades(listarUnidades())
    window.addEventListener('cvholding_unidades_updated', handleUnidadesUpdate)

    return () => {
      window.removeEventListener('cvholding_unidades_updated', handleUnidadesUpdate)
    }
  }, [])

  const filtrados = useMemo(() => {
    return patrimonios.filter((item) => {
      const termo = search.trim().toLowerCase()
      const matchesSearch =
        !termo ||
        item.nome.toLowerCase().includes(termo) ||
        item.codigo.toLowerCase().includes(termo)
      const matchesGrupo = !grupoFiltro || item.grupoPatrimonial === grupoFiltro
      const matchesTipo = !tipoFiltro || item.tipo === tipoFiltro
      const matchesSituacao = !situacaoFiltro || item.situacao === situacaoFiltro
      return matchesSearch && matchesGrupo && matchesTipo && matchesSituacao
    })
  }, [patrimonios, search, grupoFiltro, tipoFiltro, situacaoFiltro])

  const unidadesPorPatrimonio = useMemo(() => {
    return unidades.reduce((acc, unidade) => {
      const patrimonioId = unidade?.patrimonioId
      if (!patrimonioId) return acc
      if (!acc[patrimonioId]) {
        acc[patrimonioId] = []
      }
      acc[patrimonioId].push(unidade)
      return acc
    }, {})
  }, [unidades])

  const rowsExportacao = useMemo(() => {
    return filtrados.map((item) => {
      const resumoUnidades = calcularResumoUnidadesPatrimonio(item, unidadesPorPatrimonio[item.id] || [])
      return {
        ...item,
        totalUnidades: resumoUnidades.totalPrevisto,
        unidadesCadastradas: resumoUnidades.cadastradas,
        unidadesOcupadas: resumoUnidades.ocupadas,
        unidadesVagas: resumoUnidades.vagas,
        taxaOcupacao: `${resumoUnidades.taxaOcupacao}%`,
      }
    })
  }, [filtrados, unidadesPorPatrimonio])

  const handleToggleSituacao = (patrimonio) => {
    const novaSituacao = patrimonio.situacao === 'Inativo' ? 'Ativo' : 'Inativo'
    alterarSituacaoPatrimonio(patrimonio.id, novaSituacao)
    atualizarLista()
    setAlert({ type: 'success', message: `Patrimônio ${novaSituacao.toLowerCase()} com sucesso.` })
  }

  const handleExcluir = () => {
    if (!confirmExcluir) return
    const ok = excluirPatrimonio(confirmExcluir.id)
    if (ok) {
      atualizarLista()
      setAlert({ type: 'success', message: 'Patrimônio excluído com sucesso.' })
    } else {
      setAlert({ type: 'error', message: 'Não é possível excluir este patrimônio com histórico relacionado.' })
    }
    setConfirmExcluir(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Gestão dos empreendimentos e ativos imobiliários da C&V Holding.</p>
          <h1>Patrimônio</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ExportButtons
            title="Patrimônios"
            filename="patrimonios"
            columns={[
              { key: 'nome', label: 'Nome' },
              { key: 'codigo', label: 'Código' },
              { key: 'grupoPatrimonial', label: 'Tipo do patrimônio' },
              { key: 'tipo', label: 'Grupo/classificação' },
              { key: 'totalUnidades', label: 'Total de unidades' },
              { key: 'unidadesCadastradas', label: 'Cadastradas' },
              { key: 'unidadesOcupadas', label: 'Ocupadas' },
              { key: 'unidadesVagas', label: 'Vagas' },
              { key: 'taxaOcupacao', label: 'Ocupação' },
              { key: 'situacao', label: 'Situação' },
            ]}
            rows={rowsExportacao}
          />
          <Link to="/patrimonios/novo" className="button button-primary">
            Novo patrimônio
          </Link>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Buscar por nome ou código</label>
          <input
            type="search"
            value={search}
            placeholder="Digite nome ou código"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Tipo do patrimônio</label>
          <select value={grupoFiltro} onChange={(event) => setGrupoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {gruposPatrimoniais.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Grupo/classificação</label>
          <select value={tipoFiltro} onChange={(event) => setTipoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {tiposPatrimonio.map((item) => (
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
            {situacoesPatrimonio.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {alert ? (
        <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {alert.message}
        </div>
      ) : null}

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum patrimônio encontrado"
          description="Cadastre um patrimônio para começar a gerir os ativos imobiliários da Holding."
          actionLabel="Cadastrar patrimônio"
          actionLink="/patrimonios/novo"
        />
      ) : (
        <div className="patrimonios-grid">
          {filtrados.map((item) => (
            <PatrimonioCard
              key={item.id}
              patrimonio={item}
              unidadesVinculadas={unidadesPorPatrimonio[item.id] || []}
              onToggleSituacao={handleToggleSituacao}
              onExcluir={() => setConfirmExcluir(item)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmExcluir)}
        title="Confirmar exclusão"
        message="Tem certeza de que deseja excluir este patrimônio? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmExcluir(null)}
      />
    </div>
  )
}
