// APOSENTADO em 06/08/2026 (análise de código completa).
//
// Este script continha uma lista hardcoded de IDs/códigos/nomes
// (patrimonio_rki, patrimonio_rkii, patrimonio_vdo, patrimonio_rb —
// "Residence Kitnet I/II", "Villa D'Oeste", "Recanto da Brasa") que ele
// tratava como "seed padrão" e apagava automaticamente. Esses nomes são
// idênticos ao inventário real da C&V Holding — rodar este script contra
// produção podia apagar patrimônios reais sob a justificativa de "limpeza
// de seed/demo". Essa lista hardcoded também foi removida do código-fonte
// do app (src/modules/patrimonios/services/patrimonioService.js).
//
// Substituto: use `npm run sprint:production:reset`
// (scripts/sprint-production-reset.mjs), que faz um reset completo e seguro
// — backup total antes de apagar, exige login real do owner, exige
// confirmação textual exata, e apaga TODOS os dados de negócio do
// owner+scope sem tentar "adivinhar" o que é teste e o que é real. Como a
// decisão de negócio atual é zerar e recomeçar o cadastro do zero, não há
// mais necessidade de um script de limpeza seletiva.

throw new Error(
  '[sprint-2.4.0-production-cleanup] Script aposentado. Use: npm run sprint:production:reset',
)
