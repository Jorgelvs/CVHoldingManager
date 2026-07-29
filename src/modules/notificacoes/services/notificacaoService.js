import { listarLancamentos } from '../../financeiro/services/financeiroService.js'
import { listarContas, calcularSaldo } from '../../financeiro/services/contaService.js'
import { listarContratos, contratoAtivoPorUnidade } from '../../contratos/services/contratoService.js'
import { listarDocumentosVencendoPrazo } from '../../documentos/services/documentoService.js'
import { listarUnidades } from '../../unidades/services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { registrarEventoAuditoria } from '../../auditoria/services/auditoriaService.js'
import { obterParametrosNotificacoes } from '../../configuracoes/services/configuracaoService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'
import { applyCreationTimestamps, applyDomainSchema, touchUpdatedAt } from '../../../utils/schemaUtils.js'
import {
  EVENTO_ATUALIZACAO_NOTIFICACOES,
  PRIORIDADE_NOTIFICACAO,
  STATUS_NOTIFICACAO,
  STATUS_TAREFA,
  STORAGE_KEY_NOTIFICACOES,
  STORAGE_KEY_TAREFAS,
  TIPOS_NOTIFICACAO,
} from '../constants/notificacaoConstants.js'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function agoraISO() {
  return new Date().toISOString()
}

function toDateOnly(value) {
  if (!value) return ''
  const data = new Date(value)
  if (Number.isNaN(data.getTime())) return ''
  return data.toISOString().slice(0, 10)
}

function diffDays(dataInicio, dataFim) {
  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null
  const diff = fim.getTime() - inicio.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function carregarLista(storageKey) {
  const parsed = localGet(storageKey, [])
  return Array.isArray(parsed) ? parsed : []
}

function salvarLista(storageKey, itens) {
  localSet(storageKey, itens)
}

function emitirAtualizacao() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENTO_ATUALIZACAO_NOTIFICACOES))
}

function gerarId(prefixo) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizarStatusNotificacao(status) {
  const valores = Object.values(STATUS_NOTIFICACAO)
  return valores.includes(status) ? status : STATUS_NOTIFICACAO.NAO_LIDA
}

function normalizarPrioridade(prioridade) {
  const valores = Object.values(PRIORIDADE_NOTIFICACAO)
  return valores.includes(prioridade) ? prioridade : PRIORIDADE_NOTIFICACAO.MEDIA
}

function normalizarNotificacao(item) {
  const source = applyCreationTimestamps(applyDomainSchema('notificacao', item))

  return {
    id: source?.id || gerarId('notif'),
    titulo: source?.titulo || 'Notificacao',
    descricao: source?.descricao || '',
    tipo: source?.tipo || TIPOS_NOTIFICACAO.TAREFA_MANUAL,
    prioridade: normalizarPrioridade(source?.prioridade),
    dataGeracao: source?.dataGeracao || agoraISO(),
    status: normalizarStatusNotificacao(source?.status),
    modulo: source?.modulo || 'Notificacoes',
    registroId: source?.registroId || '',
    registro: source?.registro || '',
    link: source?.link || '',
    origem: source?.origem || 'automatica',
    dedupeKey: source?.dedupeKey || '',
    createdAt: source?.createdAt,
    updatedAt: source?.updatedAt,
    resolvidaEm: source?.resolvidaEm || null,
    arquivadaEm: source?.arquivadaEm || null,
    resolucaoAutomatica: Boolean(source?.resolucaoAutomatica),
  }
}

function normalizarTarefa(item) {
  const source = applyCreationTimestamps(item)
  const status = item?.status === STATUS_TAREFA.CONCLUIDA ? STATUS_TAREFA.CONCLUIDA : STATUS_TAREFA.PENDENTE
  return {
    id: source?.id || gerarId('task'),
    titulo: source?.titulo || 'Tarefa manual',
    descricao: source?.descricao || '',
    prioridade: normalizarPrioridade(source?.prioridade),
    dataVencimento: source?.dataVencimento || '',
    patrimonioId: source?.patrimonioId || '',
    unidadeId: source?.unidadeId || '',
    contratoId: source?.contratoId || '',
    status,
    createdAt: source?.createdAt,
    updatedAt: source?.updatedAt,
    concluidaEm: source?.concluidaEm || null,
  }
}

function carregarNotificacoes() {
  return carregarLista(STORAGE_KEY_NOTIFICACOES).map(normalizarNotificacao)
}

