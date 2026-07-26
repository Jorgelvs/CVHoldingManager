import { listarLancamentos } from './financeiroService.js'
import { listarRateios } from './rateioService.js'
import { listarPatrimonios } from '../../patrimonios/services/patrimonioService.js'
import { getStatusEfetivo } from '../utils/financeiroUtils.js'

function competenciaParaDataInicio(competencia) {
  if (!competencia) return null
  const [ano, mes] = competencia.split('-').map(Number)
  return new Date(ano, mes - 1, 1).toISOString().slice(0, 10)
}

function competenciaParaDataFim(competencia) {
  if (!competencia) return null
  const [ano, mes] = competencia.split('-').map(Number)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return new Date(ano, mes - 1, ultimoDia).toISOString().slice(0, 10)
}

function ordenarCompetencias(competencias) {
  return [...new Set(competencias)].sort()
}

function valorSomado(lancamentos) {
  return lancamentos.reduce((total, item) => total + Number(item.valor || 0), 0)
}

export function listarCompetenciasFinanceiro() {
  const lancamentos = listarLancamentos()
  return ordenarCompetencias(lancamentos.map((item) => item.dataCompetencia).filter(Boolean))
}

export function calcularIndicadoresCondominio(patrimonioId, competencia) {
  const lancamentos = listarLancamentos().filter((item) => item.patrimonioId === patrimonioId && item.dataCompetencia === competencia)
  const receitaCondominio = lancamentos.filter((item) => item.tipo === 'receita' && item.categoria === 'Condomínio')
  const condominioPrevisto = valorSomado(receitaCondominio.filter((item) => item.status !== 'cancelado'))
  const condominioRecebido = valorSomado(receitaCondominio.filter((item) => getStatusEfetivo(item) === 'pago'))
  const condominioCancelado = valorSomado(receitaCondominio.filter((item) => item.status === 'cancelado'))
  const condominioPendente = condominioPrevisto - condominioRecebido - condominioCancelado
  const inadimplencia = valorSomado(
    receitaCondominio.filter(
      (item) => getStatusEfetivo(item) === 'atrasado' && item.status !== 'cancelado',
    ),
  )
  const despesasComuns = lancamentos.filter(
    (item) =>
      item.tipo === 'despesa' &&
      item.cobertaPeloCondominio === true &&
      item.status !== 'cancelado',
  )
  const despesasComunsPrevistas = valorSomado(despesasComuns)
  const despesasComunsPagas = valorSomado(despesasComuns.filter((item) => getStatusEfetivo(item) === 'pago'))
  const resultadoPrevisto = condominioPrevisto - despesasComunsPrevistas
  const saldoMensal = condominioRecebido - despesasComunsPagas
  const aporteHolding = valorSomado(
    lancamentos.filter((item) => item.origem === 'aporte_holding' || item.tipoMovimentoCondominio === 'aporte_holding'),
  )

  return {
    condominioPrevisto,
    condominioRecebido,
    condominioPendente,
    inadimplencia,
    despesasComunsPrevistas,
    despesasComunsPagas,
    resultadoPrevisto,
    saldoMensal,
    aporteHolding,
    percentualCobertura:
      despesasComunsPagas > 0 ? (condominioRecebido / despesasComunsPagas) * 100 : null,
    lancamentos,
    rateiosRelacionados: listarRateios().filter((item) => item.patrimonioId === patrimonioId && item.competencia === competencia),
  }
}

export function calcularSaldoAcumulado(patrimonioId, competencia) {
  const competencias = ordenarCompetencias(
    listarLancamentos()
      .filter((item) => item.patrimonioId === patrimonioId)
      .map((item) => item.dataCompetencia)
      .filter(Boolean),
  )
  let saldo = 0
  for (const mes of competencias) {
    if (!mes) continue
    const indicadores = calcularIndicadoresCondominio(patrimonioId, mes)
    saldo += indicadores.condominioRecebido - indicadores.despesasComunsPagas + indicadores.aporteHolding
    if (mes === competencia) {
      return saldo
    }
  }
  return saldo
}

export function listarResumoPorEmpreendimento(competencia) {
  const patrimonios = listarPatrimonios()
  return patrimonios.map((patrimonio) => {
    const indicadores = calcularIndicadoresCondominio(patrimonio.id, competencia)
    const saldoAcumulado = calcularSaldoAcumulado(patrimonio.id, competencia)
    let situacao = 'Deficitário'
    if (indicadores.saldoMensal > 0) situacao = 'Superavitário'
    else if (indicadores.saldoMensal === 0) situacao = 'Suficiente'
    else if (indicadores.resultadoPrevisto >= 0 && indicadores.saldoMensal < 0) situacao = 'Atenção'

    return {
      patrimonioId: patrimonio.id,
      patrimonioNome: patrimonio.nome,
      competencia,
      ...indicadores,
      saldoAcumulado,
      situacao,
    }
  })
}

export function obterDetalhesCondominio(patrimonioId, competencia) {
  const lancamentos = listarLancamentos().filter((item) => item.patrimonioId === patrimonioId && item.dataCompetencia === competencia)
  const receitasCondominio = lancamentos.filter((item) => item.tipo === 'receita' && item.categoria === 'Condomínio')
  const despesasCobertas = lancamentos.filter(
    (item) => item.tipo === 'despesa' && item.cobertaPeloCondominio === true,
  )
  const aportesHolding = lancamentos.filter(
    (item) => item.origem === 'aporte_holding' || item.tipoMovimentoCondominio === 'aporte_holding',
  )
  const indicadores = calcularIndicadoresCondominio(patrimonioId, competencia)
  const saldoAcumulado = calcularSaldoAcumulado(patrimonioId, competencia)

  return {
    receitasCondominio,
    despesasCobertas,
    aportesHolding,
    indicadores,
    rateiosRelacionados: listarRateios().filter((item) => item.patrimonioId === patrimonioId && item.competencia === competencia),
    saldoAcumulado,
  }
}

export function listarCompetenciasPorPatrimonio(patrimonioId) {
  return ordenarCompetencias(
    listarLancamentos()
      .filter((item) => item.patrimonioId === patrimonioId)
      .map((item) => item.dataCompetencia)
      .filter(Boolean),
  )
}
