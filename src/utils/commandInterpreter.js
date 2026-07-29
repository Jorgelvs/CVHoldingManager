import { listarPatrimonios } from '../modules/patrimonios/services/patrimonioService.js'
import { listarUnidades } from '../modules/unidades/services/unidadeService.js'
import { listarContas } from '../modules/financeiro/services/contaService.js'

function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function toCurrency(value) {
  if (!value && value !== 0) return ''
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseAmount(text) {
  if (!text) return null
  const normalized = normalize(text)
  const amountRegex = /(?:r\$|reais?|rs)\s*([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{1,2})?|[0-9]+(?:[\.,][0-9]{1,2})?)(?:\s*(mil|m))?/i
  const match = normalized.match(amountRegex)
  if (!match) return null
  let value = match[1].replace(/\./g, '').replace(/,/g, '.')
  let amount = Number(value)
  if (Number.isNaN(amount)) return null
  if (match[2]) {
    amount *= 1000
  }
  return amount
}

function parseDate(text) {
  if (!text) return null
  const now = new Date()
  const normalized = normalize(text)
  if (normalized.includes('ontem')) {
    const date = new Date(now)
    date.setDate(now.getDate() - 1)
    return date
  }
  if (normalized.includes('hoje')) {
    return now
  }
  const dayMatch = normalized.match(/(?:dia|no dia|d[oia])\s*(\d{1,2})/)
  if (dayMatch) {
    const day = Number(dayMatch[1])
    const date = new Date(now)
    date.setDate(day)
    return date
  }
  return now
}

function extractName(text) {
  const normalized = normalize(text)
  const nameMatch = normalized.match(/(?:do|da|de)\s+([a-zçãõáâéêíóôúü]+(?:\s+[a-zçãõáâéêíóôúü]+){0,2})/i)
  if (!nameMatch) return ''
  const name = nameMatch[1].trim()
  if (['aluguel', 'casa', 'kitnet', 'conta', 'reserva', 'manutencao', 'manutencao', 'caucao', 'valor'].includes(name)) {
    return ''
  }
  return name.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function findAccount(text) {
  const normalized = normalize(text)
  const accounts = listarContas()
  const found = accounts.find((conta) => {
    const name = normalize(conta.nome)
    return name && normalized.includes(name)
  })
  if (found) return found
  return accounts.find((conta) => {
    const name = normalize(conta.nome)
    return (name.includes('conta') && normalized.includes('conta')) || (name.includes('caixa') && normalized.includes('caixa'))
  }) || null
}

function extractUnitReference(text) {
  const normalized = normalize(text)
  const match = normalized.match(/\b(casa|kitnet|loja|unidade|imovel|apto?)\s*0*([0-9]+)\b/)
  if (!match) return null
  return {
    type: match[1],
    number: match[2],
  }
}

function findUnit(text) {
  const normalized = normalize(text)
  const units = listarUnidades()
  const unit = units.find((item) => {
    const name = normalize(item.nome || '')
    const code = normalize(item.codigoInterno || '')
    return (name && normalized.includes(name)) || (code && normalized.includes(code))
  })

  if (unit) return unit

  const unitReference = extractUnitReference(text)
  if (!unitReference) return null

  return units.find((item) => {
    const name = normalize(item.nome || '')
    return name && name.includes(unitReference.type) && name.includes(unitReference.number)
  }) || null
}

function findPatrimonio(text) {
  const normalized = normalize(text)
  const patrimonios = listarPatrimonios()
  const patrimonio = patrimonios.find((item) => {
    const name = normalize(item.nome || '')
    const code = normalize(item.codigo || '')
    return (name && normalized.includes(name)) || (code && normalized.includes(code))
  })
  return patrimonio || null
}

function findCategory(text, tipo) {
  const normalized = normalize(text)
  const categorias = {
    receita: [
      { nome: 'Aluguel', keywords: ['aluguel'] },
      { nome: 'Condomínio', keywords: ['condomínio', 'condominio'] },
      { nome: 'Multa', keywords: ['multa'] },
      { nome: 'Juros', keywords: ['juros'] },
      { nome: 'Outras receitas', keywords: ['recebi', 'recebimento', 'entrada'] },
    ],
    despesa: [
      { nome: 'Água', keywords: ['água', 'agua'] },
      { nome: 'Energia', keywords: ['energia'] },
      { nome: 'Faxina', keywords: ['faxina', 'limpeza'] },
      { nome: 'Manutenção', keywords: ['manutenção', 'manutencao', 'reparo', 'reparos', 'conserto', 'pintura', 'elétrica', 'eletrica', 'jardinagem', 'dedetização', 'dedetizacao', 'hidráulica', 'hidraulica'] },
      { nome: 'IPTU', keywords: ['iptu'] },
      { nome: 'Comissão imobiliária', keywords: ['comissão', 'comissao', 'imobiliária', 'imobiliaria'] },
      { nome: 'Seguro', keywords: ['seguro'] },
      { nome: 'Outras despesas', keywords: ['despesa', 'pagamento', 'pago', 'paga', 'taxa'] },
    ],
  }[tipo] || []

  const category = categorias.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)))
  if (!category) return { nome: '', subcategoria: null }

  let subcategoria = null
  if (category.nome === 'Manutenção') {
    const subKeywords = [
      { nome: 'Hidráulica', keywords: ['hidráulica', 'hidraulica'] },
      { nome: 'Pintura', keywords: ['pintura'] },
      { nome: 'Elétrica', keywords: ['elétrica', 'eletrica'] },
      { nome: 'Jardinagem', keywords: ['jardinagem'] },
      { nome: 'Dedetização', keywords: ['dedetização', 'dedetizacao'] },
      { nome: 'Reparos gerais', keywords: ['reparo', 'reparos', 'conserto'] },
      { nome: 'Outros', keywords: ['outro', 'reserva', 'manutenção', 'manutencao'] },
    ]
    const found = subKeywords.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)))
    subcategoria = found?.nome || null
  }

  return { nome: category.nome, subcategoria }
}