function salvarNotificacoes(itens) {
  salvarLista(STORAGE_KEY_NOTIFICACOES, itens.map(normalizarNotificacao))
}

function carregarTarefas() {
  return carregarLista(STORAGE_KEY_TAREFAS).map(normalizarTarefa)
}

function salvarTarefas(itens) {
  salvarLista(STORAGE_KEY_TAREFAS, itens.map(normalizarTarefa))
}

function criarNotificacaoAutomatica({
  dedupeKey,
  tipo,
  prioridade,
  titulo,
  descricao,
  modulo,
  registroId,
  registro,
  link,
}) {
  return normalizarNotificacao({
    id: gerarId('notif'),
    dedupeKey,
    tipo,
    prioridade,
    titulo,
    descricao,
    modulo,
    registroId,
    registro,
    link,
    origem: 'automatica',
    dataGeracao: agoraISO(),
    status: STATUS_NOTIFICACAO.NAO_LIDA,
    createdAt: agoraISO(),
    updatedAt: agoraISO(),
  })
}

function gerarNotificacoesAutomaticas() {
  const hoje = hojeISO()
  const notificacoes = []
  const parametros = obterParametrosNotificacoes()
  const tiposAtivos = parametros?.tiposAtivos || {}
  const prazos = parametros?.prazosAntecedencia || {}
  const prioridadesPadrao = parametros?.prioridadesPadrao || {}

  const tipoAtivo = (tipo) => tiposAtivos[tipo] !== false
  const prioridade = (tipo, fallback) => prioridadesPadrao[tipo] || fallback

  const prazoContaVencendo = Number(prazos.contaVencendoDias || 7)
  const faixasContrato = Array.isArray(prazos.contratoVencendoDias) && prazos.contratoVencendoDias.length > 0
    ? [...prazos.contratoVencendoDias].map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0).sort((a, b) => a - b)
    : [30, 60, 90]
  const prazoReajuste = Number(prazos.reajusteDias || 90)
  const prazoDocumento = Number(prazos.documentoDias || 90)

  const lancamentos = listarLancamentos()
  lancamentos.forEach((item) => {
    if (!item?.dataVencimento) return
    if (item.status === 'pago' || item.status === 'cancelado') return

    const diasParaVencer = diffDays(hoje, item.dataVencimento)
    if (diasParaVencer === null) return

    const categoria = String(item.categoria || '').toLowerCase()

    if (tipoAtivo(TIPOS_NOTIFICACAO.ALUGUEL_VENCIDO) && item.tipo === 'receita' && categoria.includes('aluguel') && diasParaVencer < 0) {
      notificacoes.push(
        criarNotificacaoAutomatica({
          dedupeKey: `aluguel-vencido-${item.id}`,
          tipo: TIPOS_NOTIFICACAO.ALUGUEL_VENCIDO,
          prioridade: prioridade(TIPOS_NOTIFICACAO.ALUGUEL_VENCIDO, PRIORIDADE_NOTIFICACAO.ALTA),
          titulo: 'Aluguel vencido',
          descricao: `O lancamento ${item.descricao || item.id} esta com vencimento em atraso.`,
          modulo: 'Financeiro',
          registroId: item.id,
          registro: item.descricao || item.id,
          link: `/financeiro/${item.id}`,
        }),
      )
    }

    if (tipoAtivo(TIPOS_NOTIFICACAO.CONTA_VENCIDA) && item.tipo === 'despesa' && diasParaVencer < 0) {
      notificacoes.push(
        criarNotificacaoAutomatica({
          dedupeKey: `conta-vencida-${item.id}`,
          tipo: TIPOS_NOTIFICACAO.CONTA_VENCIDA,
          prioridade: prioridade(TIPOS_NOTIFICACAO.CONTA_VENCIDA, PRIORIDADE_NOTIFICACAO.ALTA),
          titulo: 'Conta vencida',
          descricao: `A conta ${item.descricao || item.id} esta vencida e pendente de baixa.`,
          modulo: 'Financeiro',
          registroId: item.id,
          registro: item.descricao || item.id,
          link: `/financeiro/${item.id}`,
        }),
      )
    }

    if (tipoAtivo(TIPOS_NOTIFICACAO.CONTA_VENCENDO_7_DIAS) && item.tipo === 'despesa' && diasParaVencer >= 0 && diasParaVencer <= prazoContaVencendo) {
      notificacoes.push(
        criarNotificacaoAutomatica({
          dedupeKey: `conta-vencendo-7-${item.id}`,
          tipo: TIPOS_NOTIFICACAO.CONTA_VENCENDO_7_DIAS,
          prioridade: prioridade(TIPOS_NOTIFICACAO.CONTA_VENCENDO_7_DIAS, diasParaVencer <= 2 ? PRIORIDADE_NOTIFICACAO.ALTA : PRIORIDADE_NOTIFICACAO.MEDIA),
          titulo: `Conta vencendo em ate ${prazoContaVencendo} dias`,
          descricao: `A conta ${item.descricao || item.id} vence em ${diasParaVencer} dia(s).`,
          modulo: 'Financeiro',
          registroId: item.id,
          registro: item.descricao || item.id,
          link: `/financeiro/${item.id}`,
        }),
      )
    }
  })

  const maiorFaixaContrato = Math.max(...faixasContrato)
  const contratosVencendo = listarContratos()
    .filter((item) => item.situacao === 'Ativo' && item.dataFim)
    .map((contrato) => ({
      contrato,
      diasRestantes: diffDays(hoje, contrato.dataFim),
    }))
    .filter((item) => Number.isFinite(item.diasRestantes) && item.diasRestantes >= 0 && item.diasRestantes <= maiorFaixaContrato)

  contratosVencendo.forEach(({ contrato, diasRestantes }) => {
    const faixa = faixasContrato.find((limite) => diasRestantes <= limite)
    if (!faixa) return

    let tipo = TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_90_DIAS
    if (faixa <= 30) tipo = TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_30_DIAS
    else if (faixa <= 60) tipo = TIPOS_NOTIFICACAO.CONTRATO_VENCENDO_60_DIAS

    if (!tipoAtivo(tipo)) return

    const prioridadeFallback = faixa <= 30
      ? PRIORIDADE_NOTIFICACAO.ALTA
      : faixa <= 60
      ? PRIORIDADE_NOTIFICACAO.MEDIA
      : PRIORIDADE_NOTIFICACAO.BAIXA

    notificacoes.push(
      criarNotificacaoAutomatica({
        dedupeKey: `contrato-vencendo-${faixa}-${contrato.id}`,
        tipo,
        prioridade: prioridade(tipo, prioridadeFallback),
        titulo: `Contrato vencendo em ate ${faixa} dias`,
        descricao: `O contrato ${contrato.codigoInterno || contrato.id} vence em ${diasRestantes} dia(s).`,
        modulo: 'Contratos',
        registroId: contrato.id,
        registro: contrato.codigoInterno || contrato.id,
        link: `/contratos/${contrato.id}`,
      }),
    )
  })

  listarContratos().forEach((contrato) => {
    const proximaData = contrato.proximaDataReajuste
    if (!contrato?.id || !proximaData) return
    if (contrato.situacao !== 'Ativo') return
    const dias = diffDays(hoje, proximaData)
    if (dias === null || dias < 0 || dias > prazoReajuste) return
    if (!tipoAtivo(TIPOS_NOTIFICACAO.REAJUSTE_PENDENTE)) return

    notificacoes.push(
      criarNotificacaoAutomatica({
        dedupeKey: `reajuste-pendente-${contrato.id}`,
        tipo: TIPOS_NOTIFICACAO.REAJUSTE_PENDENTE,
        prioridade: prioridade(TIPOS_NOTIFICACAO.REAJUSTE_PENDENTE, dias <= 7 ? PRIORIDADE_NOTIFICACAO.ALTA : PRIORIDADE_NOTIFICACAO.MEDIA),
        titulo: 'Reajuste pendente',
        descricao: `Contrato ${contrato.codigoInterno || contrato.id} com reajuste previsto para ${proximaData}.`,
        modulo: 'Contratos',
        registroId: contrato.id,
        registro: contrato.codigoInterno || contrato.id,
        link: `/contratos/${contrato.id}`,
      }),
    )
  })

  listarDocumentosVencendoPrazo({ dias: prazoDocumento }).forEach((documento) => {
    if (!documento?.id) return
    if (!tipoAtivo(TIPOS_NOTIFICACAO.DOCUMENTO_VENCENDO)) return
    notificacoes.push(
      criarNotificacaoAutomatica({
        dedupeKey: `documento-vencendo-${documento.id}`,
        tipo: TIPOS_NOTIFICACAO.DOCUMENTO_VENCENDO,
        prioridade: prioridade(TIPOS_NOTIFICACAO.DOCUMENTO_VENCENDO, documento.diasRestantes <= 15 ? PRIORIDADE_NOTIFICACAO.ALTA : PRIORIDADE_NOTIFICACAO.MEDIA),
        titulo: 'Documento vencendo',
        descricao: `Documento ${documento.nome || documento.id} vence em ${documento.diasRestantes} dia(s).`,
        modulo: 'Documentos',
        registroId: documento.id,
        registro: documento.nome || documento.id,
        link: `/documentos?alerta=vencendo&search=${encodeURIComponent(documento.nome || '')}`,
      }),
    )
  })

  const contratos = listarContratos()
  const mapaContratosAtivos = new Set(contratos.filter((item) => item.situacao === 'Ativo').map((item) => item.unidadeId))
  const unidadeVagaAtiva = tipoAtivo(TIPOS_NOTIFICACAO.UNIDADE_VAGA)
  listarUnidades().forEach((unidade) => {
    if (!unidadeVagaAtiva) return
    if (!unidade?.id) return
    if (mapaContratosAtivos.has(unidade.id)) return
    if (contratoAtivoPorUnidade(unidade.id)) return

    notificacoes.push(
      criarNotificacaoAutomatica({
        dedupeKey: `unidade-vaga-${unidade.id}`,
        tipo: TIPOS_NOTIFICACAO.UNIDADE_VAGA,
        prioridade: prioridade(TIPOS_NOTIFICACAO.UNIDADE_VAGA, PRIORIDADE_NOTIFICACAO.MEDIA),
        titulo: 'Unidade vaga',
        descricao: `A unidade ${unidade.nome || unidade.codigoInterno || unidade.id} esta sem contrato ativo.`,
        modulo: 'Unidades',
        registroId: unidade.id,
        registro: unidade.nome || unidade.codigoInterno || unidade.id,
        link: `/unidades/${unidade.id}`,
      }),
    )
  })

  const saldoNegativoAtivo = tipoAtivo(TIPOS_NOTIFICACAO.SALDO_NEGATIVO_CONTA)
  listarContas().filter((conta) => conta.ativa).forEach((conta) => {
    if (!saldoNegativoAtivo) return
    const saldo = Number(calcularSaldo(conta.id) || 0)
    if (saldo >= 0) return

    notificacoes.push(
      criarNotificacaoAutomatica({
        dedupeKey: `saldo-negativo-${conta.id}`,
        tipo: TIPOS_NOTIFICACAO.SALDO_NEGATIVO_CONTA,
        prioridade: prioridade(TIPOS_NOTIFICACAO.SALDO_NEGATIVO_CONTA, saldo < -1000 ? PRIORIDADE_NOTIFICACAO.CRITICA : PRIORIDADE_NOTIFICACAO.ALTA),
        titulo: 'Saldo negativo em conta financeira',
        descricao: `A conta ${conta.nome || conta.id} esta com saldo negativo (${saldo.toFixed(2)}).`,
        modulo: 'Financeiro',
        registroId: conta.id,
        registro: conta.nome || conta.id,
        link: `/financeiro/contas/${conta.id}`,
      }),
    )
  })

  return notificacoes
}

