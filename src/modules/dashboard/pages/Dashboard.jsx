import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import UniversalEntryButton from '../../../components/UniversalEntryButton.jsx'
import DashboardCard from '../components/DashboardCard.jsx'
import FilterPeriod from '../components/FilterPeriod.jsx'
import ChartFinanceiro from '../components/ChartFinanceiro.jsx'
import { listarContas } from '../../financeiro/services/contaService.js'
import { getDashboardData, formatarValor, formatarVariacao } from '../services/dashboardService.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [periodo, setPeriodo] = useState(() => {
    const anoAtual = new Date().getFullYear()
    const mesAtual = new Date().getMonth() + 1
    const anoParam = Number(searchParams.get('ano') || anoAtual)
    const mesParam = Number(searchParams.get('mes') || mesAtual)
    const ano = Number.isInteger(anoParam) && anoParam > 1900 ? anoParam : anoAtual
    const mes = Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12 ? mesParam : mesAtual
    return { ano, mes }
  })
  const [contaId, setContaId] = useState(() => searchParams.get('contaId') || '')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const contas = useMemo(() => listarContas().filter((conta) => conta.ativa), [])

  useEffect(() => {
    try {
      setError('')
      setData(getDashboardData(periodo, contaId))
    } catch (err) {
      setData(null)
      setError(err?.message || 'Erro ao carregar o dashboard.')
    }
  }, [periodo, contaId])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('ano', String(periodo.ano))
    next.set('mes', String(periodo.mes))
    if (contaId) {
      next.set('contaId', contaId)
    } else {
      next.delete('contaId')
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [periodo, contaId, searchParams, setSearchParams])

  const dashboard = data

  if (error) {
    return (
      <div className="page-center" style={{ padding: 24, textAlign: 'center' }}>
        <h2>Erro ao carregar o dashboard</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!dashboard) {
    return <div className="page-center">Carregando dashboard...</div>
  }

  const lancamentosQuery = new URLSearchParams({
    periodoInicio: dashboard.periodoInicio,
    periodoFim: dashboard.periodoFim,
    ...(contaId ? { contaFinanceiraId: contaId } : {}),
  }).toString()

  const cards = [
    {
      title: 'Receitas do período',
      value: formatarValor(dashboard.indicadores.receitas),
      subtitle: 'Receitas operacionais do período',
      to: `/financeiro/lancamentos?${lancamentosQuery}`,
      footer: 'Abrir lançamentos',
    },
    {
      title: 'Despesas do período',
      value: formatarValor(dashboard.indicadores.despesas),
      subtitle: 'Despesas operacionais do período',
      to: `/financeiro/lancamentos?${lancamentosQuery}`,
      footer: 'Abrir lançamentos',
    },
    {
      title: 'Resultado do período',
      value: formatarValor(dashboard.indicadores.resultado),
      subtitle: 'Receitas menos despesas',
      to: `/financeiro/lancamentos?${lancamentosQuery}`,
      footer: 'Abrir lançamentos',
    },
    {
      title: 'Total financeiro da Holding',
      value: formatarValor(dashboard.indicadores.totalFinanceiro),
      subtitle: 'Soma das contas financeiras ativas',
      to: '/financeiro/contas',
      footer: 'Abrir contas',
    },
  ]

  const alertCards = [
    {
      title: 'Contratos vencendo',
      value: Number(dashboard.alertas.contratosVencendo30 || 0),
      subtitle: 'Nos próximos 30 dias',
      to: '/contratos?alerta=vencendo',
    },
    {
      title: 'Contratos vencidos',
      value: Number(dashboard.alertas.contratosVencidos || 0),
      subtitle: 'Abertos ou em atraso',
      to: '/contratos?alerta=vencidos',
    },
    {
      title: 'Reajustes pendentes',
      value: Number(dashboard.alertas.reajustesPendentes || 0),
      subtitle: 'Reajustes próximos',
      to: '/contratos?alerta=reajustes-pendentes',
    },
    {
      title: 'Documentos vencendo',
      value: Number(dashboard.alertas.documentosVencendo || 0),
      subtitle: 'Obrigações próximas',
      to: '/documentos?alerta=vencendo',
    },
    {
      title: 'Unidades sem contrato',
      value: Number(dashboard.alertas.unidadesSemContrato || 0),
      subtitle: 'Necessitam regularização',
      to: '/unidades',
    },
    {
      title: 'Lançamentos atrasados',
      value: Number(dashboard.alertas.inadimplenciaQuantidade || 0),
      subtitle: 'Cobrança urgente',
      to: '/financeiro/lancamentos?status=atrasado',
    },
  ].filter((item) => item.value > 0)

  const mobileEssentials = [
    {
      title: 'Saldo total',
      value: formatarValor(dashboard.indicadores.totalFinanceiro),
      to: '/financeiro/contas',
    },
    {
      title: 'Receitas do mês',
      value: formatarValor(dashboard.indicadores.receitas),
      to: `/financeiro/lancamentos?${lancamentosQuery}`,
    },
    {
      title: 'Despesas do mês',
      value: formatarValor(dashboard.indicadores.despesas),
      to: `/financeiro/lancamentos?${lancamentosQuery}`,
    },
    {
      title: 'Resultado do mês',
      value: formatarValor(dashboard.indicadores.resultado),
      to: `/financeiro/lancamentos?${lancamentosQuery}`,
    },
    {
      title: 'Atrasos',
      value: String(Number(dashboard.alertas.inadimplenciaQuantidade || 0)),
      to: '/financeiro/lancamentos?status=atrasado',
    },
    {
      title: 'Alertas prioritários',
      value: String(alertCards.length),
      to: '/financeiro/lancamentos',
    },
  ]

  return (
    <div className="page-content dashboard-page">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Visão geral financeiro e patrimonial da C&V Holding.</p>
          <h1>Dashboard Gerencial</h1>
        </div>
        <UniversalEntryButton />
      </div>

      <section className="dashboard-mobile-essentials" aria-label="Resumo mobile essencial">
        {mobileEssentials.map((item) => (
          <button
            key={item.title}
            type="button"
            className="summary-card dashboard-mobile-essential-card"
            onClick={() => navigate(item.to)}
            aria-label={`${item.title}: ${item.value}`}
          >
            <strong>{item.title}</strong>
            <span>{item.value}</span>
          </button>
        ))}
      </section>

      <div className="dashboard-top-row">
        <FilterPeriod periodo={periodo} onChange={setPeriodo} className="dashboard-filter-card" />
        <div className="summary-card dashboard-account-card">
          <strong style={{ marginBottom: 8 }}>Conta</strong>
          <select value={contaId} onChange={(event) => setContaId(event.target.value)}>
            <option value="">Todas as contas</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>{conta.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="dashboard-grid dashboard-main-cards">
        {cards.map((card) => (
          <DashboardCard key={card.title} title={card.title} value={card.value} subtitle={card.subtitle} footer={card.footer} to={card.to} className="compact-card" />
        ))}
      </div>

      <div className="summary-card compact-card">
        <div className="section-header">
          <strong>Comparação com o mês anterior</strong>
          <span style={{ color: 'var(--text)' }}>Variação percentual</span>
        </div>
        <div className="summary-grid compact-summary-grid">
          <div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>Receitas</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatarVariacao(dashboard.comparacao.receitas)}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>Despesas</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatarVariacao(dashboard.comparacao.despesas)}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>Resultado</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatarVariacao(dashboard.comparacao.resultado)}</div>
          </div>
        </div>
      </div>

      <div className="summary-card compact-card compact-section-card">
        <div className="section-header">
          <strong>Indicadores de Gestão</strong>
          <span style={{ color: 'var(--text)' }}>12 meses e médias</span>
        </div>
        <div className="summary-grid compact-summary-grid">
          <DashboardCard className="compact-card" title="Receita 12 meses" value={formatarValor(dashboard.indicadoresGerenciais.receitas12Meses)} subtitle="Receita acumulada no último ano" />
          <DashboardCard className="compact-card" title="Despesa 12 meses" value={formatarValor(dashboard.indicadoresGerenciais.despesas12Meses)} subtitle="Despesa acumulada no último ano" />
          <DashboardCard className="compact-card" title="Resultado 12 meses" value={formatarValor(dashboard.indicadoresGerenciais.resultado12Meses)} subtitle="Lucro operacional anual" />
          <DashboardCard className="compact-card" title="Média mensal receitas" value={formatarValor(dashboard.indicadoresGerenciais.mediaMensalReceitas)} subtitle="Média dos últimos 12 meses" />
          <DashboardCard className="compact-card" title="Média mensal despesas" value={formatarValor(dashboard.indicadoresGerenciais.mediaMensalDespesas)} subtitle="Média dos últimos 12 meses" />
          <DashboardCard className="compact-card" title="Inadimplência" value={`${dashboard.indicadoresGerenciais.inadimplenciaPercentual.toFixed(1)}%`} subtitle="% do total financeiro" />
        </div>
      </div>

      <div className="summary-card compact-card compact-section-card">
        <div className="section-header">
          <strong>Alertas prioritários</strong>
          <Link className="button button-secondary" to="/financeiro/lancamentos">Ver lançamentos</Link>
        </div>
        {alertCards.length === 0 ? (
          <p>Nenhum alerta prioritário no momento.</p>
        ) : (
          <div className="summary-grid compact-summary-grid">
            {alertCards.map((card) => (
              <DashboardCard
                key={card.title}
                className="compact-card"
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                to={card.to}
              />
            ))}
          </div>
        )}
      </div>

      <div className="summary-card compact-card compact-section-card">
        <div className="section-header">
          <strong>Ações prioritárias</strong>
          <span style={{ color: 'var(--text)' }}>Proximos passos para gestão</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {dashboard.acoesPrioritarias.map((acao) => (
            <button key={acao.label} type="button" className="button button-secondary" onClick={() => navigate(acao.to)} style={{ justifyContent: 'space-between', width: '100%', textAlign: 'left' }}>
              <span>
                <strong>{acao.label}</strong>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{acao.description}</div>
              </span>
              <span style={{ opacity: 0.7 }}>Ir</span>
            </button>
          ))}
        </div>
      </div>

      <div className="summary-card compact-card compact-section-card">
        <div className="section-header">
          <strong>Onde está meu dinheiro?</strong>
          <Link className="button button-secondary" to="/financeiro/contas">Ver contas</Link>
        </div>
        <div className="summary-grid compact-summary-grid">
          <DashboardCard className="compact-card" title="Disponibilidade imediata" value={formatarValor(dashboard.ondeEstaMeuDinheiro.disponibilidadeImediata)} subtitle="Contas de uso diário e reserva" to="/financeiro/contas" />
          <DashboardCard className="compact-card" title="Total investido" value={formatarValor(dashboard.ondeEstaMeuDinheiro.totalInvestido)} subtitle="Contas classificadas como investimento" to="/financeiro/contas" />
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Distribuição por tipo</strong>
          <div className="summary-grid compact-summary-grid" style={{ marginTop: 10 }}>
            {dashboard.ondeEstaMeuDinheiro.porTipo.map((item) => (
              <div key={item.label} className="summary-card compact-card compact-distribution-card" onClick={() => navigate('/financeiro/contas')} style={{ cursor: 'pointer' }}>
                <strong>{item.label}</strong>
                <span>{formatarValor(item.saldo)}</span>
                <span>{item.percentual.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="summary-card compact-card compact-section-card">
        <div className="section-header">
          <strong>Ocupação dos imóveis</strong>
          <Link className="button button-secondary" to="/unidades">Ver unidades</Link>
        </div>
        <div className="summary-grid compact-summary-grid">
          <DashboardCard className="compact-card" title="Total de unidades" value={dashboard.ocupacao.totalUnidades} subtitle="Unidades cadastradas" to="/unidades" />
          <DashboardCard className="compact-card" title="Ocupadas" value={dashboard.ocupacao.ocupadas} subtitle="Com contrato ativo" to="/contratos" />
          <DashboardCard className="compact-card" title="Desocupadas" value={dashboard.ocupacao.desocupadas} subtitle="Sem contrato ativo" to="/unidades" />
          <DashboardCard className="compact-card" title="Percentual de ocupação" value={`${dashboard.ocupacao.percentual.toFixed(1)}%`} subtitle="Base nas unidades cadastradas" to="/unidades" />
        </div>
      </div>

      <div className="summary-card compact-card compact-section-card">
        <div className="section-header">
          <strong>Inadimplência</strong>
          <Link className="button button-secondary" to="/financeiro/lancamentos">Ver lançamentos</Link>
        </div>
        <div className="summary-grid compact-summary-grid">
          <DashboardCard className="compact-card" title="Lançamentos vencidos" value={dashboard.inadimplencia.quantidadeLancamentos} subtitle="Em aberto e não pagos" to="/financeiro/lancamentos" />
          <DashboardCard className="compact-card" title="Valor em atraso" value={formatarValor(dashboard.inadimplencia.valorTotal)} subtitle="Valor acumulado" to="/financeiro/lancamentos" />
          <DashboardCard className="compact-card" title="Locatários inadimplentes" value={dashboard.inadimplencia.locatariosInadimplentes} subtitle="Com lançamentos vencidos" to="/locatarios" />
        </div>
      </div>

      <div className="summary-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <strong>Próximos vencimentos</strong>
        </div>
        <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <strong>A receber</strong>
            {dashboard.proximosVencimentos.receber.length === 0 ? <p>Nenhum vencimento próximo.</p> : dashboard.proximosVencimentos.receber.map((item) => (
              <div key={item.id} className="summary-card" style={{ marginTop: 8 }}>
                <div>{item.descricao}</div>
                <small>{formatarValor(item.valor)} • {item.dataVencimento}</small>
              </div>
            ))}
          </div>
          <div>
            <strong>A pagar</strong>
            {dashboard.proximosVencimentos.pagar.length === 0 ? <p>Nenhum vencimento próximo.</p> : dashboard.proximosVencimentos.pagar.map((item) => (
              <div key={item.id} className="summary-card" style={{ marginTop: 8 }}>
                <div>{item.descricao}</div>
                <small>{formatarValor(item.valor)} • {item.dataVencimento}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="summary-card compact-card compact-section-card">
        <div className="section-header">
          <strong>Contratos</strong>
          <Link className="button button-secondary" to="/contratos">Ver contratos</Link>
        </div>
        <div className="summary-grid compact-summary-grid">
          <DashboardCard className="compact-card" title="Ativos" value={dashboard.contratos.ativos} subtitle="Contratos em vigência" to="/contratos" />
          <DashboardCard className="compact-card" title="Vencendo em 30 dias" value={dashboard.contratos.vencendo30} subtitle="Próximo do vencimento" to="/contratos" />
          <DashboardCard className="compact-card" title="Vencidos" value={dashboard.contratos.vencidos} subtitle="Ainda não encerrados" to="/contratos" />
          <DashboardCard className="compact-card" title="Sem contrato ativo" value={dashboard.contratos.semContrato} subtitle="Unidades sem contrato" to="/unidades" />
        </div>
      </div>

      <div className="summary-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <strong>Movimentações recentes</strong>
        </div>
        {dashboard.movimentacoesRecentes.length === 0 ? <p>Nenhuma movimentação encontrada.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 760 }}>
              <thead>
                <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Conta</th></tr>
              </thead>
              <tbody>
                {dashboard.movimentacoesRecentes.map((mov) => (
                  <tr key={mov.id}>
                    <td>{mov.data}</td>
                    <td>{mov.tipoMovimento}</td>
                    <td>{mov.descricao}</td>
                    <td>{formatarValor(mov.valor)}</td>
                    <td>{mov.conta?.nome || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ChartFinanceiro data={dashboard.graficoFinanceiro12Meses} title="Evolução 12 meses" subtitle="Trajetória financeira anual" style={{ padding: 16 }} />
    </div>
  )
}
