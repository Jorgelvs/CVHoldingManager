import { listarPatrimonios, buscarPatrimonioPorId } from '../modules/patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../modules/unidades/services/unidadeService.js'
import { listarContas } from '../modules/financeiro/services/contaService.js'
import { listarContratos } from '../modules/contratos/services/contratoService.js'
import { listarLocatarios } from '../modules/locatarios/services/locatarioService.js'
import { buscarSubcategoriaDetalhe } from '../modules/financeiro/services/categoriaFinanceiraService.js'

let interpreterDeps = {
  listarPatrimonios,
  buscarPatrimonioPorId,
  listarUnidades,
  listarContas,
  listarContratos,
  listarLocatarios,
  buscarSubcategoriaDetalhe,
}

export function setCommandInterpreterDependencies(overrides = {}) {
  interpreterDeps = {
    ...interpreterDeps,
    ...overrides,
  }
}

export function resetCommandInterpreterDependencies() {
  interpreterDeps = {
    listarPatrimonios,
    buscarPatrimonioPorId,
    listarUnidades,
    listarContas,
    listarContratos,
    listarLocatarios,
    buscarSubcategoriaDetalhe,
  }
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/n[º°]/g, 'n')
    .replace(/\s+/g, ' ')
    .trim()
}

function toCurrency(value) {
  if (value == null) return ''
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function toIsoDate(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toCompetencia(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseAmount(text) {
  const normalized = normalize(text)
  if (!normalized) return null

  const parseBrazilianNumber = (raw) => {
    const token = String(raw || '').trim()
    if (!token) return null

    const hasComma = token.includes(',')
    const hasDot = token.includes('.')
    let normalizedNumber = token

    if (hasComma && hasDot) {
      normalizedNumber = token.replace(/\./g, '').replace(/,/g, '.')
    } else if (hasComma) {
      const [intPart, decimalPart] = token.split(',')
      if (decimalPart && decimalPart.length <= 2) {
        normalizedNumber = `${intPart.replace(/\./g, '')}.${decimalPart}`
      } else {
        normalizedNumber = token.replace(/,/g, '')
      }
    } else if (hasDot) {
      if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(token)) {
        normalizedNumber = token.replace(/\./g, '').replace(/,/g, '.')
      }
    }

    const parsed = Number(normalizedNumber)
    if (!Number.isFinite(parsed)) return null
    return parsed
  }

  const numericToken = '([0-9]+(?:[\\.,][0-9]{1,2})?|[0-9]{1,3}(?:\\.[0-9]{3})+(?:,[0-9]{1,2})?)'

  const parseMatch = (match) => {
    if (!match) return null
    const amount = parseBrazilianNumber(match[1])
    if (amount == null) return null
    if (match[2]) return amount * 1000
    return amount
  }

  const currencyMatch = normalized.match(new RegExp(`(?:r\\$|reais?|rs)\\s*${numericToken}(?:\\s+(mil|m)\\b)?(?![0-9])`, 'i'))
  const byCurrency = parseMatch(currencyMatch)
  if (byCurrency != null) return byCurrency

  const contextMatch = normalized.match(new RegExp(`(?:de|por|valor|paguei|recebi|pagamento|recebimento)\\s*${numericToken}(?:\\s+(mil|m)\\b)?(?![0-9])`, 'i'))
  const byContext = parseMatch(contextMatch)
  if (byContext != null) return byContext

  const standalone = normalized.match(new RegExp(`^${numericToken}(?:\\s+(mil|m)\\b)?$`, 'i'))
  const byStandalone = parseMatch(standalone)
  if (byStandalone != null) return byStandalone

  return null
}

function parseDate(text) {
  const normalized = normalize(text)
  if (!normalized) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (normalized.includes('hoje')) return now
  if (normalized.includes('ontem')) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return d
  }

  const parseLocalDate = (year, month, day) => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const parsed = new Date(year, month - 1, day)
    if (Number.isNaN(parsed.getTime())) return null
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      return null
    }
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  const isoDate = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (isoDate) {
    const year = Number(isoDate[1])
    const month = Number(isoDate[2])
    const day = Number(isoDate[3])
    const parsed = parseLocalDate(year, month, day)
    if (parsed) return parsed
  }

  const slashDate = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slashDate) {
    const day = Number(slashDate[1])
    const month = Number(slashDate[2])
    const rawYear = slashDate[3] ? Number(slashDate[3]) : now.getFullYear()
    const year = rawYear < 100 ? 2000 + rawYear : rawYear
    const parsed = parseLocalDate(year, month, day)
    if (parsed) return parsed
  }

  return null
}

