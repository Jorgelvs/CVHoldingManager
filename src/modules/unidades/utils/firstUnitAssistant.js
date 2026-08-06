const CLASSIFICACAO_UNIDADE_UNICA = new Set([
  'Apartamento',
  'Casa individual',
  'Loja comercial',
  'Sala comercial',
  'Galpão',
  'Espaço de eventos',
  'Terreno',
  'Imóvel individual',
])

const CLASSIFICACAO_MULTIPLAS_UNIDADES = new Set([
  'Condomínio de Kitnets',
  'Condomínio de Casas',
  'Casas independentes',
  'Edifício residencial',
])

function normalizarTexto(valor) {
  return String(valor || '').trim().toLowerCase()
}

function toQuantidadeNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  const numero = Number(valor)
  return Number.isNaN(numero) ? null : numero
}

function sugerirTipoResidencial(patrimonio) {
  const base = `${patrimonio?.nome || ''} ${patrimonio?.tipo || ''}`.toLowerCase()
  if (base.includes('casa')) return 'Casa'
  if (base.includes('apart')) return 'Apartamento'
  return 'Apartamento'
}

export function isSingleUnitAssistantEligible(patrimonio) {
  if (!patrimonio) return false

  const classificacao = String(patrimonio.tipo || '').trim()
  if (CLASSIFICACAO_MULTIPLAS_UNIDADES.has(classificacao)) {
    return false
  }

  const quantidade = toQuantidadeNumero(patrimonio.quantidadeUnidades)
  if (classificacao === 'Outro') {
    return quantidade === 1
  }

  if (CLASSIFICACAO_UNIDADE_UNICA.has(classificacao)) {
    return quantidade === null || quantidade <= 1
  }

  return false
}

export function buildFirstUnitSuggestion(patrimonio) {
  const classificacao = String(patrimonio?.tipo || '').trim()
  const tipoPatrimonio = String(patrimonio?.grupoPatrimonial || '').trim()
  const nomePatrimonio = String(patrimonio?.nome || '').trim()
  const codigoPatrimonio = String(patrimonio?.codigo || '').trim().toUpperCase()

  let tipoUnidade = ''
  if (classificacao === 'Apartamento') {
    tipoUnidade = 'Apartamento'
  } else if (classificacao === 'Casa individual') {
    tipoUnidade = 'Casa'
  } else if (classificacao === 'Imóvel individual') {
    tipoUnidade = tipoPatrimonio === 'Residencial' ? sugerirTipoResidencial(patrimonio) : 'Outro'
  } else if (classificacao === 'Loja comercial') {
    tipoUnidade = 'Loja'
  } else if (classificacao === 'Sala comercial') {
    tipoUnidade = 'Sala'
  } else if (classificacao === 'Galpão') {
    tipoUnidade = 'Galpão'
  } else if (classificacao === 'Espaço de eventos') {
    tipoUnidade = 'Outro'
  } else if (classificacao === 'Terreno') {
    tipoUnidade = 'Terreno'
  } else if (classificacao === 'Outro' && tipoPatrimonio === 'Residencial') {
    tipoUnidade = sugerirTipoResidencial(patrimonio)
  }

  const finalidadePatrimonio = normalizarTexto(patrimonio?.finalidade)
  let finalidadeUnidade = ''
  if (finalidadePatrimonio === normalizarTexto('Uso Próprio')) {
    finalidadeUnidade = 'Uso Próprio'
  }
  if (finalidadePatrimonio === normalizarTexto('Gerador de Receita')) {
    finalidadeUnidade = 'Locação'
  }

  return {
    patrimonioId: patrimonio?.id || '',
    nome: nomePatrimonio,
    tipo: tipoUnidade,
    codigoInterno: codigoPatrimonio ? `${codigoPatrimonio}-U01` : '',
    finalidade: finalidadeUnidade,
    situacao: patrimonio?.situacao === 'Ativo' ? 'Disponível' : '',
    observacoes: '',
  }
}
