import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { contratoAtivoPorUnidade } from '../../contratos/services/contratoService.js'
import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { getStatusEfetivo, calcularAtrasados, formatarMoeda } from '../../financeiro/utils/financeiroUtils.js'

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function mesAtualIso() {
  return new Date().toISOString().slice(0, 7)
}

function formatarMesReferencia(mesIso) {
  const [ano, mes] = mesIso.split('-')
  const idx = Number(mes) - 1
  const abrev = MESES_ABREV[idx] || mes
  return `${abrev}/${ano.slice(2)}`
}

function deslocarMes(mesIso, delta) {
  const [ano, mes] = mesIso.split('-').map(Number)
  const data = new Date(ano, mes - 1 + delta, 1)
  const novoAno = data.getFullYear()
  const novoMes = String(data.getMonth() + 1).padStart(2, '0')
  return `${novoAno}-${novoMes}`
}

function competenciaMes(item) {
  const raw = item.dataCompetencia || item.dataVencimento || ''
  return raw ? String(raw).slice(0, 7) : ''
}

// Cor da célula da unidade: considera ocupada tanto quem tem contrato ativo quanto
// quem foi marcada manualmente como "Ocupada" na própria Unidade (situacao) — cobre
// o caso comum de já ter mudado o locatário mas o contrato ainda estar incompleto no
// sistema (ex.: falta cadastrar o nome do inquilino). Se algum lançamento do mês está
// atrasado, prioriza o alerta (vermelho) mesmo que outro já tenha sido pago; se todos
// os lançamentos do mês foram pagos, fica "em dia"; caso contrário (sem lançamento
// ainda, ou pendente dentro do prazo, ou ocupada sem contrato lançado), fica "ocupada"
// (verde claro neutro).
function statusUnidade(unidade, contrato, lancamentosDoMes) {
  const ocupada = Boolean(contrato) || unidade.situacao === 'Ocupada'
  if (!ocupada) return 'desocupada'
  if (lancamentosDoMes.length === 0) return 'ocupada'
  const efetivos = lancamentosDoMes.map(getStatusEfetivo)
  if (efetivos.includes('atrasado')) return 'atrasado'
  if (efetivos.every((efetivo) => efetivo === 'pago')) return 'em-dia'
  return 'ocupada'
}

const LABEL_STATUS = {
  desocupada: 'Desocupada',
  ocupada: 'Ocupada',
  'em-dia': 'Em dia',
  atrasado: 'Atrasado',
}

