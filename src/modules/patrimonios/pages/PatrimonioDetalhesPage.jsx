import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatarData, formatarMoeda, calcularTaxaOcupacao, enderecoResumo } from '../utils/patrimonioUtils.js'
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
  const [patrimonio, setPatrimonio] = useState(() => buscarPatrimonioPorId(id))
  const [activeTab, setActiveTab] = useState('resumo')
  const [alert, setAlert] = useState(null)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const handleRefresh = () => {
    setPatrimonio(buscarPatrimonioPorId(id))
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

  const resumoTaxa = useMemo(() => calcularTaxaOcupacao(patrimonio || {}), [patrimonio])
  const endereco = patrimonio ? enderecoResumo(patrimonio.endereco) : ''
  const unidades = useMemo(
    () => (patrimonio ? listarUnidadesPorPatrimonio(patrimonio.id) : []),
    [patrimonio],
  )

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
          <p className="details-meta">{patrimonio.codigo} — {patrimonio.grupoPatrimonial} • {patrimonio.tipo}</p>
          {endereco ? <p className="details-meta">{endereco}</p> : null}
          <p className="details-meta">Situação registral: {patrimonio.situacaoRegistral || 'Não informado'}</p>
        </div>
        <div className="details-actions">
          <button className="button button-secondary" type="button" onClick={() => navigate(`/patrimonios/${patrimonio.id}/editar`)}>
            Editar
          </button>
          <button className="button button-secondary" type="button" onClick={handleToggleSituacao}>
            {patrimonio.situacao === 'Inativo' ? 'Reativar' : 'Inativar'}
          </button>
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
              <strong>{patrimonio.quantidadeUnidades || 0}</strong>
              <span>Unidades</span>
            </div>
            <div className="summary-card">
              <strong>{patrimonio.indicadores?.unidadesCadastradas || 0}</strong>
              <span>Unidades cadastradas</span>
            </div>
            <div className="summary-card">
              <strong>{patrimonio.indicadores?.unidadesOcupadas || 0}</strong>
              <span>Ocupadas</span>
            </div>
            <div className="summary-card">
              <strong>{patrimonio.indicadores?.unidadesVagas || 0}</strong>
              <span>Vagas</span>
            </div>
            <div className="summary-card">
              <strong>{patrimonio.indicadores?.unidadesEmManutencao || 0}</strong>
              <span>Em manutenção</span>
            </div>
            <div className="summary-card">
              <strong>{resumoTaxa}%</strong>
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
                <dt>Quantidade de unidades</dt><dd>{patrimonio.quantidadeUnidades || 'Não informado'}</dd>
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
                <dt>Manutenção</dt><dd>{patrimonio.configuracoes?.manutencao || '-'}</dd>
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
              <p>{unidades.length} unidades encontradas</p>
              <p>Ocupadas: {unidades.filter((item) => item.situacao === 'Ocupada').length}</p>
              <p>Disponíveis: {unidades.filter((item) => item.situacao === 'Disponível').length}</p>
              <p>Em manutenção: {unidades.filter((item) => item.situacao === 'Em manutenção').length}</p>
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
                <dt>Manutenção</dt><dd>{patrimonio.configuracoes?.manutencao || '-'}</dd>
                <dt>Regra de rateio</dt><dd>{patrimonio.configuracoes?.regraRateio || '-'}</dd>
                <dt>Valor padrão de condomínio</dt><dd>{formatarMoeda(patrimonio.configuracoes?.valorPadraoCondominio)}</dd>
                <dt>Dia padrão de vencimento</dt><dd>{patrimonio.configuracoes?.diaPadraoVencimento || '-'}</dd>
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