function sincronizarNotificacoesAutomaticas() {
  const atuais = gerarNotificacoesAutomaticas()
  const atuaisPorChave = new Map(atuais.map((item) => [item.dedupeKey, item]))
  const existentes = carregarNotificacoes()

  let alterou = false
  const atualizadas = existentes.map((item) => {
    if (item.origem !== 'automatica' || !item.dedupeKey) return item

    const novo = atuaisPorChave.get(item.dedupeKey)
    if (!novo) {
      if (item.status === STATUS_NOTIFICACAO.RESOLVIDA || item.status === STATUS_NOTIFICACAO.ARQUIVADA) {
        return item
      }
      alterou = true
      return {
        ...touchUpdatedAt(item),
        status: STATUS_NOTIFICACAO.RESOLVIDA,
        resolvidaEm: agoraISO(),
        resolucaoAutomatica: true,
      }
    }

    atuaisPorChave.delete(item.dedupeKey)

    const houveMudanca =
      item.titulo !== novo.titulo ||
      item.descricao !== novo.descricao ||
      item.prioridade !== novo.prioridade ||
      item.modulo !== novo.modulo ||
      item.registro !== novo.registro ||
      item.link !== novo.link

    if (!houveMudanca) return item

    alterou = true
    return {
      ...touchUpdatedAt(item),
      titulo: novo.titulo,
      descricao: novo.descricao,
      prioridade: novo.prioridade,
      modulo: novo.modulo,
      registro: novo.registro,
      link: novo.link,
    }
  })

  if (atuaisPorChave.size > 0) {
    alterou = true
    atuaisPorChave.forEach((item) => {
      atualizadas.push(item)
    })
  }

  if (alterou) {
    salvarNotificacoes(atualizadas)
    emitirAtualizacao()
  }

  return atualizadas
}

