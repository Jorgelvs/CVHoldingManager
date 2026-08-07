// Extraído em 06/08/2026: rateioService.js e condominioService.js tinham a
// mesma implementação copiada duas vezes. Fonte única a partir de agora.

export function competenciaParaDataInicio(competencia) {
  if (!competencia) return null
  const [ano, mes] = competencia.split('-').map(Number)
  return new Date(ano, mes - 1, 1).toISOString().slice(0, 10)
}

export function competenciaParaDataFim(competencia) {
  if (!competencia) return null
  const [ano, mes] = competencia.split('-').map(Number)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return new Date(ano, mes - 1, ultimoDia).toISOString().slice(0, 10)
}
