const MAPA_TIPO = {
  Casa: 'C',
  Kitnet: 'K',
  Loja: 'L',
  Unidade: 'U',
  'Unidade genérica': 'U',
  'Unidade Principal': 'U',
  Outro: 'U',
  Apartamento: 'U',
  Sala: 'U',
  'Espaço para Eventos': 'U',
  Terreno: 'U',
  Galpão: 'U',
}

function normalizarTexto(valor) {
  return (valor || '').trim().normalize('NFD').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
}

function extrairNumero(nome) {
  const match = normalizarTexto(nome).match(/(\d+)$/)
  return match ? match[1].padStart(2, '0') : ''
}

function extrairTipoCodigo(tipo) {
  const normalizado = normalizarTexto(tipo)
  if (normalizado in MAPA_TIPO) {
    return MAPA_TIPO[normalizado]
  }
  return ''
}

export function gerarCodigoInternoSugestao({ codigoPatrimonio = '', tipo = '', nome = '' }) {
  const codigoPatrimonioLimpo = (codigoPatrimonio || '').trim().toUpperCase()
  const tipoCodigo = extrairTipoCodigo(tipo)
  const numero = extrairNumero(nome)

  if (!codigoPatrimonioLimpo || !tipoCodigo || !numero) {
    return ''
  }

  return `${codigoPatrimonioLimpo}-${tipoCodigo}${numero}`
}
