import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { formatarData, formatarMoeda, calcularResumoUnidadesPatrimonio, enderecoResumo } from '../utils/patrimonioUtils.js'
import {
  buscarPatrimonioPorId,
  alterarSituacaoPatrimonio,
  excluirPatrimonio,
  podeExcluirPatrimonio,
} from '../services/patrimonioService.js'
import { listarUnidadesPorPatrimonio } from '../../unidades/services/unidadeService.js'
import StatusBadge from '../components/StatusBadge.jsx'
import Tabs from '../components/Tabs.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { buildFirstUnitSuggestion } from '../../unidades/utils/firstUnitAssistant.js'

const tabItems = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'unidades', label: 'Unidades' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'manutencoes', label: 'Manutenções' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'configuracoes', label: 'Configurações' },
]

export default function PatrimonioDetalhesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [patrimonio, setPatrimonio] = useState(null)
  const [unidades, setUnidades] = useState([])
  const [activeTab, setActiveTab] = useState('resumo')
  const [alert, setAlert] = useState(null)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const handleRefresh = () => {
    setPatrimonio(buscarPatrimonioPorId(id))
    setUnidades(listarUnidadesPorPatrimonio(id))
  }

  const handleToggleSituacao = () => {
    if (!patrimonio) return
    const novaSituacao = patrimonio.situacao === 'Inativo' ? 'Ativo' : 'Inativo'
    alterarSituacaoPatrimonio(patrimonio.id, novaSituacao)
    handleRefresh()
    setAlert({ type: 'success', message: `Situação alterada para ${novaSituacao}.` })
  }

  const handleExcluir = () => {
    if (!patrimonio) return
    const ok = excluirPatrimonio(patrimonio.id)
    if (ok) {
      navigate('/patrimonios')
      return
    }
    setAlert({ type: 'error', message: 'Este patrimônio não pode ser excluído porque tem histórico relacionado.' })
    setConfirmExcluir(false)
  }

  useEffect(() => {
    handleRefresh()

    const handleUnidadesUpdate = () => setUnidades(listarUnidadesPorPatrimonio(id))
    window.addEventListener('cvholding_unidades_updated', handleUnidadesUpdate)

    return () => {
      window.removeEventListener('cvholding_unidades_updated', handleUnidadesUpdate)
    }
  }, [id])

  const resumoUnidades = useMemo(
    () => calcularResumoUnidadesPatrimonio(patrimonio || {}, unidades),
    [patrimonio, unidades],
  )
  const endereco = patrimonio ? enderecoResumo(patrimonio.endereco) : ''
  const podeCriarPrimeiraUnidade = Boolean(
    patrimonio && patrimonio.situacao === 'Ativo' && resumoUnidades.cadastradas === 0,
  )

  useEffect(() => {
    const message = location.state?.message
    if (!message) return
    setAlert({ type: 'success', message })
  }, [location.state])

  const handleCriarPrimeiraUnidade = () => {
    if (!patrimonio) return
    navigate('/unidades/nova', {
      state: {
        patrimonioId: patrimonio.id,
        returnToPatrimonioId: patrimonio.id,
        assistFirstUnit: true,
        lockPatrimonio: true,
        simplified: true,
        suggestedUnidade: buildFirstUnitSuggestion(patrimonio),
      },
    })
  }

  if (!patrimonio) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Patrimônio não encontrado</h1>
        </div>
        <p>O patrimônio solicitado não foi localizado.</p>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="details-header">
        <div>
          <div className="details-title-row">
            <h1>{patrimonio.nome}</h1>
            <StatusBadge status={patrimonio.situacao} />
          </div>
          <p className="details-meta">{patrimonio.codigo} — Tipo: {patrimonio.grupoPatrimonial} • Classificação: {patrimonio.tipo}</p>
          {endereco ? <p className="details-meta">{endereco}</p> : null}
          <p className="details-meta">Situação registral: {patrimonio.situacaoRegistral || 'Não informado'}</p>
        </div>
        <div className="details-actions">
          <Link className="button button-secondary" to={`/auditoria?modulo=Patrimônios&registroId=${patrimonio.id}`}>
            Ver histórico
          </Link>
          <button className="button button-secondary" type="button" onClick={() => navigate(`/patrimonios/${patrimonio.id}/editar`)}>
            Editar
          </button>
          <button className="button button-secondary" type="button" onClick={handleToggleSituacao}>
            {patrimonio.situacao === 'Inativo' ? 'Reativar' : 'Inativar'}
          </button>
          {podeCriarPrimeiraUnidade ? (
            <button className="button button-primary" type="button" onClick={handleCriarPrimeiraUnidade}>
              Criar primeira unidade
            </button>
          ) : null}
          <button className="button button-danger" type="button" onClick={() => setConfirmExcluir(true)}>
            Excluir
          </button>
        </div>
      </div>

      {alert ? <div className={`alert-box ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>{alert.message}</div> : null}

      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />

      <div className="tab-content">
        {activeTab === 'resumo' && (
          <div className="summary-grid">
            <div className="summary-card">
              <strong>{resumoUnidades.totalPrevisto}</strong>
              <span>Unidades</span>
            </div>
            <div className="summary-card">
              <strong>{resumoUnidades.cadastradas}</strong>
              <span>Unidades cadastradas</span>
            </div>
            <div className="summary-card">
              <strong>{resumoUnidades.ocupadas}</strong>
              <span>Ocupadas</span>
            </div>
            <div className="summary-card">
              <strong>{resumoUnidades.vagas}</strong>
              <span>Vagas</span>
            </div>
            <div className="summary-card">
              <strong>{resumoUnidades.emManutencao}</strong>
              <span>Em manutenção</span>
            </div>
            <div className="summary-card">
              <strong>{resumoUnidades.taxaOcupacao}%</strong>
              <span>Taxa de ocupação</span>
            </div>
          </div>
        )}

        {activeTab === 'resumo' && (
          <div className="summary-details">
            <div>
              <h2>Dados do patrimônio</h2>
              <dl>
                <dt>Finalidade</dt><dd>{patrimonio.finalidade || 'Não informado'}</dd>
                <dt>Modelo de receita</dt><dd>{patrimonio.modeloReceita || 'Não informado'}</dd>
                <dt>Situação registral</dt><dd>{patrimonio.situacaoRegistral || 'Não informado'}</dd>
                <dt>Quantidade de unidades</dt><dd>{resumoUnidades.totalPrevisto || 'Não informado'}</dd>
                <dt>Valor patrimonial</dt><dd>{patrimonio.valorPatrimonial ? formatarMoeda(patrimonio.valorPatrimonial) : 'Não informado'}</dd>
                <dt>Situação</dt><dd>{patrimonio.situacao || 'Não informado'}</dd>
                <dt>Data de aquisição</dt><dd>{patrimonio.dataAquisicao ? formatarData(patrimonio.dataAquisicao) : 'Não informado'}</dd>
                <dt>Valor de aquisição</dt><dd>{patrimonio.valorAquisicao ? formatarMoeda(patrimonio.valorAquisicao) : 'Não informado'}</dd>
              </dl>
            </div>
            <div>
              <h2>Configurações principais</h2>
              <dl>
                <dt>Água</dt><dd>{patrimonio.configuracoes?.agua || '-'}</dd>
                <dt>Energia</dt><dd>{patrimonio.configuracoes?.energia || '-'}</dd>
                <dt>Condomínio</dt><dd>{patrimonio.configuracoes?.condominio || '-'}</dd>
                <dt>IPTU</dt><dd>{patrimonio.configuracoes?.iptu || '-'}</dd>
                <dt>Limpeza</dt><dd>{patrimonio.configuracoes?.limpeza || '-'}</dd>
                <dt>Regra de rateio</dt><dd>{patrimonio.configuracoes?.regraRateio || '-'}</dd>
              </dl>
            </div>
            <div>
              <h2>Observações</h2>
              <p>{patrimonio.observacoes || 'Sem observações.'}</p>
            </div>
          </div>
        )}

        {activeTab === 'unidades' && (
          <div className="summary-details">
            <div className="summary-card">
              <h2>Unidades vinculadas</h2>
              <p>{resumoUnidades.cadastradas} unidades encontradas</p>
              <p>Ocupadas: {resumoUnidades.ocupadas}</p>
              <p>Disponíveis: {resumoUnidades.vagas}</p>
              <p>Em manutenção: {resumoUnidades.emManutencao}</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => navigate(`/patrimonios/${patrimonio.id}/unidades`)}
              >
                Ver unidades do patrimônio
              </button>
            </div>
          </div>
        )}
        {activeTab !== 'resumo' && activeTab !== 'configuracoes' && activeTab !== 'unidades' && (
          <div className="placeholder-card">
            <p>Módulo será implementado em uma próxima Sprint.</p>
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <div className="config-grid">
            <div className="config-block">
              <h2>Configurações operacionais</h2>
              <dl>
                <dt>Água</dt><dd>{patrimonio.configuracoes?.agua || '-'}</dd>
                <dt>Energia</dt><dd>{patrimonio.configuracoes?.energia || '-'}</dd>
                <dt>Condomínio</dt><dd>{patrimonio.configuracoes?.condominio || '-'}</dd>
                <dt>IPTU</dt><dd>{patrimonio.configuracoes?.iptu || '-'}</dd>
                <dt>Limpeza</dt><dd>{patrimonio.configuracoes?.limpeza || '-'}</dd>
                <dt>Regra de rateio</dt><dd>{patrimonio.configuracoes?.regraRateio || '-'}</dd>
                <dt>Valor padrão de condomínio</dt><dd>{formatarMoeda(patrimonio.configuracoes?.valorPadraoCondominio)}</dd>
              </dl>
            </div>
            <div className="config-block">
              <h2>Observações operacionais</h2>
              <p>{patrimonio.configuracoes?.observacoesOperacionais || 'Sem observações operacionais.'}</p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmExcluir}
        title="Confirmar exclusão"
        message="Esse patrimônio será excluído apenas se não tiver unidades ou histórico relacionado."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmExcluir(false)}
      />
    </div>
  )
}