function buildLabels(parsed) {
  return {
    operationLabel: parsed.action === 'aporte' ? 'Aporte' : parsed.action === 'transferencia' ? 'Transferência' : parsed.action === 'caucao' ? 'Caução' : 'Lançamento',
    tipoLabel: parsed.tipo === 'receita' ? 'Receita' : parsed.tipo === 'despesa' ? 'Despesa' : parsed.tipo === 'despesa' && parsed.action === 'retirada' ? 'Retirada' : 'Despesa',
    categoriaLabel: parsed.categoria || '',
    unidadeLabel: parsed.unidadeLabel || '',
    patrimonioLabel: parsed.patrimonioLabel || '',
    contaLabel: parsed.contaLabel || '',
    dateLabel: parsed.date ? parsed.date.toLocaleDateString('pt-BR') : 'Não identificada',
    valorLabel: parsed.valor ? toCurrency(parsed.valor) : 'Não identificado',
  }
}

export function interpretCommand(text) {
  const originalText = (text || '').trim()
  const normalized = normalize(originalText)
  const amount = parseAmount(normalized)
  const dateObject = parseDate(normalized)
  const unit = findUnit(normalized)
  const patrimonio = findPatrimonio(normalized)
  const account = findAccount(normalized)
  const name = extractName(originalText)

  // intent detection using verb keywords
  const intentMap = [
    { intent: 'aporte', keywords: ['aporte', 'coloquei', 'depositei', 'depositei'] },
    { intent: 'transferencia', keywords: ['transfer', 'transferi', 'passei', 'passe', 'pix', 'enviei', 'mandei', 'para a reserva', 'reserva'] },
    { intent: 'caucao', keywords: ['caução', 'caucao'] },
    { intent: 'retirada', keywords: ['retirada', 'tirei', 'saiu', 'retirei'] },
    { intent: 'lancamento', keywords: ['paguei', 'paguei o', 'paguei a', 'recebi', 'recebeu', 'entrou', 'aluguel', 'iptu', 'condominio', 'condomínio', 'pagamento', 'pago', 'paga', 'pague'] },
  ]

  let action = 'lancamento'
  for (const rule of intentMap) {
    if (rule.keywords.some((k) => normalized.includes(k))) {
      action = rule.intent === 'lancamento' && (normalized.includes('recebi') || normalized.includes('entrou') || normalized.includes('aluguel') || normalized.includes('condomínio') || normalized.includes('condominio')) ? 'lancamento' : rule.intent
      break
    }
  }

  // normalize some special cases
  if (normalized.includes('recebi') || normalized.includes('entrou') || normalized.includes('entrada')) action = 'lancamento'
  if (normalized.includes('retirada') || normalized.includes('tirei')) action = 'retirada'

  // determine type for lancamento (receita/despesa)
  let tipo = 'despesa'
  if (action === 'lancamento') {
    if (normalized.includes('recebi') || normalized.includes('recebimento') || normalized.includes('entrou') || normalized.includes('aluguel') || normalized.includes('entrada')) {
      tipo = 'receita'
    } else if (normalized.includes('retirada') || normalized.includes('tirei')) {
      tipo = 'despesa'
    } else if (normalized.includes('despesa') || normalized.includes('pago') || normalized.includes('paga') || normalized.includes('pagamento') || normalized.includes('paguei')) {
      tipo = 'despesa'
    }
  }

  const category = action === 'lancamento' ? findCategory(normalized, tipo) : { nome: '', subcategoria: null }
  const status = normalized.includes('pago') || normalized.includes('paga') ? 'pago' : 'pendente'
  const patrimonioId = unit?.patrimonioId || (patrimonio?.id || null)
  const unidadeId = unit?.id || null
  const patrimonioLabel = unit ? `${unit.nome}` : patrimonio ? `${patrimonio.nome}` : ''
  const unidadeLabel = unit ? unit.nome : ''
  const contaLabel = account ? account.nome : ''
  const descricao = originalText
  const observacoes = name ? `Sócio: ${name}` : ''

  let parsed = {
    action,
    intent: action,
    supported: ['lancamento', 'transferencia', 'aporte', 'caucao', 'retirada'].includes(action),
    tipo,
    valor: amount,
    date: dateObject,
    dataCompetencia: dateObject ? `${dateObject.getFullYear()}-${String(dateObject.getMonth() + 1).padStart(2, '0')}` : '',
    dataPagamento: status === 'pago' && dateObject ? `${dateObject.getFullYear()}-${String(dateObject.getMonth() + 1).padStart(2, '0')}-${String(dateObject.getDate()).padStart(2, '0')}` : '',
    categoria: category.nome,
    subcategoria: category.subcategoria,
    patrimonioId,
    unidadeId,
    patrimonioLabel,
    unidadeLabel,
    contaId: account?.id || '',
    contaLabel: account?.nome || '',
    descricao,
    observacoes,
    originalText,
    status,
  }

  const missing = []
  if (!parsed.valor) missing.push('valor')
  if (!parsed.date) missing.push('data')
  if (action === 'lancamento') {
    if (!parsed.categoria) missing.push('categoria')
    if (!parsed.patrimonioId && !parsed.unidadeId) missing.push('patrimonio')
  }
  if (action === 'aporte') {
    if (!parsed.valor) missing.push('valor')
  }
  if (action === 'transferencia') {
    if (!parsed.valor) missing.push('valor')
  }
  if (action === 'caucao') {
    if (!parsed.valor) missing.push('valor')
  }

  parsed.missing = missing
  parsed = { ...parsed, ...buildLabels(parsed) }

  // human-friendly message
  if (!parsed.supported) {
    parsed.humanMessage = 'Esta operação será suportada em breve.'
  } else if (parsed.missing.length > 0) {
    parsed.humanMessage = 'Quase lá — faltam algumas informações.'
  } else {
    if (parsed.action === 'aporte') parsed.humanMessage = `O sistema entendeu que você deseja registrar um aporte de ${parsed.valorLabel}.`
    else if (parsed.action === 'transferencia') parsed.humanMessage = `O sistema entendeu que você deseja transferir ${parsed.valorLabel}.`
    else if (parsed.action === 'caucao') parsed.humanMessage = `O sistema entendeu que você recebeu uma caução de ${parsed.valorLabel}.`
    else if (parsed.action === 'retirada') parsed.humanMessage = `O sistema entendeu que você realizou uma retirada de ${parsed.valorLabel}.`
    else parsed.humanMessage = `O sistema entendeu que você deseja registrar ${parsed.tipoLabel.toLowerCase()} de ${parsed.valorLabel}${parsed.unidadeLabel ? ' para ' + parsed.unidadeLabel : ''}.`
  }

  return parsed
}