function extractUnitReference(text) {
  const normalized = normalize(text)
  const match = normalized.match(/\b(casa|kitnet|loja|unidade|imovel|apto?|apartamento)\s*(?:n\.?|num(?:ero)?\.?|#)?\s*0*([0-9]+)\b/)
  if (!match) return null
  return {
    type: match[1],
    number: String(match[2] || '').replace(/^0+/, ''),
  }
}

function canonicalUnitType(type) {
  if (type === 'apto') return 'apartamento'
  if (type === 'imovel') return 'casa'
  return type
}

function unitTypeMatches(refType, name, code) {
  if (!refType) return true
  if (name.includes(refType) || code.includes(refType)) return true
  if (refType === 'apartamento' && (name.includes('apto') || code.includes('apto'))) return true
  if (refType === 'casa' && (name.includes('imovel') || code.includes('imovel'))) return true
  return false
}

function listMatchingUnits(text) {
  const normalized = normalize(text)
  const units = interpreterDeps.listarUnidades()

  const exactTextMatches = units.filter((item) => {
    const name = normalize(item.nome || '')
    const code = normalize(item.codigoInterno || '')
    return (name && normalized.includes(name)) || (code && normalized.includes(code))
  })
  if (exactTextMatches.length > 0) return exactTextMatches

  const ref = extractUnitReference(text)
  if (!ref) return []

  const type = canonicalUnitType(ref.type)
  const number = String(ref.number || '').replace(/^0+/, '')

  return units.filter((item) => {
    const name = normalize(item.nome || '')
    const code = normalize(item.codigoInterno || '')
    if (!name && !code) return false

    const nameNum = (name.match(/\b0*([0-9]+)\b/) || [])[1] || ''
    const codeNum = (code.match(/\b0*([0-9]+)\b/) || [])[1] || ''
    const sameNumber = nameNum.replace(/^0+/, '') === number || codeNum.replace(/^0+/, '') === number
    if (!sameNumber) return false

    return unitTypeMatches(type, name, code)
  })
}

function buildUnitCandidate(unit) {
  if (!unit) return null
  const patrimonio = unit.patrimonioId ? interpreterDeps.buscarPatrimonioPorId(unit.patrimonioId) : null
  return {
    id: unit.id,
    nome: unit.nome,
    patrimonioId: unit.patrimonioId || '',
    patrimonioLabel: patrimonio?.nome || '',
    codigoInterno: unit.codigoInterno || '',
  }
}

function toUnitDisplayLabel(unitCandidate) {
  if (!unitCandidate) return ''
  if (!unitCandidate.patrimonioLabel) return unitCandidate.nome || ''
  return `${unitCandidate.nome || ''} - ${unitCandidate.patrimonioLabel}`
}

function narrowAmbiguousByPatrimonio(text, candidates) {
  const normalized = normalize(text)
  if (!normalized || !Array.isArray(candidates) || candidates.length <= 1) return []
  const narrowed = candidates.filter((item) => {
    const patrimonioName = normalize(item.patrimonioLabel || '')
    return patrimonioName && normalized.includes(patrimonioName)
  })
  return narrowed
}

export function resolveUnitFromCatalog(text) {
  const ref = extractUnitReference(text)
  const units = interpreterDeps.listarUnidades()

  if (!Array.isArray(units) || units.length === 0) {
    return {
      status: 'empty_catalog',
      query: ref ? `${ref.type} ${ref.number}` : '',
      matches: [],
      unit: null,
    }
  }

  if (!ref) {
    return {
      status: 'no_reference',
      query: '',
      matches: [],
      unit: null,
    }
  }

  const matches = listMatchingUnits(text)
  const candidates = (matches || []).map(buildUnitCandidate).filter(Boolean)
  if (matches.length === 1) {
    const unit = candidates[0]
    return {
      status: 'exact',
      query: `${ref.type} ${ref.number}`,
      matches: candidates,
      unit,
      unidadeId: unit.id,
      unidadeLabel: unit.nome || '',
      patrimonioId: unit.patrimonioId || '',
      patrimonioLabel: unit.patrimonioLabel || '',
    }
  }

  if (matches.length > 1) {
    const narrowed = narrowAmbiguousByPatrimonio(text, candidates)
    if (narrowed.length === 1) {
      const unit = narrowed[0]
      return {
        status: 'exact',
        query: `${ref.type} ${ref.number}`,
        matches: candidates,
        unit,
        unidadeId: unit.id,
        unidadeLabel: unit.nome || '',
        patrimonioId: unit.patrimonioId || '',
        patrimonioLabel: unit.patrimonioLabel || '',
      }
    }

    return {
      status: 'ambiguous',
      query: `${ref.type} ${ref.number}`,
      matches: candidates,
      unit: null,
    }
  }

  return {
    status: 'not_found',
    query: `${ref.type} ${ref.number}`,
    matches: [],
    unit: null,
  }
}

export function suggestUnitsFromCatalog(text, limit = 5) {
  const ref = extractUnitReference(text)
  const units = interpreterDeps.listarUnidades()
  if (!ref) {
    return units
      .slice(0, limit)
      .map((item) => toUnitDisplayLabel(buildUnitCandidate(item)))
      .filter(Boolean)
  }

  const type = canonicalUnitType(ref.type)
  return units
    .filter((item) => {
      const name = normalize(item.nome || '')
      const code = normalize(item.codigoInterno || '')
      return unitTypeMatches(type, name, code)
    })
    .slice(0, limit)
    .map((item) => toUnitDisplayLabel(buildUnitCandidate(item)))
    .filter(Boolean)
}

function requiresPropertyLink(originalText, categoria, unitResolution, patrimonioMatch) {
  const normalized = normalize(originalText)
  const hasExplicitPropertyReference = /\b(casa|kitnet|apartamento|apto|unidade|imovel|patrimonio)\b/.test(normalized)
  const hasUnitSignal = unitResolution.status === 'exact' || unitResolution.status === 'ambiguous' || unitResolution.status === 'not_found'
  const isMaintenance = categoria === 'Manutenção'
  return Boolean(hasExplicitPropertyReference || hasUnitSignal || isMaintenance || patrimonioMatch?.id)
}

function findPatrimonio(text) {
  const normalized = normalize(text)
  return interpreterDeps.listarPatrimonios().find((item) => {
    const name = normalize(item.nome || '')
    const code = normalize(item.codigo || '')
    return (name && normalized.includes(name)) || (code && normalized.includes(code))
  }) || null
}

function findAccount(text) {
  const normalized = normalize(text)
  const contas = interpreterDeps.listarContas()

  const exact = contas.find((conta) => {
    const name = normalize(conta.nome)
    return name && normalized.includes(name)
  })
  if (exact) return exact

  const byKeyword = contas.find((conta) => {
    const name = normalize(conta.nome)
    if (!name) return false
    if (name.includes('conta corrente') && normalized.includes('conta corrente')) return true
    if (name.includes('caixa') && normalized.includes('caixa')) return true
    if (name.includes('caucao') && normalized.includes('caucao')) return true
    if (name.includes('invest') && normalized.includes('invest')) return true
    return false
  })

  return byKeyword || null
}

function findContractAndLocatario(text) {
  const normalized = normalize(text)
  const contratos = interpreterDeps.listarContratos()
  const locatarios = interpreterDeps.listarLocatarios()

  const contratosMatch = contratos.filter((item) => {
    const codigo = normalize(item.codigoInterno || '')
    return codigo && normalized.includes(codigo)
  })

  if (contratosMatch.length === 1) {
    const contrato = contratosMatch[0]
    const locatario = contrato.locatarioId ? locatarios.find((item) => item.id === contrato.locatarioId) : null
    return {
      contratoId: contrato.id,
      contratoLabel: contrato.codigoInterno || contrato.id,
      locatarioId: locatario?.id || contrato.locatarioId || null,
      locatarioLabel: locatario?.nomeCompleto || '',
    }
  }

  const locatariosMatch = locatarios.filter((item) => {
    const nome = normalize(item.nomeCompleto || '')
    return nome && normalized.includes(nome)
  })

  if (locatariosMatch.length === 1) {
    const loc = locatariosMatch[0]
    return {
      contratoId: null,
      contratoLabel: '',
      locatarioId: loc.id,
      locatarioLabel: loc.nomeCompleto || '',
    }
  }

  return {
    contratoId: null,
    contratoLabel: '',
    locatarioId: null,
    locatarioLabel: '',
  }
}

function findCategory(text, natureza) {
  const normalized = normalize(text)

  const receitas = [
    { nome: 'Aluguel', keywords: ['aluguel'] },
    { nome: 'Condomínio', keywords: ['condominio', 'condomínio'] },
    { nome: 'Multa', keywords: ['multa'] },
    { nome: 'Juros', keywords: ['juros'] },
    { nome: 'Outras receitas', keywords: ['recebimento', 'receita', 'entrada'] },
  ]

  const despesas = [
    { nome: 'Água', keywords: ['agua', 'água'] },
    { nome: 'Energia', keywords: ['energia', 'luz'] },
    { nome: 'Faxina', keywords: ['faxina', 'limpeza'] },
    { nome: 'Manutenção', keywords: ['manutencao', 'manutenção', 'pintor', 'pintura', 'eletricista', 'eletrica', 'elétrica', 'hidraulica', 'hidráulica', 'reparo', 'conserto', 'pedreiro', 'jardinagem', 'dedetizacao', 'dedetização'] },
    { nome: 'IPTU', keywords: ['iptu'] },
    { nome: 'Comissão imobiliária', keywords: ['comissao', 'comissão', 'imobiliaria', 'imobiliária'] },
    { nome: 'Seguro', keywords: ['seguro'] },
    { nome: 'Outras despesas', keywords: ['despesa', 'pagamento', 'taxa'] },
  ]

  const source = natureza === 'receita' ? receitas : despesas
  const category = source.find((item) => item.keywords.some((kw) => normalized.includes(kw)))
  if (!category) return { nome: '', subcategoria: '' }

  if (category.nome !== 'Manutenção') {
    return { nome: category.nome, subcategoria: '' }
  }

  const subcategorias = [
    { nome: 'Elétrica', keywords: ['eletrica', 'elétrica', 'eletricista'] },
    { nome: 'Pintura', keywords: ['pintura', 'pintor'] },
    { nome: 'Hidráulica', keywords: ['hidraulica', 'hidráulica'] },
    { nome: 'Jardinagem', keywords: ['jardinagem'] },
    { nome: 'Dedetização', keywords: ['dedetizacao', 'dedetização'] },
    { nome: 'Reparos gerais', keywords: ['reparo', 'conserto', 'pedreiro'] },
  ]

  const sub = subcategorias.find((item) => item.keywords.some((kw) => normalized.includes(kw)))
  return { nome: category.nome, subcategoria: sub?.nome || '' }
}

function resolveSubcategoria(natureza, categoria, subcategoria) {
  if (!natureza || !categoria || !subcategoria) return { id: '', label: '' }
  const item = interpreterDeps.buscarSubcategoriaDetalhe(natureza, categoria, subcategoria)
  if (!item) return { id: '', label: subcategoria }
  return { id: item.id, label: item.nome }
}

function detectIntent(text) {
  const normalized = normalize(text)

  if (/\b(quem esta inadimplente|quem está inadimplente|inadimplente|inadimplencia|inadimplência)\b/.test(normalized)) {
    return { intentType: 'query', intent: 'consultar_inadimplencia', queryType: 'inadimplencia' }
  }

  if (/\b(quais contas vencem esta semana|quais contas vencem nessa semana|vencem esta semana|vencem nessa semana)\b/.test(normalized)) {
    return { intentType: 'query', intent: 'consultar_contas_vencem_semana', queryType: 'vencimentos_semana' }
  }

  if (/\b(quanto tenho na|saldo da|saldo do)\b/.test(normalized) && normalized.includes('conta')) {
    return { intentType: 'query', intent: 'consultar_saldo_conta', queryType: 'saldo_conta' }
  }

  if (/\b(qual meu saldo|qual o meu saldo|consultar saldo|ver saldo|saldo)\b/.test(normalized)) {
    return { intentType: 'query', intent: 'consultar_saldo', queryType: 'saldo_geral' }
  }

  if (/\b(registrar recebimento|recebimento|recebi|receber)\b/.test(normalized)) {
    return { intentType: 'register', intent: 'registrar_recebimento', natureza: 'receita', acaoFinanceira: 'recebimento' }
  }

  if (/\b(registrar pagamento|pagamento|paguei|pagar)\b/.test(normalized)) {
    return { intentType: 'register', intent: 'registrar_pagamento', natureza: 'despesa', acaoFinanceira: 'pagamento' }
  }

  if (/\b(registrar receita|lancar receita|lançar receita)\b/.test(normalized)) {
    return { intentType: 'register', intent: 'registrar_receita', natureza: 'receita', acaoFinanceira: 'registro' }
  }

  if (/\b(registrar despesa|lancar despesa|lançar despesa)\b/.test(normalized)) {
    return { intentType: 'register', intent: 'registrar_despesa', natureza: 'despesa', acaoFinanceira: 'registro' }
  }

  if (/(recebi|paguei|receber|pagar|despesa|receita|aluguel|iptu|condominio|condomínio)/.test(normalized)) {
    const natureza = /(recebi|receber|receita|aluguel|entrada)/.test(normalized) ? 'receita' : 'despesa'
    const acaoFinanceira = /(recebi|receber)/.test(normalized)
      ? 'recebimento'
      : /(paguei|pagar|pagamento)/.test(normalized)
        ? 'pagamento'
        : 'registro'
    return { intentType: 'register', intent: natureza === 'receita' ? 'registrar_receita' : 'registrar_despesa', natureza, acaoFinanceira }
  }

  return { intentType: 'unsupported', intent: 'nao_suportado' }
}

function buildMissingFields(parsed) {
  if (parsed.intentType === 'query') {
    if (parsed.queryType === 'saldo_conta' && !parsed.contaId) return ['conta']
    return []
  }

  if (parsed.intentType !== 'register') return []

  const missing = []
  if (!parsed.natureza) missing.push('natureza')
  if (parsed.valor == null || Number.isNaN(Number(parsed.valor)) || Number(parsed.valor) <= 0) missing.push('valor')
  if (!parsed.categoria) missing.push('categoria')
  if (parsed.unidadeAmbigua) missing.push('confirmar_unidade')
  if (parsed.requiresPropertyLink && !parsed.patrimonioId) missing.push('patrimonio')
  return missing
}

function buildHumanMessage(parsed) {
  if (parsed.intentType === 'unsupported') {
    return 'Comando não suportado nesta sprint. Tente registrar receita/despesa/pagamento/recebimento ou fazer uma consulta de saldo/inadimplência.'
  }

  if (parsed.intentType === 'query') {
    if (parsed.queryType === 'saldo_conta' && !parsed.contaId) {
      return 'Não identifiquei a conta. Informe o nome da conta para consultar o saldo.'
    }
    return 'Consulta identificada. Vou responder sem alterar dados.'
  }

  if (parsed.unidadeCatalogoVazio) {
    return 'Não existem unidades cadastradas para vincular este lançamento.'
  }

  if (parsed.unidadeAmbigua) {
    return `Encontrei mais de uma unidade para ${parsed.unidadeQuery || 'o imóvel informado'}. Confirme a unidade correta.`
  }

  if (parsed.unidadeNaoEncontrada) {
    return `Não encontrei ${parsed.unidadeQuery || 'a unidade informada'} nos cadastros.`
  }

  if (parsed.missing.length > 0) {
    return 'Faltam alguns dados obrigatórios para concluir o lançamento.'
  }

  return `Comando interpretado: ${parsed.naturezaLabel} de ${parsed.valorLabel}. Revise e confirme para registrar.`
}

function buildLabels(parsed) {
  return {
    operationLabel: parsed.intentType === 'query' ? 'Consulta' : 'Lançamento financeiro',
    tipoLabel: parsed.natureza ? (parsed.natureza === 'receita' ? 'Receita' : 'Despesa') : 'Não identificado',
    naturezaLabel: parsed.natureza ? (parsed.natureza === 'receita' ? 'receita' : 'despesa') : 'não identificada',
    valorLabel: parsed.valor != null ? toCurrency(parsed.valor) : 'Não identificado',
    dateLabel: parsed.date ? parsed.date.toLocaleDateString('pt-BR') : 'Não identificada',
  }
}

export function refreshParsedEntry(base) {
  const parsed = { ...base }
  parsed.missing = buildMissingFields(parsed)
  const withLabels = { ...parsed, ...buildLabels(parsed) }
  withLabels.humanMessage = buildHumanMessage(withLabels)
  return withLabels
}

export function interpretCommand(text) {
  const originalText = String(text || '').trim()
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (!originalText) {
    return refreshParsedEntry({
      intentType: 'unsupported',
      intent: 'nao_suportado',
      supported: false,
      action: null,
      originalText,
    })
  }

  const detected = detectIntent(originalText)
  const amount = parseAmount(originalText)
  const explicitDate = parseDate(originalText)
  const account = findAccount(originalText)
  const unitResolution = resolveUnitFromCatalog(originalText)
  const patrimonioMatch = findPatrimonio(originalText)
  const vinculos = findContractAndLocatario(originalText)

  const isRegister = detected.intentType === 'register'
  const natureza = isRegister ? detected.natureza : ''

  const inferredCategory = isRegister ? findCategory(originalText, natureza || 'despesa') : { nome: '', subcategoria: '' }
  const subcategoriaResolved = resolveSubcategoria(natureza || 'despesa', inferredCategory.nome, inferredCategory.subcategoria)

  const finalDate = (() => {
    if (!isRegister) return explicitDate
    if (explicitDate) return explicitDate
    if (detected.acaoFinanceira === 'pagamento' || detected.acaoFinanceira === 'recebimento') return now
    return null
  })()

  const status = (() => {
    if (!isRegister) return 'pendente'
    if (detected.acaoFinanceira === 'pagamento' || detected.acaoFinanceira === 'recebimento') return 'pago'
    return 'pendente'
  })()

  const patrimonioFromUnit = unitResolution.patrimonioId ? interpreterDeps.buscarPatrimonioPorId(unitResolution.patrimonioId) : null

  const parsed = {
    supported: detected.intentType !== 'unsupported',
    intentType: detected.intentType,
    intent: detected.intent,
    queryType: detected.queryType || '',
    action: detected.intentType === 'register' ? 'lancamento' : 'consulta',
    acaoFinanceira: detected.acaoFinanceira || '',
    natureza,
    tipo: natureza,
    valor: amount,
    categoria: inferredCategory.nome,
    subcategoria: subcategoriaResolved.label || inferredCategory.subcategoria || '',
    subcategoriaId: subcategoriaResolved.id || '',
    subcategoriaLabel: subcategoriaResolved.label || inferredCategory.subcategoria || '',
    patrimonioId: unitResolution.patrimonioId || patrimonioMatch?.id || '',
    patrimonioLabel: unitResolution.patrimonioLabel || patrimonioFromUnit?.nome || patrimonioMatch?.nome || '',
    unidadeId: unitResolution.unidadeId || '',
    unidadeLabel: unitResolution.unidadeLabel || '',
    unidadeAmbigua: unitResolution.status === 'ambiguous',
    unidadeNaoEncontrada: unitResolution.status === 'not_found',
    unidadeCatalogoVazio: unitResolution.status === 'empty_catalog',
    unidadeCandidates: (unitResolution.matches || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      patrimonioId: item.patrimonioId,
      patrimonioLabel: item.patrimonioLabel || '',
    })),
    unidadeQuery: unitResolution.query || '',
    contaId: account?.id || '',
    contaLabel: account?.nome || '',
    date: finalDate,
    dateIso: toIsoDate(finalDate),
    dataCompetencia: finalDate ? toCompetencia(finalDate) : '',
    dataPagamento: status === 'pago' && finalDate ? toIsoDate(finalDate) : '',
    status,
    descricao: originalText,
    observacoes: '',
    contratoId: vinculos.contratoId,
    contratoLabel: vinculos.contratoLabel,
    locatarioId: vinculos.locatarioId,
    locatarioLabel: vinculos.locatarioLabel,
    originalText,
    requiresPropertyLink: isRegister ? requiresPropertyLink(originalText, inferredCategory.nome, unitResolution, patrimonioMatch) : false,
  }

  return refreshParsedEntry(parsed)
}