function filtrarPorPeriodo(dataBase, periodoInicio, periodoFim) {
  const data = toDateOnly(dataBase)
  if (!data) return true
  if (periodoInicio && data < periodoInicio) return false
  if (periodoFim && data > periodoFim) return false
  return true
}

function filtrarTexto(item, termo) {
  if (!termo) return true
  const texto = `${item.titulo || ''} ${item.descricao || ''} ${item.registro || ''}`.toLowerCase()
  return texto.includes(termo.toLowerCase())
}

export function listarNotificacoes(filtros = {}) {
  const {
    status = '',
    tipo = '',
    prioridade = '',
    modulo = '',
    periodoInicio = '',
    periodoFim = '',
    termo = '',
  } = filtros

  return sincronizarNotificacoesAutomaticas()
    .filter((item) => (status ? item.status === status : true))
    .filter((item) => (tipo ? item.tipo === tipo : true))
    .filter((item) => (prioridade ? item.prioridade === prioridade : true))
    .filter((item) => (modulo ? item.modulo === modulo : true))
    .filter((item) => filtrarPorPeriodo(item.dataGeracao, periodoInicio, periodoFim))
    .filter((item) => filtrarTexto(item, termo))
    .sort((a, b) => (b.dataGeracao || '').localeCompare(a.dataGeracao || ''))
}

