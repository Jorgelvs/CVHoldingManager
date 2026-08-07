import { STORAGE_KEY, STORAGE_KEY_RATEIOS, METODOS_RATEIO, CRITERIOS_ELEGIBILIDADE_RATEIO } from '../constants/financeiroConstants.js'
import { gerarId } from '../../patrimonios/utils/patrimonioUtils.js'
import { listarUnidadesPorPatrimonio } from '../../unidades/services/unidadeService.js'
import { listarContratosPorUnidade } from '../../contratos/services/contratoService.js'
import { criarLancamento, listarLancamentos, atualizarLancamento } from './financeiroService.js'
import { registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { exists as localExists, get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { competenciaParaDataInicio, competenciaParaDataFim } from '../utils/competenciaUtils.js'

// Reexportado a partir de financeiroConstants.js (fonte única): antes esse
// arquivo redefinia METODOS_RATEIO/CRITERIOS_ELEGIBILIDADE localmente com
// os mesmos valores de financeiroConstants.js sob outro nome — duas fontes
// de verdade que podiam divergir silenciosamente numa manutenção futura.
const CRITERIOS_ELEGIBILIDADE = CRITERIOS_ELEGIBILIDADE_RATEIO
let migracaoChaveRateioExecutada = false

function garantirRateio(item) {
  return {
    id: item.id || gerarId(),
    patrimonioId: item.patrimonioId || '',
    competencia: item.competencia || '',
    categoria: item.categoria || '',
    subcategoria: item.subcategoria || null,
    descricao: item.descricao || '',
    valorTotal: Number(item.valorTotal ?? 0),
    metodoRateio: item.metodoRateio || 'igualitario',
    criterioElegibilidade: item.criterioElegibilidade || 'ocupadas_mes_inteiro',
    status: item.status || 'rascunho',
    unidadesElegiveis: item.unidadesElegiveis || [],
    quantidadeUnidades: item.quantidadeUnidades || 0,
    valorBasePorUnidade: item.valorBasePorUnidade || 0,
    diferencaArredondamento: item.diferencaArredondamento || 0,
    lancamentosGeradosIds: item.lancamentosGeradosIds || [],
    criadoEm: item.criadoEm || new Date().toISOString(),
    atualizadoEm: item.atualizadoEm || new Date().toISOString(),
    processadoEm: item.processadoEm || null,
    canceladoEm: item.canceladoEm || null,
    observacoes: item.observacoes || '',
  }
}

function carregarRateios() {
  executarMigracaoRateiosChaveIncorreta()

  const parsed = localGet(STORAGE_KEY_RATEIOS, [])
  return Array.isArray(parsed) ? parsed.map(garantirRateio) : []
}

function salvarRateios(rateios) {
  localSet(STORAGE_KEY_RATEIOS, rateios)
}

function isRateioLike(item) {
  if (!item || typeof item !== 'object') return false
  const hasCoreFields = Boolean(
    item.competencia
      && (item.metodoRateio || item.criterioElegibilidade || 'valorTotal' in item),
  )
  const hasRateioStatus = ['rascunho', 'processado', 'cancelado'].includes(item.status)
  if (isLancamentoLike(item)) return false
  return hasCoreFields || hasRateioStatus || Array.isArray(item.lancamentosGeradosIds)
}

function isLancamentoLike(item) {
  if (!item || typeof item !== 'object') return false
  const tipoValido = item.tipo === 'receita' || item.tipo === 'despesa'
  const possuiCamposFinanceiros = 'valor' in item || 'dataCompetencia' in item || 'dataVencimento' in item
  return tipoValido && possuiCamposFinanceiros
}

function mergeRateiosById(existentes, migrados) {
  const mapa = new Map()
  ;(Array.isArray(existentes) ? existentes : []).forEach((item) => {
    const key = item?.id || `legacy-${JSON.stringify(item)}`
    mapa.set(key, item)
  })
  ;(Array.isArray(migrados) ? migrados : []).forEach((item) => {
    const key = item?.id || `legacy-${JSON.stringify(item)}`
    if (!mapa.has(key)) {
      mapa.set(key, item)
    }
  })
  return Array.from(mapa.values())
}

function executarMigracaoRateiosChaveIncorreta() {
  if (migracaoChaveRateioExecutada) return
  migracaoChaveRateioExecutada = true

  if (!localExists(STORAGE_KEY)) return
  const parsedLancamentos = localGet(STORAGE_KEY, [])

  if (!Array.isArray(parsedLancamentos) || parsedLancamentos.length === 0) return

  const candidatosRateio = parsedLancamentos.filter(isRateioLike)
  if (candidatosRateio.length === 0) return

  const candidatosLancamento = parsedLancamentos.filter(isLancamentoLike)
  const rateiosMigrados = candidatosRateio.map(garantirRateio)

  const parsedRateios = localGet(STORAGE_KEY_RATEIOS, [])
  const rateiosAtuais = Array.isArray(parsedRateios) ? parsedRateios.map(garantirRateio) : []

  const rateiosComMigracao = mergeRateiosById(rateiosAtuais, rateiosMigrados)
  localSet(STORAGE_KEY_RATEIOS, rateiosComMigracao)

  const haviaContaminacao = candidatosRateio.length !== parsedLancamentos.length
  if (haviaContaminacao || candidatosLancamento.length === 0) {
    localSet(STORAGE_KEY, candidatosLancamento)
  }

  registrarEventoAuditoria({
    modulo: 'Financeiro',
    acao: 'MIGRACAO_RATEIOS_CHAVE',
    registroId: 'migracao-rateios-chave',
    registro: 'rateios',
    descricao: 'Migracao automatica de rateios salvos na chave de lancamentos.',
    valorAnterior: {
      totalItensChaveLancamentos: parsedLancamentos.length,
      rateiosDetectados: candidatosRateio.length,
    },
    novoValor: {
      totalLancamentosMantidos: candidatosLancamento.length,
      totalRateiosPersistidos: rateiosComMigracao.length,
    },
    camposAlterados: ['financeiro.lancamentos', 'financeiro.rateios'],
  })
}

export function listarRateios() {
  return carregarRateios()
}

export function buscarRateioPorId(id) {
  return listarRateios().find((item) => item.id === id) || null
}

export function listarRateiosPorPatrimonioCompetencia(patrimonioId, competencia) {
  return listarRateios().filter(
    (item) => item.patrimonioId === patrimonioId && item.competencia === competencia,
  )
}

export function validarRateioDados(dados) {
  const errors = {}
  if (!dados.patrimonioId) errors.patrimonioId = 'Patrimônio obrigatório.'
  if (!dados.competencia) errors.competencia = 'Competência obrigatória.'
  if (!dados.categoria) errors.categoria = 'Categoria obrigatória.'
  if (!dados.descricao || !dados.descricao.trim()) errors.descricao = 'Descrição obrigatória.'
  if (!dados.valorTotal || Number(dados.valorTotal) <= 0) errors.valorTotal = 'Valor total deve ser maior que zero.'
  if (!METODOS_RATEIO.includes(dados.metodoRateio)) {
    errors.metodoRateio = 'Método de rateio não suportado.'
  }
  if (!CRITERIOS_ELEGIBILIDADE.includes(dados.criterioElegibilidade)) {
    errors.criterioElegibilidade = 'Critério de elegibilidade não suportado.'
  }
  return errors
}

// Corrigido em 06/08/2026: antes exigia situacao === 'Ativo', o que
// distorcia rateios de competências passadas. Se, no momento em que o
// rateio é (re)processado, o contrato daquela unidade já tinha sido
// encerrado, a unidade perdia retroativamente a elegibilidade de um mês em
// que de fato ficou ocupada o mês inteiro. O critério de "mês cheio" deve
// depender só da janela de vigência (dataInicio/dataFim) cobrir a
// competência — não do status atual do contrato. 'Rascunho' e 'Cancelado'
// continuam de fora: nunca chegaram a valer de fato.
export function isUnidadeOcupadaMesInteiro(unidade, contratos, competencia) {
  if (!unidade || !competencia) return false
  const primeiroDia = competenciaParaDataInicio(competencia)
  const ultimoDia = competenciaParaDataFim(competencia)
  if (!primeiroDia || !ultimoDia) return false

  const contrato = contratos.find(
    (item) =>
      item.unidadeId === unidade.id &&
      item.patrimonioId === unidade.patrimonioId &&
      (item.situacao === 'Ativo' || item.situacao === 'Encerrado') &&
      item.dataInicio <= primeiroDia &&
      (!item.dataFim || item.dataFim >= ultimoDia),
  )

  return Boolean(contrato)
}

export function selecionarUnidadesElegiveis(patrimonioId, competencia) {
  const unidades = listarUnidadesPorPatrimonio(patrimonioId)
  const elegiveis = unidades.filter((unidade) => {
    const contratos = listarContratosPorUnidade(unidade.id)
    return isUnidadeOcupadaMesInteiro(unidade, contratos, competencia)
  })
  return elegiveis
}

export function calcularRateioPreview(dados) {
  const valid = validarRateioDados(dados)
  if (Object.keys(valid).length > 0) {
    return { errors: valid }
  }

  const unidades = selecionarUnidadesElegiveis(dados.patrimonioId, dados.competencia)
  const quantidadeUnidades = unidades.length
  if (quantidadeUnidades === 0) {
    return {
      errors: { unidades: 'Nenhuma unidade elegível encontrada para esta competência.' },
      unidadesElegiveis: [],
    }
  }

  const totalCentavos = Math.round(Number(dados.valorTotal) * 100)
  const base = Math.floor(totalCentavos / quantidadeUnidades)
  const resto = totalCentavos % quantidadeUnidades
  const distribuicao = unidades.map((unidade, index) => {
    const adicional = index < resto ? 1 : 0
    return {
      unidadeId: unidade.id,
      unidadeNome: unidade.nome,
      valorCentavos: base + adicional,
      valor: (base + adicional) / 100,
    }
  })

  return {
    unidadesElegiveis: unidades.map((unidade) => unidade.id),
    unidadesDetalhes: distribuicao,
    quantidadeUnidades,
    valorBasePorUnidade: base / 100,
    diferencaArredondamento: resto / 100,
    totalDistribuido: totalCentavos / 100,
    totalCentavos,
    errors: {},
  }
}

export function criarRateio(dados) {
  const novoRateio = garantirRateio({
    ...dados,
    id: gerarId(),
    valorTotal: Number(dados.valorTotal),
    status: 'rascunho',
    unidadesElegiveis: [],
    quantidadeUnidades: 0,
    valorBasePorUnidade: 0,
    diferencaArredondamento: 0,
    lancamentosGeradosIds: [],
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    processadoEm: null,
    canceladoEm: null,
  })

  const rateios = listarRateios()
  rateios.push(novoRateio)
  salvarRateios(rateios)
  return novoRateio
}

export function atualizarRateio(id, dados) {
  const rateios = listarRateios()
  const index = rateios.findIndex((item) => item.id === id)
  if (index === -1) return null
  const existente = rateios[index]
  const atualizado = garantirRateio({
    ...existente,
    ...dados,
    id: existente.id,
    valorTotal: Number(dados.valorTotal ?? existente.valorTotal),
    atualizadoEm: new Date().toISOString(),
    processadoEm: existente.processadoEm || null,
    canceladoEm: existente.canceladoEm || null,
  })

  rateios[index] = atualizado
  salvarRateios(rateios)
  return atualizado
}

function cancelarLancamentosDoRateio(rateioId) {
  const lancamentos = listarLancamentos()
  lancamentos
    .filter((item) => item.origem === 'rateio' && item.rateioId === rateioId && item.status !== 'cancelado')
    .forEach((item) => {
      atualizarLancamento(item.id, {
        ...item,
        status: 'cancelado',
        atualizadoEm: new Date().toISOString(),
      })
    })
}

export function processarRateio(id, dados) {
  const rateio = buscarRateioPorId(id)
  if (!rateio) return { error: 'Rateio não encontrado.' }
  if (rateio.status === 'processado') return { error: 'Rateio já foi processado.' }
  if (rateio.status === 'cancelado') return { error: 'Rateio cancelado não pode ser processado.' }

  const preview = calcularRateioPreview({ ...rateio, ...dados })
  if (Object.keys(preview.errors || {}).length > 0) {
    return { error: preview.errors }
  }

  const rateios = listarRateios()
  const index = rateios.findIndex((item) => item.id === id)
  if (index === -1) return { error: 'Rateio não encontrado.' }

  const lancamentosGeradosIds = []
  const unidades = selecionarUnidadesElegiveis(rateio.patrimonioId, rateio.competencia)

  unidades.forEach((unidade, unidadeIndex) => {
    const valorCentavos = Math.floor(preview.totalCentavos / unidades.length) + (unidadeIndex < (preview.totalCentavos % unidades.length) ? 1 : 0)
    const lancamento = criarLancamento({
      origem: 'rateio',
      rateioId: rateio.id,
      patrimonioId: rateio.patrimonioId,
      unidadeId: unidade.id,
      contratoId: listarContratosPorUnidade(unidade.id).find((contrato) => contrato.situacao === 'Ativo')?.id || null,
      locatarioId: listarContratosPorUnidade(unidade.id).find((contrato) => contrato.situacao === 'Ativo')?.locatarioId || null,
      tipo: 'receita',
      categoria: rateio.categoria,
      subcategoria: rateio.subcategoria,
      descricao: `${rateio.descricao} - ${unidade.nome}`,
      valor: valorCentavos / 100,
      status: 'pendente',
      dataCompetencia: rateio.competencia,
      observacoes: rateio.observacoes || '',
    })
    lancamentosGeradosIds.push(lancamento.id)
  })

  const atualizado = garantirRateio({
    ...rateio,
    unidadesElegiveis: preview.unidadesElegiveis,
    quantidadeUnidades: preview.quantidadeUnidades,
    valorBasePorUnidade: preview.valorBasePorUnidade,
    diferencaArredondamento: preview.diferencaArredondamento,
    lancamentosGeradosIds,
    status: 'processado',
    processadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  })

  rateios[index] = atualizado
  salvarRateios(rateios)
  return { rateio: atualizado }
}

export function reprocessarRateio(id, dados) {
  const rateio = buscarRateioPorId(id)
  if (!rateio) return { error: 'Rateio não encontrado.' }
  if (rateio.status !== 'processado') return { error: 'Somente rateios processados podem ser reprocessados.' }

  cancelarLancamentosDoRateio(id)
  const updatedRateio = atualizarRateio(id, {
    ...rateio,
    ...dados,
    status: 'rascunho',
    canceladoEm: null,
    processadoEm: null,
  })

  const result = processarRateio(id, updatedRateio)
  return result
}

export function cancelarRateio(id) {
  const rateio = buscarRateioPorId(id)
  if (!rateio) return null
  if (rateio.status === 'cancelado') return rateio
  cancelarLancamentosDoRateio(id)

  const rateios = listarRateios()
  const index = rateios.findIndex((item) => item.id === id)
  rateios[index] = {
    ...rateio,
    status: 'cancelado',
    canceladoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  }
  salvarRateios(rateios)
  return rateios[index]
}
