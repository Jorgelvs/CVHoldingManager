// Comissão imobiliária (achado crítico da análise de 06/08/2026: essa
// regra de negócio não existia em nenhum lugar do sistema — "Comissão
// imobiliária" era só o nome de uma categoria de despesa, com valor digitado
// livremente, sem cálculo nem vínculo com a imobiliária responsável).
//
// Regra de negócio: a comissão incide SOMENTE sobre receitas de Aluguel e
// Multa do contrato — nunca sobre condomínio, água, energia etc. Cada
// contrato pode estar vinculado a uma imobiliária (campo
// contrato.imobiliariaId); cada imobiliária tem seu próprio percentual.
//
// Este módulo apenas CALCULA a comissão a partir dos lançamentos já
// existentes — não gera lançamentos de despesa automaticamente. Isso segue
// o mesmo padrão de segurança usado em outras partes do app (rateio,
// Entrada Universal): sempre mostrar o cálculo para revisão humana antes de
// qualquer gravação. Se quiser registrar o pagamento da comissão, o usuário
// cria manualmente um lançamento de despesa "Comissão imobiliária" usando o
// valor calculado aqui como referência.

import { listarLancamentos } from './financeiroService.js'
import { buscarContratoPorId } from '../../contratos/services/contratoService.js'
import { buscarImobiliariaPorId, listarImobiliarias } from '../../imobiliarias/services/imobiliariaService.js'
import { getDataConsiderada } from '../utils/financeiroUtils.js'

const CATEGORIAS_BASE_COMISSAO = ['Aluguel', 'Multa']

function dentroDoPeriodo(dataReferencia, periodoInicio, periodoFim) {
  if (!dataReferencia) return false
  if (periodoInicio && dataReferencia < periodoInicio) return false
  if (periodoFim && dataReferencia > periodoFim) return false
  return true
}

// Lista, lançamento a lançamento, a base de cálculo e a comissão
// correspondente — só para lançamentos de receita em categoria
// Aluguel/Multa, vinculados a um contrato que tem imobiliária definida.
export function listarComissoesDetalhadas({ periodoInicio = '', periodoFim = '', imobiliariaId = '' } = {}) {
  const lancamentos = listarLancamentos().filter((item) => (
    item.tipo === 'receita'
    && item.status !== 'cancelado'
    && CATEGORIAS_BASE_COMISSAO.includes(item.categoria)
    && item.contratoId
  ))

  const resultado = []

  for (const lancamento of lancamentos) {
    const dataReferencia = getDataConsiderada(lancamento)
    if (!dentroDoPeriodo(dataReferencia, periodoInicio, periodoFim)) continue

    const contrato = buscarContratoPorId(lancamento.contratoId)
    if (!contrato || !contrato.imobiliariaId) continue
    if (imobiliariaId && contrato.imobiliariaId !== imobiliariaId) continue

    const imobiliaria = buscarImobiliariaPorId(contrato.imobiliariaId)
    if (!imobiliaria) continue

    const valorBase = Number(lancamento.valor || 0)
    const percentual = Number(imobiliaria.percentualComissao || 0)
    // valorBase * percentual/100, arredondado em centavos (evita erro de
    // ponto flutuante em dinheiro). Ex.: 1050.33 * 8.5% = 89.28.
    const valorComissao = Math.round(valorBase * percentual) / 100

    resultado.push({
      lancamentoId: lancamento.id,
      descricao: lancamento.descricao,
      categoria: lancamento.categoria,
      dataReferencia,
      contratoId: contrato.id,
      contratoCodigo: contrato.codigoInterno,
      imobiliariaId: imobiliaria.id,
      imobiliariaNome: imobiliaria.nome,
      percentualComissao: percentual,
      valorBase,
      valorComissao,
    })
  }

  return resultado.sort((a, b) => (b.dataReferencia || '').localeCompare(a.dataReferencia || ''))
}

// Agrupa por imobiliária: total de base (aluguel+multa), total de comissão
// e quantidade de lançamentos considerados — usado no relatório
// mensal/anual por imobiliária.
export function calcularResumoComissoesPorImobiliaria({ periodoInicio = '', periodoFim = '' } = {}) {
  const detalhes = listarComissoesDetalhadas({ periodoInicio, periodoFim })
  const porImobiliaria = new Map()

  for (const item of detalhes) {
    const atual = porImobiliaria.get(item.imobiliariaId) || {
      imobiliariaId: item.imobiliariaId,
      imobiliariaNome: item.imobiliariaNome,
      percentualComissao: item.percentualComissao,
      totalBase: 0,
      totalComissao: 0,
      quantidadeLancamentos: 0,
    }
    atual.totalBase += item.valorBase
    atual.totalComissao += item.valorComissao
    atual.quantidadeLancamentos += 1
    porImobiliaria.set(item.imobiliariaId, atual)
  }

  // Inclui imobiliárias ativas sem nenhuma comissão no período (com zero),
  // para que o relatório mostre todas as parceiras, não só as que tiveram
  // movimento.
  listarImobiliarias().forEach((imobiliaria) => {
    if (!porImobiliaria.has(imobiliaria.id)) {
      porImobiliaria.set(imobiliaria.id, {
        imobiliariaId: imobiliaria.id,
        imobiliariaNome: imobiliaria.nome,
        percentualComissao: Number(imobiliaria.percentualComissao || 0),
        totalBase: 0,
        totalComissao: 0,
        quantidadeLancamentos: 0,
      })
    }
  })

  return Array.from(porImobiliaria.values()).sort((a, b) => a.imobiliariaNome.localeCompare(b.imobiliariaNome))
}