export function contarNotificacoesNaoLidas() {
  return sincronizarNotificacoesAutomaticas().filter((item) => item.status === STATUS_NOTIFICACAO.NAO_LIDA).length
}

export function marcarNotificacaoComoLida(id) {
  const notificacoes = carregarNotificacoes()
  const index = notificacoes.findIndex((item) => item.id === id)
  if (index === -1) return null
  if (notificacoes[index].status !== STATUS_NOTIFICACAO.NAO_LIDA) return notificacoes[index]

  notificacoes[index] = {
    ...touchUpdatedAt(notificacoes[index]),
    status: STATUS_NOTIFICACAO.LIDA,
  }

  salvarNotificacoes(notificacoes)
  emitirAtualizacao()

  registrarEventoAuditoria({
    modulo: 'Notificacoes',
    acao: 'NOTIFICACAO_LIDA',
    registroId: notificacoes[index].id,
    registro: notificacoes[index].titulo,
    descricao: `Notificacao marcada como lida: ${notificacoes[index].titulo}`,
    valorAnterior: { status: STATUS_NOTIFICACAO.NAO_LIDA },
    novoValor: { status: STATUS_NOTIFICACAO.LIDA },
    camposAlterados: ['status'],
  })

  return notificacoes[index]
}

export function marcarTodasNotificacoesComoLidas() {
  const notificacoes = carregarNotificacoes()
  let alteradas = 0

  const atualizadas = notificacoes.map((item) => {
    if (item.status !== STATUS_NOTIFICACAO.NAO_LIDA) return item
    alteradas += 1
    return {
      ...touchUpdatedAt(item),
      status: STATUS_NOTIFICACAO.LIDA,
    }
  })

  if (alteradas === 0) return 0

  salvarNotificacoes(atualizadas)
  emitirAtualizacao()

  registrarEventoAuditoria({
    modulo: 'Notificacoes',
    acao: 'NOTIFICACAO_LIDA_EM_LOTE',
    registroId: 'notificacoes',
    registro: 'notificacoes',
    descricao: `Marcacao em lote de ${alteradas} notificacao(oes) como lida(s).`,
    valorAnterior: { quantidadeNaoLida: alteradas },
    novoValor: { quantidadeNaoLida: 0 },
    camposAlterados: ['status'],
  })

  return alteradas
}

