export function gerarId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `patrimonio_${Math.random().toString(36).slice(2, 11)}`
}

export function formatarData(isoDate) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR')
}

export function formatarMoeda(valor) {
  const numero = Number(valor)
  if (Number.isNaN(numero)) return 'R$ 0,00'
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function gerarCodigoPadrao(nome, existentes = []) {
  const texto = (nome || '').trim()
  if (!texto) return ''
  const partes = texto
    .normalize('NFD')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())

  let codigo = partes.join('').slice(0, 3)
  if (!codigo) {
    codigo = texto.slice(0, 3).toUpperCase()
  }
  codigo = codigo.padEnd(3, 'X')

  const base = codigo
  let sufixo = 1
  while (existentes.some((item) => item.codigo.toUpperCase() === codigo.toUpperCase())) {
    codigo = `${base}${sufixo}`.slice(0, 6)
    sufixo += 1
  }
  return codigo
}

const CLASSIFICACOES_UNIDADE_UNICA = new Set([
  'Apartamento',
  'Casa individual',
  'Loja comercial',
  'Sala comercial',
  'Galpão',
  'Espaço de eventos',
  'Terreno',
  'Imóvel individual',
])

function toNumeroInteiro(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return 0
  return Math.max(0, Math.trunc(numero))
}

export function calcularCapacidadePrevistaPatrimonio(patrimonio) {
  const capacidadeInformada = toNumeroInteiro(patrimonio?.quantidadeUnidades)
  if (capacidadeInformada > 0) return capacidadeInformada

  const classificacao = String(patrimonio?.tipo || '').trim()
  if (CLASSIFICACOES_UNIDADE_UNICA.has(classificacao)) return 1
  return 0
}

export function calcularResumoUnidadesPatrimonio(patrimonio, unidadesVinculadas = []) {
  const cadastradas = Array.isArray(unidadesVinculadas) ? unidadesVinculadas.length : 0
  const ocupadas = unidadesVinculadas.filter((unidade) => unidade?.situacao === 'Ocupada').length
  const emManutencao = unidadesVinculadas.filter((unidade) => unidade?.situacao === 'Em manutenção').length
  const vagas = Math.max(cadastradas - ocupadas, 0)
  const taxaOcupacao = cadastradas > 0 ? Math.round((ocupadas / cadastradas) * 100) : 0

  return {
    totalPrevisto: calcularCapacidadePrevistaPatrimonio(patrimonio),
    cadastradas,
    ocupadas,
    vagas,
    emManutencao,
    taxaOcupacao,
  }
}

export function calcularTaxaOcupacao(patrimonio) {
  const total = patrimonio?.indicadores?.unidadesCadastradas || 0
  const ocupadas = patrimonio?.indicadores?.unidadesOcupadas || 0
  if (total === 0) return 0
  return Math.round((ocupadas / total) * 100)
}

export function enderecoResumo(endereco) {
  if (!endereco) return ''
  const partes = [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado]
    .filter(Boolean)
  return partes.join(', ')
}