export default function PainelOcupacaoPage() {
  const [mesRef, setMesRef] = useState(mesAtualIso())
  const [reloadTick, setReloadTick] = useState(0)

  // O Painel virou a tela inicial ('/'), a primeira a montar depois do login.
  // Nesse momento, os dados às vezes ainda não terminaram de chegar do Supabase:
  // o bootstrapPersistence() disparado pelo listener de auth roda "fire and
  // forget" (não é aguardado) e não existe hoje nenhum evento global avisando
  // quando essa sincronização inicial termina. Sem isto, a leitura local
  // (listarPatrimonios/listarUnidades/listarLancamentos) podia capturar o
  // cache ainda vazio e nunca mais recalcular. Repete a leitura algumas vezes
  // logo após montar — é barato (é tudo leitura local em memória) — e também
  // recarrega quando unidades mudam em outra tela.
  useEffect(() => {
    const tentativas = [900, 2200, 4500]
    const timers = tentativas.map((atraso) => setTimeout(() => setReloadTick((tick) => tick + 1), atraso))
    const onUnidadesUpdated = () => setReloadTick((tick) => tick + 1)
    window.addEventListener('cvholding_unidades_updated', onUnidadesUpdated)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('cvholding_unidades_updated', onUnidadesUpdated)
    }
  }, [])

  const dados = useMemo(() => {
    const patrimonios = listarPatrimonios()
    const unidadesTodas = listarUnidades()
    const lancamentosDoMes = listarLancamentos().filter(
      (item) => item.tipo === 'receita' && item.status !== 'cancelado' && competenciaMes(item) === mesRef,
    )

    return patrimonios.map((patrimonio) => {
      const unidades = unidadesTodas
        .filter((unidade) => unidade.patrimonioId === patrimonio.id)
        .slice()
        .sort((a, b) => (a.nome || a.codigoInterno || '').localeCompare(b.nome || b.codigoInterno || '', 'pt-BR', { numeric: true, sensitivity: 'base' }))

      const unidadesComStatus = unidades.map((unidade) => {
        const contrato = contratoAtivoPorUnidade(unidade.id)
        const lancamentosUnidade = lancamentosDoMes.filter((item) => item.unidadeId === unidade.id)
        return {
          unidade,
          contrato,
          status: statusUnidade(unidade, contrato, lancamentosUnidade),
        }
      })

      const lancamentosPatrimonio = lancamentosDoMes.filter((item) => {
        if (item.unidadeId) {
          const unidade = unidadesTodas.find((u) => u.id === item.unidadeId)
          return unidade?.patrimonioId === patrimonio.id
        }
        return item.patrimonioId === patrimonio.id
      })

      const recebido = lancamentosPatrimonio
        .filter((item) => getStatusEfetivo(item) === 'pago')
        .reduce((total, item) => total + Number(item.valor || 0), 0)
      const atrasado = calcularAtrasados(lancamentosPatrimonio)
      const aReceber = lancamentosPatrimonio
        .filter((item) => ['pendente', 'parcial'].includes(getStatusEfetivo(item)))
        .reduce((total, item) => total + Number(item.valor || 0), 0)

      return { patrimonio, unidades: unidadesComStatus, recebido, aReceber, atrasado }
    })
  }, [mesRef, reloadTick])

  return (
    <div className="page-content page-content-tight">
      <div className="page-header page-header-compact">
        <div className="page-title-block">
          <p className="page-subtitle page-subtitle-tight">Status de ocupação e cobrança de cada unidade, mês a mês.</p>
          <h1 className="page-title-tight">Painel</h1>
        </div>
        <div className="painel-mes-seletor">
          <button type="button" className="button button-secondary" aria-label="Mês anterior" onClick={() => setMesRef((atual) => deslocarMes(atual, -1))}>
            <ChevronLeft size={16} />
          </button>
          <span className="painel-mes-label">Mês de referência: <strong>{formatarMesReferencia(mesRef)}</strong></span>
          <button type="button" className="button button-secondary" aria-label="Próximo mês" onClick={() => setMesRef((atual) => deslocarMes(atual, 1))}>
            <ChevronRight size={16} />
          </button>
          {mesRef !== mesAtualIso() ? (
            <button type="button" className="small-link-button" onClick={() => setMesRef(mesAtualIso())}>hoje</button>
          ) : null}
        </div>
      </div>

      {dados.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum patrimônio cadastrado.</h2>
          <p>Cadastre um patrimônio e suas unidades para ver o painel de ocupação. Se você já tem patrimônios cadastrados e eles não apareceram, os dados podem ainda estar sincronizando — toque em recarregar.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="button button-primary" to="/patrimonios/novo">Cadastrar patrimônio</Link>
            <button type="button" className="button button-secondary" onClick={() => setReloadTick((tick) => tick + 1)}>Recarregar</button>
          </div>
        </div>
      ) : (
        dados.map(({ patrimonio, unidades, recebido, aReceber, atrasado }) => (
          <div className="painel-patrimonio-card" key={patrimonio.id}>
            <h2 className="painel-patrimonio-titulo">{patrimonio.nome}</h2>

            {unidades.length === 0 ? (
              <p className="hint">Nenhuma unidade cadastrada neste patrimônio.</p>
            ) : (
              <div className="painel-unidades-grid">
                {unidades.map(({ unidade, contrato, status }) => (
                  <Link
                    key={unidade.id}
                    to={`/unidades/${unidade.id}`}
                    className={`painel-unidade-cell painel-status-${status}`}
                    title={LABEL_STATUS[status]}
                  >
                    <span className="painel-unidade-nome">{unidade.nome || unidade.codigoInterno}</span>
                    <span className="painel-unidade-detalhe">
                      {contrato
                        ? `${formatarMoeda(contrato.valorAluguel)}${contrato.diaVencimento ? ` · dia ${contrato.diaVencimento}` : ''}`
                        : status === 'ocupada'
                          ? 'Ocupada · contrato pendente'
                          : 'Desocupada'}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <div className="painel-resumo-row">
              <div className="painel-resumo-item painel-resumo-recebido">
                <span className="painel-resumo-label">Recebido</span>
                <span className="painel-resumo-valor">{formatarMoeda(recebido)}</span>
              </div>
              <div className="painel-resumo-item painel-resumo-a-receber">
                <span className="painel-resumo-label">A receber</span>
                <span className="painel-resumo-valor">{formatarMoeda(aReceber)}</span>
              </div>
              <div className="painel-resumo-item painel-resumo-atrasado">
                <span className="painel-resumo-label">Atrasado</span>
                <span className="painel-resumo-valor">{formatarMoeda(atrasado)}</span>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="painel-legenda">
        <span className="painel-legenda-titulo">Legenda:</span>
        <span className="painel-legenda-item"><span className="painel-legenda-swatch painel-status-desocupada" /> Desocupada</span>
        <span className="painel-legenda-item"><span className="painel-legenda-swatch painel-status-ocupada" /> Ocupada</span>
        <span className="painel-legenda-item"><span className="painel-legenda-swatch painel-status-em-dia" /> Em dia</span>
        <span className="painel-legenda-item"><span className="painel-legenda-swatch painel-status-atrasado" /> Atrasado</span>
      </div>
    </div>
  )
}