export function resolverNotificacao(id) {
  const notificacoes = carregarNotificacoes()
  const index = notificacoes.findIndex((item) => item.id === id)
  if (index === -1) return null

  const anterior = notificacoes[index]
  notificacoes[index] = {
    ...touchUpdatedAt(anterior),
    status: STATUS_NOTIFICACAO.RESOLVIDA,
    resolvidaEm: agoraISO(),
    resolucaoAutomatica: false,
  }

  salvarNotificacoes(notificacoes)
  emitirAtualizacao()

  registrarEventoAuditoria({
    modulo: 'Notificacoes',
    acao: 'NOTIFICACAO_RESOLVIDA',
    registroId: notificacoes[index].id,
    registro: notificacoes[index].titulo,
    descricao: `Notificacao resolvida: ${notificacoes[index].titulo}`,
    valorAnterior: { status: anterior.status },
    novoValor: { status: STATUS_NOTIFICACAO.RESOLVIDA },
    camposAlterados: ['status'],
  })

  return notificacoes[index]
}

export function arquivarNotificacao(id) {
  const notificacoes = carregarNotificacoes()
  const index = notificacoes.findIndex((item) => item.id === id)
  if (index === -1) return null

  const anterior = notificacoes[index]
  notificacoes[index] = {
    ...touchUpdatedAt(anterior),
    status: STATUS_NOTIFICACAO.ARQUIVADA,
    arquivadaEm: agoraISO(),
  }

  salvarNotificacoes(notificacoes)
  emitirAtualizacao()

  registrarEventoAuditoria({
    modulo: 'Notificacoes',
    acao: 'NOTIFICACAO_ARQUIVADA',
    registroId: notificacoes[index].id,
    registro: notificacoes[index].titulo,
    descricao: `Notificacao arquivada: ${notificacoes[index].titulo}`,
    valorAnterior: { status: anterior.status },
    novoValor: { status: STATUS_NOTIFICACAO.ARQUIVADA },
    camposAlterados: ['status'],
  })

  return notificacoes[index]
}

function getTarefaRelacionamento(tarefa) {
  if (tarefa.contratoId) {
    const contrato = listarContratos().find((item) => item.id === tarefa.contratoId)
    return {
      modulo: 'Contratos',
      registroId: tarefa.contratoId,
      registro: contrato?.codigoInterno || tarefa.contratoId,
      link: `/contratos/${tarefa.contratoId}`,
    }
  }

  if (tarefa.unidadeId) {
    const unidade = listarUnidades().find((item) => item.id === tarefa.unidadeId)
    return {
      modulo: 'Unidades',
      registroId: tarefa.unidadeId,
      registro: unidade?.nome || unidade?.codigoInterno || tarefa.unidadeId,
      link: `/unidades/${tarefa.unidadeId}`,
    }
  }

  if (tarefa.patrimonioId) {
    const patrimonio = buscarPatrimonioPorId(tarefa.patrimonioId)
    return {
      modulo: 'Patrimonios',
      registroId: tarefa.patrimonioId,
      registro: patrimonio?.nome || tarefa.patrimonioId,
      link: `/patrimonios/${tarefa.patrimonioId}`,
    }
  }

  return {
    modulo: 'Notificacoes',
    registroId: tarefa.id,
    registro: tarefa.titulo,
    link: '',
  }
}

export function listarTarefasManuais({ status = '', prioridade = '', periodoInicio = '', periodoFim = '', termo = '' } = {}) {
  return carregarTarefas()
    .filter((item) => (status ? item.status === status : true))
    .filter((item) => (prioridade ? item.prioridade === prioridade : true))
    .filter((item) => filtrarPorPeriodo(item.createdAt, periodoInicio, periodoFim))
    .filter((item) => filtrarTexto(item, termo))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function criarTarefaManual(dados) {
  const titulo = String(dados?.titulo || '').trim()
  if (!titulo) {
    return { error: 'Titulo da tarefa e obrigatorio.' }
  }

  const tarefa = normalizarTarefa({
    id: gerarId('task'),
    titulo,
    descricao: String(dados?.descricao || '').trim(),
    prioridade: dados?.prioridade || PRIORIDADE_NOTIFICACAO.MEDIA,
    dataVencimento: dados?.dataVencimento || '',
    patrimonioId: dados?.patrimonioId || '',
    unidadeId: dados?.unidadeId || '',
    contratoId: dados?.contratoId || '',
    status: STATUS_TAREFA.PENDENTE,
    createdAt: agoraISO(),
    updatedAt: agoraISO(),
  })

  const tarefas = carregarTarefas()
  tarefas.push(tarefa)
  salvarTarefas(tarefas)
  emitirAtualizacao()

  registrarEventoAuditoria({
    modulo: 'Notificacoes',
    acao: 'TAREFA_MANUAL_CRIADA',
    registroId: tarefa.id,
    registro: tarefa.titulo,
    descricao: `Criacao da tarefa manual: ${tarefa.titulo}`,
    valorAnterior: null,
    novoValor: tarefa,
    camposAlterados: Object.keys(tarefa),
  })

  return tarefa
}

export function concluirTarefaManual(id) {
  const tarefas = carregarTarefas()
  const index = tarefas.findIndex((item) => item.id === id)
  if (index === -1) return null

  const anterior = tarefas[index]
  tarefas[index] = {
    ...touchUpdatedAt(anterior),
    status: STATUS_TAREFA.CONCLUIDA,
    concluidaEm: agoraISO(),
  }

  salvarTarefas(tarefas)
  emitirAtualizacao()

  registrarEventoAuditoria({
    modulo: 'Notificacoes',
    acao: 'TAREFA_MANUAL_CONCLUIDA',
    registroId: tarefas[index].id,
    registro: tarefas[index].titulo,
    descricao: `Conclusao da tarefa manual: ${tarefas[index].titulo}`,
    valorAnterior: { status: anterior.status },
    novoValor: { status: STATUS_TAREFA.CONCLUIDA },
    camposAlterados: ['status'],
  })

  return tarefas[index]
}

export function listarCentralNotificacoesETarefas(filtros = {}) {
  const notificacoes = listarNotificacoes(filtros)
  const tarefas = listarTarefasManuais({
    status: filtros.status,
    prioridade: filtros.prioridade,
    periodoInicio: filtros.periodoInicio,
    periodoFim: filtros.periodoFim,
    termo: filtros.termo,
  })

  const tarefasMapeadas = tarefas
    .map((tarefa) => {
      const rel = getTarefaRelacionamento(tarefa)
      return {
        id: tarefa.id,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || 'Tarefa manual criada pela operacao.',
        tipo: TIPOS_NOTIFICACAO.TAREFA_MANUAL,
        prioridade: tarefa.prioridade,
        dataGeracao: tarefa.createdAt,
        status: tarefa.status,
        modulo: rel.modulo,
        registroId: rel.registroId,
        registro: rel.registro,
        link: rel.link,
        origem: 'manual',
        isTarefa: true,
        dataVencimento: tarefa.dataVencimento,
      }
    })
    .filter((item) => (filtros.tipo ? item.tipo === filtros.tipo : true))
    .filter((item) => (filtros.modulo ? item.modulo === filtros.modulo : true))

  return [...notificacoes.map((item) => ({ ...item, isTarefa: false })), ...tarefasMapeadas]
    .sort((a, b) => (b.dataGeracao || '').localeCompare(a.dataGeracao || ''))
}

export function listarResumoFiltrosNotificacoes() {
  const notificacoes = listarNotificacoes()
  const tarefas = carregarTarefas()

  const tipos = new Set(notificacoes.map((item) => item.tipo))
  tipos.add(TIPOS_NOTIFICACAO.TAREFA_MANUAL)

  const modulos = new Set(notificacoes.map((item) => item.modulo))
  tarefas.forEach((tarefa) => {
    const rel = getTarefaRelacionamento(tarefa)
    modulos.add(rel.modulo)
  })

  const status = [
    STATUS_NOTIFICACAO.NAO_LIDA,
    STATUS_NOTIFICACAO.LIDA,
    STATUS_NOTIFICACAO.RESOLVIDA,
    STATUS_NOTIFICACAO.ARQUIVADA,
    STATUS_TAREFA.PENDENTE,
    STATUS_TAREFA.CONCLUIDA,
  ]

  return {
    tipos: Array.from(tipos).filter(Boolean).sort(),
    modulos: Array.from(modulos).filter(Boolean).sort(),
    status,
    prioridades: Object.values(PRIORIDADE_NOTIFICACAO),
  }
}
